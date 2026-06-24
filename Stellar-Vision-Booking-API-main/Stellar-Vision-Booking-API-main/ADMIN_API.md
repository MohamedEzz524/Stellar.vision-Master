# Admin API reference

All `/api/admin/*` routes require:

```
Authorization: Bearer <jwt>
```

Get the JWT from `POST /api/admin/login`. Token TTL is set by `ADMIN_TOKEN_TTL` (default `8h`).

## Setup (one-time)

```bash
npm install                              # installs bcryptjs + jsonwebtoken
node hash-password.js MyAdminPassword    # prints ADMIN_PASSWORD_HASH=$2a$12$...
# generate a long random JWT secret:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Then set in `.env`:
```
ADMIN_EMAIL=admin@stellar.vision
ADMIN_PASSWORD_HASH=$2a$12$...
ADMIN_JWT_SECRET=<long random string>
ADMIN_TOKEN_TTL=8h
```

Restart the server. Runtime state lives in `./data/` (auto-created on first boot, seeded from the previously-hardcoded defaults).

## Auth

### `POST /api/admin/login`
Body: `{ email, password }`
Returns: `{ token, email, ttl }` on success, `401` on bad credentials, `503` if admin not configured. Rate-limited 10/10min/IP.

### `GET /api/admin/verify`
Returns: `{ ok: true, email }` if the JWT is still valid. Use this on app boot to check the stored token.

## Bookings

### `GET /api/admin/bookings?from=&to=&q=&limit=&pageToken=`
Lists Google Calendar events as bookings. Defaults: `from = 30 days ago`, `to = 6 months ahead`. `q` does a free-text search. Paginated via `pageToken`.
Returns: `{ items, nextPageToken, from, to }`.

### `GET /api/admin/bookings/:id`
Returns: single booking.

### `DELETE /api/admin/bookings/:id`
Cancels (deletes) the booking from Google Calendar. Idempotent.

### `PATCH /api/admin/bookings/:id`
Body: `{ slot_start_time?, timezone?, summary?, description? }`
Reschedules and/or updates summary/description. Reschedule validates against business rules + slot grid + conflicts.

### `GET /api/admin/stats`
Quick counters: `{ total, past, upcoming, today, range }`.

## Blocked dates

Persisted to `./data/blocked_dates.json`.

### `GET /api/admin/blocked-dates`
Returns: `{ items: [{ date, reason, addedAt, addedBy }] }`.

### `POST /api/admin/blocked-dates`
Body: `{ date: "YYYY-MM-DD", reason? }`
Adds a single blocked date. `409` if already blocked.

### `DELETE /api/admin/blocked-dates/:date`
Unblocks the given date. `404` if not currently blocked.

## Business rules

Persisted to `./data/business_rules.json`.

### `GET /api/admin/settings`
Returns:
```
{
  rules: {
    enableActiveWeekWeekend: bool,
    enableNextWeek: bool,
    closedWeekdays: number[],          // Luxon weekday: Mon=1..Sun=7
    workWindows: [{ startHour, startMinute, endHour, endMinute }, ...],
    activeWeekendWindows: [...same shape]
  },
  constants: { meetingDuration, minBookingHours, businessZone }
}
```

### `PATCH /api/admin/settings`
Partial update. Windows are validated; sends `400` if any window has bad bounds.

### `POST /api/admin/settings/reset`
Restores defaults.
