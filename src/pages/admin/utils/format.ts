/**
 * Display helpers for the admin dashboard.
 *
 * Calendar events come in with either `dateTime` (ISO with offset) or `date`
 * (all-day YYYY-MM-DD). These helpers normalize that and surface dates in the
 * admin's browser timezone — which is what an admin reading bookings expects,
 * even though the underlying business zone is Africa/Cairo.
 */

type CalDateTime = {
  dateTime?: string;
  date?: string;
  timeZone?: string;
} | null;

export function getStartDate(d: CalDateTime): Date | null {
  if (!d) return null;
  if (d.dateTime) return new Date(d.dateTime);
  if (d.date) return new Date(`${d.date}T00:00:00`);
  return null;
}

const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatDate(d: Date | null): string {
  return d ? dateFmt.format(d) : '—';
}

export function formatTime(d: Date | null): string {
  return d ? timeFmt.format(d) : '—';
}

export function formatDateTime(d: Date | null): string {
  return d ? dateTimeFmt.format(d) : '—';
}

/** YYYY-MM-DD in the viewer's local timezone (used for date inputs). */
export function toLocalDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DDTHH:mm in the viewer's local timezone (datetime-local input). */
export function toLocalDateTimeInput(d: Date): string {
  const date = toLocalDateInput(d);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${date}T${h}:${m}`;
}

export function getViewerTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Best-effort customer extraction.
 *
 * Bookings created by the public form land with:
 *   - summary: "Booking: <name>"
 *   - description: starts with "Booked by: <name> <email>", then the Q&A block
 *
 * Older bookings (or those edited manually) may have neither — we fall back to
 * any email regex match in the description, and to parsing the summary. We
 * also still honor a real Google Calendar attendee if one was added manually.
 */
export function extractCustomer(b: {
  summary?: string;
  attendees: Array<{ email?: string; displayName?: string }>;
  description: string;
  organizer: { email?: string; displayName?: string } | null;
}): { name: string; email: string } {
  // 1. Real attendee (admin-added) wins.
  const attendee = b.attendees?.find((a) => a.email);
  if (attendee?.email) {
    return {
      name: attendee.displayName || attendee.email.split('@')[0],
      email: attendee.email,
    };
  }

  // 2. "Booked by: <name> <email>" line at the top of the description.
  const bookedBy = b.description?.match(
    /Booked by:\s*([^<\n]+?)\s*<([^>]+)>/i,
  );
  if (bookedBy) {
    return { name: bookedBy[1].trim(), email: bookedBy[2].trim() };
  }

  // 3. Any email anywhere in the description + name from summary if shaped
  //    like "Booking: <name>".
  const anyEmail = b.description?.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const summaryName = b.summary?.match(/^Booking:\s*(.+)$/i);
  return {
    name: summaryName ? summaryName[1].trim() : '—',
    email: anyEmail ? anyEmail[0] : '—',
  };
}

/**
 * Parse the form-generated "Additional Information" block into structured
 * key/value pairs the admin UI can render as a clean list.
 *
 * Returns:
 *   - `bookedBy`: the leading "Booked by:" line, if present (already shown
 *     separately as Customer name/email, so omitted from `fields`).
 *   - `fields`: every "Label: value" line from the form's Q&A.
 *   - `raw`: the untouched description, so callers can offer "show raw".
 *   - `unstructured`: true when no fields were detected (legacy/free-form
 *     description) — UI should fall back to the raw block.
 */
export function parseDescription(description: string): {
  bookedBy: string | null;
  fields: Array<{ label: string; value: string }>;
  raw: string;
  unstructured: boolean;
} {
  const raw = description || '';
  if (!raw.trim()) {
    return { bookedBy: null, fields: [], raw, unstructured: true };
  }

  const lines = raw.split(/\r?\n/);
  const fields: Array<{ label: string; value: string }> = [];
  let bookedBy: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip the form's decorative separator and section header.
    if (/^─+$/.test(trimmed)) continue;
    if (/^additional information:?$/i.test(trimmed)) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const label = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (!label || !value) continue;

    if (/^booked by$/i.test(label)) {
      bookedBy = value;
      continue;
    }

    fields.push({ label, value });
  }

  return {
    bookedBy,
    fields,
    raw,
    unstructured: fields.length === 0 && !bookedBy,
  };
}
