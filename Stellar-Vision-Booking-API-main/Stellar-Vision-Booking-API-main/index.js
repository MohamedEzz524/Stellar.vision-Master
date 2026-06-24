const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const https = require("https");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { google } = require("googleapis");
const { DateTime } = require("luxon");
const { JWT } = require("google-auth-library");
require("dotenv").config();

const app = express();

// ===============================
// CONFIG test
// ===============================
const PORT = process.env.PORT || 5000;
const CALENDAR_ID = process.env.CALENDAR_ID;

// BUSINESS RULES — fixed constants
const MEETING_DURATION = 30;
const MIN_BOOKING_HOURS = 4; // Users cannot book a slot within this many hours of now (same-day allowed if >= 4h ahead)
const BUFFER_MINUTES = 15; // Not used: "slot before/after becomes unavailable" rule is commented out
const BUSINESS_ZONE = "Africa/Cairo";

// Default seeds for first run. After first boot, these are persisted to
// data/business_rules.json and edited at runtime via the admin dashboard.
// Use the get*() helpers below for lookups — they read the runtime store.
const DEFAULT_BUSINESS_RULES = {
  enableActiveWeekWeekend: process.env.ENABLE_ACTIVE_WEEK_WEEKEND === "true",
  enableNextWeek: process.env.ENABLE_NEXT_WEEK === "true",
  closedWeekdays: [5, 6], // Luxon weekday: Mon=1…Sun=7. Default: Fri/Sat closed.
  workWindows: [
    { startHour: 12, startMinute: 0, endHour: 16, endMinute: 0 }, // 12 PM – 4 PM
    { startHour: 16, startMinute: 30, endHour: 20, endMinute: 0 }, // 4:30 PM – 8 PM
  ],
  activeWeekendWindows: [
    { startHour: 14, startMinute: 0, endHour: 18, endMinute: 0 }, // 2 PM – 6 PM
  ],
};

// One-off blocked dates seed (persisted to data/blocked_dates.json after first boot).
const DEFAULT_BLOCKED_DATES = ["2026-04-14"];

// ===============================
// PERSISTENCE (JSON files in ./data)
// ===============================
// Tiny JSON-file store: stays in-memory after first read, written atomically.
// Good enough for one admin + low write volume. Swap for SQLite if we ever
// need multiple admin accounts or audit logs.
const DATA_DIR = path.join(__dirname, "data");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error("[persistence] Failed to create data dir:", e.message);
  }
}

function readJsonFile(filename, fallback) {
  ensureDataDir();
  const file = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8");
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error(`[persistence] Failed to read ${filename}:`, e.message);
    return fallback;
  }
}

function writeJsonFile(filename, data) {
  ensureDataDir();
  const file = path.join(DATA_DIR, filename);
  const tmp = `${file}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmp, file); // atomic on POSIX; close-enough on Windows
    return true;
  } catch (e) {
    console.error(`[persistence] Failed to write ${filename}:`, e.message);
    return false;
  }
}

// ----- Blocked dates store -----
// Shape on disk:
//   [{ date: "YYYY-MM-DD", reason?: string, addedAt: ISO, addedBy: email }]
let blockedDatesStore = null;

function loadBlockedDates() {
  const onDisk = readJsonFile("blocked_dates.json", null);
  if (Array.isArray(onDisk)) {
    blockedDatesStore = onDisk;
    return;
  }
  // First boot: seed with the hardcoded defaults
  blockedDatesStore = DEFAULT_BLOCKED_DATES.map((d) => ({
    date: d,
    reason: "Seeded default",
    addedAt: new Date().toISOString(),
    addedBy: "system",
  }));
  writeJsonFile("blocked_dates.json", blockedDatesStore);
}

function getBlockedDatesSet() {
  if (!blockedDatesStore) loadBlockedDates();
  return new Set((blockedDatesStore || []).map((entry) => entry.date));
}

function getBlockedDatesList() {
  if (!blockedDatesStore) loadBlockedDates();
  return [...(blockedDatesStore || [])];
}

function addBlockedDate(date, reason, addedBy) {
  if (!blockedDatesStore) loadBlockedDates();
  const exists = blockedDatesStore.find((e) => e.date === date);
  if (exists) return { ok: false, reason: "Date is already blocked" };
  blockedDatesStore.push({
    date,
    reason: reason || "",
    addedAt: new Date().toISOString(),
    addedBy: addedBy || "admin",
  });
  blockedDatesStore.sort((a, b) => a.date.localeCompare(b.date));
  writeJsonFile("blocked_dates.json", blockedDatesStore);
  return { ok: true };
}

function removeBlockedDate(date) {
  if (!blockedDatesStore) loadBlockedDates();
  const before = blockedDatesStore.length;
  blockedDatesStore = blockedDatesStore.filter((e) => e.date !== date);
  if (blockedDatesStore.length === before) {
    return { ok: false, reason: "Date is not blocked" };
  }
  writeJsonFile("blocked_dates.json", blockedDatesStore);
  return { ok: true };
}

// ----- Business rules store -----
// Shape on disk: same as DEFAULT_BUSINESS_RULES.
let businessRulesStore = null;

function isValidWindow(w) {
  return (
    w &&
    Number.isInteger(w.startHour) &&
    Number.isInteger(w.startMinute) &&
    Number.isInteger(w.endHour) &&
    Number.isInteger(w.endMinute) &&
    w.startHour >= 0 &&
    w.startHour <= 23 &&
    w.endHour >= 0 &&
    w.endHour <= 24 &&
    w.startMinute >= 0 &&
    w.startMinute <= 59 &&
    w.endMinute >= 0 &&
    w.endMinute <= 59 &&
    (w.endHour > w.startHour ||
      (w.endHour === w.startHour && w.endMinute > w.startMinute))
  );
}

function sanitizeBusinessRules(input) {
  const out = { ...DEFAULT_BUSINESS_RULES, ...(input || {}) };
  out.enableActiveWeekWeekend = !!out.enableActiveWeekWeekend;
  out.enableNextWeek = !!out.enableNextWeek;
  if (!Array.isArray(out.closedWeekdays)) {
    out.closedWeekdays = DEFAULT_BUSINESS_RULES.closedWeekdays;
  } else {
    out.closedWeekdays = out.closedWeekdays
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7)
      .filter((n, i, a) => a.indexOf(n) === i);
  }
  if (!Array.isArray(out.workWindows) || !out.workWindows.every(isValidWindow)) {
    out.workWindows = DEFAULT_BUSINESS_RULES.workWindows;
  }
  if (
    !Array.isArray(out.activeWeekendWindows) ||
    !out.activeWeekendWindows.every(isValidWindow)
  ) {
    out.activeWeekendWindows = DEFAULT_BUSINESS_RULES.activeWeekendWindows;
  }
  return out;
}

function loadBusinessRules() {
  const onDisk = readJsonFile("business_rules.json", null);
  if (onDisk && typeof onDisk === "object") {
    businessRulesStore = sanitizeBusinessRules(onDisk);
  } else {
    businessRulesStore = sanitizeBusinessRules(DEFAULT_BUSINESS_RULES);
    writeJsonFile("business_rules.json", businessRulesStore);
  }
}

function getBusinessRules() {
  if (!businessRulesStore) loadBusinessRules();
  return businessRulesStore;
}

function saveBusinessRules(updates) {
  if (!businessRulesStore) loadBusinessRules();
  const next = sanitizeBusinessRules({ ...businessRulesStore, ...updates });
  businessRulesStore = next;
  writeJsonFile("business_rules.json", next);
  return next;
}

// Hydrate on boot
loadBlockedDates();
loadBusinessRules();

// ===============================
// ADMIN AUTH CONFIG
// ===============================
// Generate the password hash with:  node hash-password.js <yourPassword>
// Then set ADMIN_EMAIL, ADMIN_PASSWORD_HASH, and ADMIN_JWT_SECRET in .env
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || "dev-only-change-me-in-production";
const ADMIN_TOKEN_TTL = process.env.ADMIN_TOKEN_TTL || "8h";

if (process.env.NODE_ENV === "production") {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
    console.warn(
      "[admin] WARNING: ADMIN_EMAIL or ADMIN_PASSWORD_HASH is not set — /api/admin/* routes will reject all logins."
    );
  }
  if (ADMIN_JWT_SECRET === "dev-only-change-me-in-production") {
    console.warn(
      "[admin] WARNING: ADMIN_JWT_SECRET is using the dev default. Set a long random value in production."
    );
  }
}

// ===============================
// SECURITY
// ===============================
app.use(helmet());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }),
);

app.use(bodyParser.json({ limit: "50kb" }));

// CORS (FORGIVING)
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// ===============================
// ADMIN AUTH (JWT)
// ===============================

// Tighter rate limit on login specifically: 10 attempts / 10 minutes / IP.
const adminLoginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

/** Sign an admin JWT. Payload is intentionally minimal. */
function signAdminToken() {
  return jwt.sign(
    { sub: ADMIN_EMAIL, role: "admin" },
    ADMIN_JWT_SECRET,
    { expiresIn: ADMIN_TOKEN_TTL }
  );
}

/**
 * Middleware: requires a valid `Authorization: Bearer <jwt>` header signed
 * with ADMIN_JWT_SECRET and role==='admin'. Attaches `req.admin` on success.
 */
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const token = header.slice(7).trim();
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.admin = decoded;
    return next();
  } catch (err) {
    if (err && err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
}

// POST /api/admin/login → { token, email }
app.post("/api/admin/login", adminLoginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
    return res.status(503).json({ error: "Admin account is not configured" });
  }

  const emailMatches =
    email.toLowerCase().trim() === ADMIN_EMAIL;

  // Always run bcrypt to keep response time roughly equal regardless of
  // whether the email matched — small timing-attack mitigation.
  let passwordMatches = false;
  try {
    passwordMatches = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  } catch {
    passwordMatches = false;
  }

  if (!emailMatches || !passwordMatches) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signAdminToken();
  return res.json({ token, email: ADMIN_EMAIL, ttl: ADMIN_TOKEN_TTL });
});

// GET /api/admin/verify → { ok: true, email } when the token is still valid.
// The frontend uses this to check its stored token on app boot.
app.get("/api/admin/verify", requireAdmin, (req, res) => {
  return res.json({ ok: true, email: req.admin.sub });
});

// ===============================
// GOOGLE AUTH
// ===============================
const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ],
});

function getCalendarClient() {
  return google.calendar({ version: "v3", auth });
}

// ===============================
// HELPERS
// ===============================
function safeISO(value, zone) {
  if (!value) return null;
  const dt = DateTime.fromISO(value, { zone });
  return dt.isValid ? dt : null;
}

/**
 * Busy interval for a Google Calendar event in the viewer's zone.
 * Respects event start/end `timeZone` when `dateTime` has no offset (Calendar API behavior).
 * All-day events use `date` / `end.date` (end exclusive per Google).
 */
function eventBusyIntervalInZone(event, userZone) {
  if (!event || event.status === "cancelled") return null;
  const s = event.start;
  const en = event.end;
  if (!s || !en) return null;

  if (s.dateTime && en.dateTime) {
    const startDt = s.timeZone
      ? DateTime.fromISO(s.dateTime, { zone: s.timeZone })
      : DateTime.fromISO(s.dateTime, { setZone: true });
    const endDt = en.timeZone
      ? DateTime.fromISO(en.dateTime, { zone: en.timeZone })
      : DateTime.fromISO(en.dateTime, { setZone: true });
    if (!startDt.isValid || !endDt.isValid) return null;
    return {
      start: startDt.setZone(userZone),
      end: endDt.setZone(userZone),
    };
  }

  if (s.date && en.date) {
    const startDay = DateTime.fromISO(s.date, { zone: userZone }).startOf("day");
    const endExclusive = DateTime.fromISO(en.date, { zone: userZone }).startOf("day");
    if (!startDay.isValid || !endExclusive.isValid) return null;
    return { start: startDay, end: endExclusive };
  }

  return null;
}
function bookingWindow(timezone) {
  const now = DateTime.now().setZone(timezone);
  const rules = getBusinessRules();
  const { activeWeekStart, activeWeekEnd } = getWeekBoundariesInBusinessZone();
  const maxInBusinessZone = rules.enableNextWeek
    ? activeWeekEnd.plus({ weeks: 1 }).endOf("day")
    : activeWeekEnd.endOf("day");
  return {
    min: now.plus({ hours: MIN_BOOKING_HOURS }), // earliest bookable moment (same-day allowed if >= 4h ahead)
    max: maxInBusinessZone.setZone(timezone),
  };
}

/** Calendar date from `date` (user-facing) interpreted in BUSINESS_ZONE; used for weekday + hours. */
function businessDateInCairo(date) {
  return DateTime.fromObject(
    { year: date.year, month: date.month, day: date.day },
    { zone: BUSINESS_ZONE },
  );
}

function isBlockedBusinessDate(date) {
  return getBlockedDatesSet().has(businessDateInCairo(date).toISODate());
}

function getWeekBoundariesInBusinessZone() {
  const nowInBusinessZone = DateTime.now().setZone(BUSINESS_ZONE);
  // Luxon weekday: Monday=1 ... Sunday=7. Convert to Sunday-start week.
  const daysSinceSunday = nowInBusinessZone.weekday % 7;
  const weekStart = nowInBusinessZone
    .startOf("day")
    .minus({ days: daysSinceSunday });
  return {
    activeWeekStart: weekStart.startOf("day"),
    activeWeekEnd: weekStart.plus({ days: 6 }).endOf("day"),
  };
}

function getBusinessDayRules(date) {
  const rules = getBusinessRules();
  const closedWeekdaysSet = new Set(rules.closedWeekdays);
  const businessDay = businessDateInCairo(date);
  const { activeWeekStart, activeWeekEnd } = getWeekBoundariesInBusinessZone();
  const nextWeekStart = activeWeekStart.plus({ weeks: 1 });
  const nextWeekEnd = activeWeekEnd.plus({ weeks: 1 });

  const isInActiveWeek = businessDay >= activeWeekStart && businessDay <= activeWeekEnd;
  const isInNextWeek = businessDay >= nextWeekStart && businessDay <= nextWeekEnd;
  const isInAllowedWeek = isInActiveWeek || (rules.enableNextWeek && isInNextWeek);

  if (!isInAllowedWeek) {
    return { isClosed: true, windows: [], businessDay };
  }

  const isWeekend = closedWeekdaysSet.has(businessDay.weekday);
  if (isWeekend) {
    if (rules.enableActiveWeekWeekend && isInActiveWeek) {
      return {
        isClosed: false,
        windows: rules.activeWeekendWindows,
        businessDay,
      };
    }
    return { isClosed: true, windows: [], businessDay };
  }

  return { isClosed: false, windows: rules.workWindows, businessDay };
}

function businessSlotsForDay(date, userZone) {
  if (isBlockedBusinessDate(date)) return [];
  const rules = getBusinessDayRules(date);
  if (rules.isClosed) return [];
  const businessDay = rules.businessDay;

  const slots = [];
  for (const w of rules.windows) {
    const start = businessDay.set({
      hour: w.startHour,
      minute: w.startMinute,
      second: 0,
      millisecond: 0,
    });
    const end = businessDay.set({
      hour: w.endHour,
      minute: w.endMinute,
      second: 0,
      millisecond: 0,
    });
    for (let t = start; t < end; t = t.plus({ minutes: MEETING_DURATION })) {
      slots.push({
        start: t.setZone(userZone),
        end: t.plus({ minutes: MEETING_DURATION }).setZone(userZone),
        status: "available",
      });
    }
  }
  return slots;
}

// ===============================
// META CONVERSION API
// ===============================
const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const META_PIXEL_SOURCE_URL = process.env.META_PIXEL_SOURCE_URL || "https://steller.vision";
const META_TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE; // e.g. TEST31868 - events show in Test events tab

function sha256(str) {
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

/**
 * Sends a "Schedule" (meeting booked) event to Meta Conversion API
 * Fire-and-forget: does not block the response or fail the request on Meta errors.
 * @param {string} eventId - Unique event id (e.g. calendar event id) for deduplication
 * @param {string} email - Booker email (will be hashed for user_data.em)
 * @param {string} [eventSourceUrl] - Page URL where booking happened
 * @param {{ fbp?: string, fbc?: string }} [metaCookies] - Meta Pixel cookies from frontend for better attribution
 */
function sendMetaBookingConversion(eventId, email, eventSourceUrl, metaCookies = {}) {
  if (!META_PIXEL_ID || !META_CAPI_ACCESS_TOKEN) {
    console.log("[Meta CAPI] Skipped – META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not set");
    return;
  }
  console.log("[Meta CAPI] Sending Schedule event, eventId:", eventId);

  const url = `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(META_CAPI_ACCESS_TOKEN)}`;
  const eventTime = Math.floor(Date.now() / 1000);
  const sourceUrl = eventSourceUrl || META_PIXEL_SOURCE_URL;

  const userData = {
    em: email ? sha256(email.toLowerCase().trim()) : undefined,
    fbp: metaCookies.fbp || undefined,
    fbc: metaCookies.fbc || undefined,
  };
  if (userData.em === undefined) delete userData.em;
  if (userData.fbp === undefined) delete userData.fbp;
  if (userData.fbc === undefined) delete userData.fbc;

  const payload = {
    data: [
      {
        event_name: "Schedule",
        event_time: eventTime,
        event_id: eventId,
        action_source: "website",
        event_source_url: sourceUrl,
        user_data: userData,
        custom_data: {
          content_name: "Meeting Booking",
        },
      },
    ],
  };
  if (META_TEST_EVENT_CODE) payload.test_event_code = META_TEST_EVENT_CODE;

  const body = JSON.stringify(payload);
  const parsed = new URL(url);
  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body, "utf8"),
    },
  };
  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => {
      try {
        const json = data ? JSON.parse(data) : {};
        if (res.statusCode === 200) {
          console.log("[Meta CAPI] OK – events_received:", json.events_received, "fbtrace_id:", json.fbtrace_id);
          if (META_TEST_EVENT_CODE) console.log("[Meta CAPI] Test event – check Events Manager > Test events");
        } else {
          console.error("[Meta CAPI] Error", res.statusCode, json.error?.message || data);
          if (json.error?.error_user_msg) console.error("[Meta CAPI] User message:", json.error.error_user_msg);
        }
      } catch (e) {
        console.error("[Meta CAPI] Non-200:", res.statusCode, data);
      }
    });
  });
  req.on("error", (err) => console.error("[Meta CAPI] Request error:", err.message));
  req.write(body);
  req.end();
}

// ===============================
// ROUTES
// ===============================
app.get("/health", (req, res) => res.json({ ok: true }));

// TIMEZONES
app.get("/api/timezones", (req, res) => {
  res.json([
    "UTC",
    "Africa/Cairo",
    "Asia/Riyadh",
    "Asia/Dubai",
    "Europe/London",
    "America/New_York",
  ]);
});
// GET available days in a year
app.get("/api/availability/year", async (req, res) => {
  const year = Number(req.query.year);
  const timezone = req.query.timezone || "UTC";

  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    return res.status(400).json({ error: "Invalid year" });
  }

  try {
    const window = bookingWindow(timezone);
    const minBookDate = window.min.startOf("day"); // first day that can have a valid slot
    const maxBookDate = window.max;

    const availableDaysByMonth = [];

    for (let month = 1; month <= 12; month++) {
      const monthDate = DateTime.fromObject(
        { year, month },
        { zone: timezone },
      );
      const daysInMonth = monthDate.daysInMonth;
      const monthName = monthDate.toFormat("MMM");

      const availableDays = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const baseDate = DateTime.fromObject(
          { year, month, day },
          { zone: timezone },
        ).startOf("day");

        if (baseDate < minBookDate || baseDate > maxBookDate) continue;
        if (getBusinessDayRules(baseDate).isClosed) continue;
        if (isBlockedBusinessDate(baseDate)) continue;
        availableDays.push(day);
      }

      availableDaysByMonth.push({
        year,
        month: monthName,
        availableDays,
      });
    }

    res.json(availableDaysByMonth);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching availability for year" });
  }
});

// DAY SLOTS
app.get("/api/availability/day", async (req, res) => {
  const { date, timezone = "UTC" } = req.query;
  const day = safeISO(date, timezone)?.startOf("day");
  if (!day) return res.status(400).json({ error: "Invalid date" });

  const window = bookingWindow(timezone);
  const minBookDate = window.min.startOf("day");
  if (day < minBookDate || day > window.max)
    return res.status(400).json({ error: "Date not available for booking" });
  if (getBusinessDayRules(day).isClosed)
    return res.status(400).json({ error: "Date not available for booking" });
  if (isBlockedBusinessDate(day))
    return res.status(400).json({ error: "Date not available for booking" });

  const calendar = getCalendarClient();
  const events = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: day.startOf("day").toUTC().toISO(),
    timeMax: day.endOf("day").toUTC().toISO(),
    singleEvents: true,
  });

  const booked = (events.data.items || [])
    .map((e) => eventBusyIntervalInZone(e, timezone))
    .filter(Boolean);

  let slots = businessSlotsForDay(day, timezone);

  // Rule commented out: slot before/after a taken slot no longer becomes unavailable (buffer disabled)
  slots = slots.map((slot) => {
    for (let b of booked) {
      // Strict overlap only: only the exact booked time is unavailable (no buffer)
      // if (slot.start < b.end.plus({ minutes: BUFFER_MINUTES }) && slot.end > b.start.minus({ minutes: BUFFER_MINUTES })) {
      if (slot.start < b.end && slot.end > b.start) {
        return { ...slot, status: "unavailable" };
      }
    }
    return slot;
  });

  // Slots before "now + 4 hours" are not bookable (same-day allowed but at least 4h ahead)
  slots = slots.map((slot) => {
    if (slot.start < window.min) return { ...slot, status: "unavailable" };
    return slot;
  });

  // Clients should render only `slots` (start_time/end_time); do not invent a local 15‑minute grid.
  res.json({
    date,
    timezone,
    meeting_duration_minutes: MEETING_DURATION,
    business_timezone: BUSINESS_ZONE,
    min_booking_hours_ahead: MIN_BOOKING_HOURS,
    slots: slots.map((s) => ({
      start_time: s.start.toISO(),
      end_time: s.end.toISO(),
      status: s.status,
    })),
  });
});

// CREATE BOOKING
app.post("/api/bookings/create", async (req, res) => {
  try {
    const {
      name,
      email,
      slot_start_time,
      timezone = "UTC",
      description,
    } = req.body;

    if (!name || !email || !slot_start_time)
      return res.status(400).json({ error: "Missing fields" });

    const slotStart = safeISO(slot_start_time, timezone);
    if (!slotStart) return res.status(400).json({ error: "Invalid slot time" });

    const window = bookingWindow(timezone);
    if (slotStart < window.min || slotStart > window.max)
      return res.status(400).json({ error: "Outside booking window" });

    const end = slotStart.plus({ minutes: MEETING_DURATION });
    const dayStart = slotStart.startOf("day");
    const slotIsOnGrid = businessSlotsForDay(dayStart, timezone).some(
      (s) => s.start.equals(slotStart) && s.end.equals(end),
    );
    if (!slotIsOnGrid)
      return res.status(400).json({ error: "Invalid slot time" });

    const calendar = getCalendarClient();

    const events = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: slotStart.startOf("day").toUTC().toISO(),
      timeMax: slotStart.endOf("day").toUTC().toISO(),
      singleEvents: true,
    });

    // Rule commented out: slot before/after a taken slot no longer blocked (buffer disabled)
    for (let e of events.data.items || []) {
      const busy = eventBusyIntervalInZone(e, timezone);
      if (!busy) continue;
      const { start: s, end: en } = busy;
      // Strict overlap only: only the exact booked time is blocked (no buffer)
      // if (slotStart < en.plus({ minutes: BUFFER_MINUTES }) && end > s.minus({ minutes: BUFFER_MINUTES })) {
      if (slotStart < en && end > s) {
        return res.status(400).json({ error: "Slot unavailable" });
      }
    }

    // Prepend a "Booked by: <name> <email>" header so the customer's email
    // survives on the calendar event. The admin dashboard parses this line to
    // surface the customer in the bookings list; without it the email is only
    // visible to the Meta CAPI pipeline.
    const bookedByLine = `Booked by: ${String(name).trim()} <${String(email).trim()}>`;
    const fullDescription = description
      ? `${bookedByLine}\n\n${description}`
      : bookedByLine;

    const event = {
      summary: `Booking: ${name}`,
      description: fullDescription,
      start: { dateTime: slotStart.toISO(), timeZone: timezone },
      end: { dateTime: end.toISO(), timeZone: timezone },
    };

    const created = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: event,
    });

    // Meta Conversion API: track "Schedule" (meeting booked) for ads attribution
    const eventSourceUrl = req.body.event_source_url;
    const metaCookies = {
      fbp: req.body.fbp || req.body._fbp,
      fbc: req.body.fbc || req.body._fbc,
    };
    sendMetaBookingConversion(created.data.id, email, eventSourceUrl, metaCookies);

    res.json({ status: "confirmed", eventId: created.data.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creating booking" });
  }
});

// GET all future bookings
app.get("/api/bookings/available", async (req, res) => {
  try {
    const calendarClient = await getCalendarClient();
    const events = await calendarClient.events.list({
      calendarId: CALENDAR_ID,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });
    res.json(events.data.items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching events" });
  }
});

// ===============================
// ADMIN: BOOKING MANAGEMENT
// ===============================

/** Normalize a Google Calendar event into a shape the admin UI can render. */
function shapeBookingEvent(event) {
  if (!event) return null;
  return {
    id: event.id,
    status: event.status,
    summary: event.summary || "",
    description: event.description || "",
    start: event.start || null,
    end: event.end || null,
    htmlLink: event.htmlLink || null,
    created: event.created || null,
    updated: event.updated || null,
    creator: event.creator || null,
    organizer: event.organizer || null,
    attendees: event.attendees || [],
  };
}

/**
 * GET /api/admin/bookings
 * Query: from (ISO), to (ISO), q (search), limit (default 100, max 250), pageToken
 * Defaults: from = 30 days ago, to = 6 months ahead.
 */
app.get("/api/admin/bookings", requireAdmin, async (req, res) => {
  try {
    const now = DateTime.now();
    const fromRaw = req.query.from;
    const toRaw = req.query.to;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 100, 1),
      250
    );
    const pageToken =
      typeof req.query.pageToken === "string" ? req.query.pageToken : undefined;

    const from =
      typeof fromRaw === "string"
        ? DateTime.fromISO(fromRaw)
        : now.minus({ days: 30 });
    const to =
      typeof toRaw === "string"
        ? DateTime.fromISO(toRaw)
        : now.plus({ months: 6 });
    if (!from.isValid || !to.isValid) {
      return res.status(400).json({ error: "Invalid from/to" });
    }

    const calendar = getCalendarClient();
    const list = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: from.toUTC().toISO(),
      timeMax: to.toUTC().toISO(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: limit,
      pageToken,
      q: q || undefined,
    });

    const items = (list.data.items || [])
      .filter((e) => e.status !== "cancelled")
      .map(shapeBookingEvent);

    return res.json({
      items,
      nextPageToken: list.data.nextPageToken || null,
      from: from.toISO(),
      to: to.toISO(),
    });
  } catch (err) {
    console.error("[admin/bookings] list error:", err);
    return res.status(500).json({ error: "Error fetching bookings" });
  }
});

/** GET /api/admin/bookings/:id — fetch a single booking. */
app.get("/api/admin/bookings/:id", requireAdmin, async (req, res) => {
  try {
    const calendar = getCalendarClient();
    const got = await calendar.events.get({
      calendarId: CALENDAR_ID,
      eventId: req.params.id,
    });
    return res.json(shapeBookingEvent(got.data));
  } catch (err) {
    if (err && err.code === 404) {
      return res.status(404).json({ error: "Booking not found" });
    }
    console.error("[admin/bookings] get error:", err);
    return res.status(500).json({ error: "Error fetching booking" });
  }
});

/**
 * DELETE /api/admin/bookings/:id — cancel/delete a booking from Google Calendar.
 * This is non-reversible; the event is removed from the calendar.
 */
app.delete("/api/admin/bookings/:id", requireAdmin, async (req, res) => {
  try {
    const calendar = getCalendarClient();
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: req.params.id,
    });
    return res.json({ ok: true, id: req.params.id, deleted: true });
  } catch (err) {
    if (err && err.code === 404) {
      return res.status(404).json({ error: "Booking not found" });
    }
    if (err && err.code === 410) {
      // Already deleted on Google's side; treat as success for idempotency.
      return res.json({ ok: true, id: req.params.id, deleted: true });
    }
    console.error("[admin/bookings] delete error:", err);
    return res.status(500).json({ error: "Error cancelling booking" });
  }
});

/**
 * PATCH /api/admin/bookings/:id — reschedule and/or update summary/description.
 * Body: { slot_start_time?, timezone?, summary?, description? }
 * When rescheduling, the new slot is validated against business rules + existing
 * events (no conflict allowed) the same way /api/bookings/create validates.
 */
app.patch("/api/admin/bookings/:id", requireAdmin, async (req, res) => {
  try {
    const { slot_start_time, timezone, summary, description } = req.body || {};
    const calendar = getCalendarClient();

    const current = await calendar.events.get({
      calendarId: CALENDAR_ID,
      eventId: req.params.id,
    });

    const patch = {};
    if (typeof summary === "string") patch.summary = summary;
    if (typeof description === "string") patch.description = description;

    if (slot_start_time) {
      const tz =
        typeof timezone === "string" && timezone.length
          ? timezone
          : current.data.start?.timeZone || "UTC";
      const newStart = safeISO(slot_start_time, tz);
      if (!newStart) {
        return res.status(400).json({ error: "Invalid slot_start_time" });
      }

      const window = bookingWindow(tz);
      if (newStart < window.min || newStart > window.max) {
        return res
          .status(400)
          .json({ error: "New slot is outside the booking window" });
      }

      const newEnd = newStart.plus({ minutes: MEETING_DURATION });
      const dayStart = newStart.startOf("day");
      const onGrid = businessSlotsForDay(dayStart, tz).some(
        (s) => s.start.equals(newStart) && s.end.equals(newEnd)
      );
      if (!onGrid) {
        return res
          .status(400)
          .json({ error: "New slot is not aligned to the business slot grid" });
      }

      // Check for conflicts with other bookings (excluding this event)
      const sameDay = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: newStart.startOf("day").toUTC().toISO(),
        timeMax: newStart.endOf("day").toUTC().toISO(),
        singleEvents: true,
      });
      for (const e of sameDay.data.items || []) {
        if (e.id === req.params.id) continue;
        const busy = eventBusyIntervalInZone(e, tz);
        if (!busy) continue;
        if (newStart < busy.end && newEnd > busy.start) {
          return res.status(409).json({ error: "New slot conflicts with another booking" });
        }
      }

      patch.start = { dateTime: newStart.toISO(), timeZone: tz };
      patch.end = { dateTime: newEnd.toISO(), timeZone: tz };
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const updated = await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId: req.params.id,
      resource: patch,
    });

    return res.json(shapeBookingEvent(updated.data));
  } catch (err) {
    if (err && err.code === 404) {
      return res.status(404).json({ error: "Booking not found" });
    }
    console.error("[admin/bookings] patch error:", err);
    return res.status(500).json({ error: "Error updating booking" });
  }
});

// ===============================
// ADMIN: BLOCKED DATES
// ===============================

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/admin/blocked-dates — list every blocked date. */
app.get("/api/admin/blocked-dates", requireAdmin, (req, res) => {
  return res.json({ items: getBlockedDatesList() });
});

/**
 * POST /api/admin/blocked-dates
 * Body: { date: "YYYY-MM-DD", reason?: string }
 */
app.post("/api/admin/blocked-dates", requireAdmin, (req, res) => {
  const { date, reason } = req.body || {};
  if (typeof date !== "string" || !ISO_DATE_RE.test(date)) {
    return res
      .status(400)
      .json({ error: "Invalid date — use YYYY-MM-DD format" });
  }
  const parsed = DateTime.fromISO(date, { zone: BUSINESS_ZONE });
  if (!parsed.isValid) {
    return res.status(400).json({ error: "Invalid calendar date" });
  }
  const result = addBlockedDate(
    date,
    typeof reason === "string" ? reason : "",
    req.admin?.sub || "admin"
  );
  if (!result.ok) {
    return res.status(409).json({ error: result.reason });
  }
  return res.status(201).json({ ok: true, items: getBlockedDatesList() });
});

/** DELETE /api/admin/blocked-dates/:date — unblock a single date. */
app.delete("/api/admin/blocked-dates/:date", requireAdmin, (req, res) => {
  const { date } = req.params;
  if (!ISO_DATE_RE.test(date)) {
    return res.status(400).json({ error: "Invalid date format" });
  }
  const result = removeBlockedDate(date);
  if (!result.ok) {
    return res.status(404).json({ error: result.reason });
  }
  return res.json({ ok: true, items: getBlockedDatesList() });
});

// ===============================
// ADMIN: BUSINESS RULES (hours, closed weekdays, toggles)
// ===============================

/** GET /api/admin/settings — current business rules + fixed constants. */
app.get("/api/admin/settings", requireAdmin, (req, res) => {
  return res.json({
    rules: getBusinessRules(),
    constants: {
      meetingDuration: MEETING_DURATION,
      minBookingHours: MIN_BOOKING_HOURS,
      businessZone: BUSINESS_ZONE,
    },
  });
});

/**
 * PATCH /api/admin/settings — partial update of business rules.
 * Body: subset of {
 *   enableActiveWeekWeekend: boolean,
 *   enableNextWeek: boolean,
 *   closedWeekdays: number[],            // Luxon 1..7
 *   workWindows: [{ startHour, startMinute, endHour, endMinute }, ...],
 *   activeWeekendWindows: [...same shape]
 * }
 */
app.patch("/api/admin/settings", requireAdmin, (req, res) => {
  const body = req.body || {};
  // Validate windows up-front so a bad payload doesn't silently fall back to defaults
  if (body.workWindows && Array.isArray(body.workWindows)) {
    for (const w of body.workWindows) {
      if (!isValidWindow(w)) {
        return res
          .status(400)
          .json({ error: "Invalid window in workWindows", window: w });
      }
    }
  }
  if (body.activeWeekendWindows && Array.isArray(body.activeWeekendWindows)) {
    for (const w of body.activeWeekendWindows) {
      if (!isValidWindow(w)) {
        return res
          .status(400)
          .json({ error: "Invalid window in activeWeekendWindows", window: w });
      }
    }
  }
  if (body.closedWeekdays && !Array.isArray(body.closedWeekdays)) {
    return res.status(400).json({ error: "closedWeekdays must be an array" });
  }

  const next = saveBusinessRules(body);
  return res.json({ ok: true, rules: next });
});

/** POST /api/admin/settings/reset — restore defaults. */
app.post("/api/admin/settings/reset", requireAdmin, (req, res) => {
  businessRulesStore = null;
  writeJsonFile(
    "business_rules.json",
    sanitizeBusinessRules(DEFAULT_BUSINESS_RULES)
  );
  loadBusinessRules();
  return res.json({ ok: true, rules: getBusinessRules() });
});

/** GET /api/admin/stats — quick counters for the dashboard. */
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const now = DateTime.now();
    const calendar = getCalendarClient();
    const list = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: now.minus({ days: 30 }).toUTC().toISO(),
      timeMax: now.plus({ months: 3 }).toUTC().toISO(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const items = (list.data.items || []).filter(
      (e) => e.status !== "cancelled"
    );

    let pastCount = 0;
    let upcomingCount = 0;
    let todayCount = 0;

    const today = now.setZone(BUSINESS_ZONE).startOf("day");
    const tomorrow = today.plus({ days: 1 });

    for (const e of items) {
      const s = e.start?.dateTime
        ? DateTime.fromISO(e.start.dateTime, { setZone: true })
        : e.start?.date
        ? DateTime.fromISO(e.start.date, { zone: BUSINESS_ZONE })
        : null;
      if (!s || !s.isValid) continue;
      if (s < now) pastCount++;
      else upcomingCount++;
      if (s >= today && s < tomorrow) todayCount++;
    }

    return res.json({
      total: items.length,
      past: pastCount,
      upcoming: upcomingCount,
      today: todayCount,
      range: {
        from: now.minus({ days: 30 }).toISO(),
        to: now.plus({ months: 3 }).toISO(),
      },
    });
  } catch (err) {
    console.error("[admin/stats] error:", err);
    return res.status(500).json({ error: "Error fetching stats" });
  }
});

// ===============================
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
