import { useState } from 'react';
import type { BookingItem } from '../../../lib/adminApi';
import {
  extractCustomer,
  formatDate,
  formatTime,
  getStartDate,
  parseDescription,
} from '../utils/format';
import Modal from './Modal';
import Button from './Button';

/**
 * Read-only quick view of a single booking.
 *
 * Triggered by clicking a row in the bookings table. Shows everything we have
 * (when, customer, organizer, attendees, description, audit timestamps) in a
 * clean two-column layout, and surfaces the same actions as the table row
 * (reschedule, cancel) so the admin can act without closing this view first.
 *
 * The description from Google Calendar can be raw text with newlines and
 * the "Booked by:" prefix the API prepends. We render it as preserved
 * whitespace so newlines stay visible.
 */

const Row = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="border-b border-white/5 py-2 last:border-b-0">
    <p className="text-[10px] tracking-wider text-white/40 uppercase">
      {label}
    </p>
    <div
      className={`mt-0.5 text-sm text-white/90 ${mono ? 'font-mono text-xs' : ''}`}
    >
      {value ?? '—'}
    </div>
  </div>
);

const BookingDetailsModal = ({
  booking,
  onClose,
  onReschedule,
  onCancel,
}: {
  booking: BookingItem | null;
  onClose: () => void;
  onReschedule: (b: BookingItem) => void;
  onCancel: (b: BookingItem) => void;
}) => {
  const [showRaw, setShowRaw] = useState(false);

  if (!booking) {
    return <Modal open={false} onClose={onClose} title="" size="lg">{null}</Modal>;
  }

  const start = getStartDate(booking.start);
  const end = getStartDate(booking.end);
  const customer = extractCustomer(booking);
  const parsed = parseDescription(booking.description);
  const created = booking.created ? new Date(booking.created) : null;
  const updated = booking.updated ? new Date(booking.updated) : null;

  return (
    <Modal
      open
      onClose={onClose}
      title="Booking details"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {booking.htmlLink && (
            <a
              href={booking.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium tracking-wider text-white/80 uppercase transition hover:border-white/40 hover:text-white"
            >
              Open in Calendar ↗
            </a>
          )}
          <Button variant="secondary" onClick={() => onReschedule(booking)}>
            Reschedule
          </Button>
          <Button variant="danger" onClick={() => onCancel(booking)}>
            Cancel booking
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Header strip — summary + status badge */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] tracking-wider text-white/40 uppercase">
              Summary
            </p>
            <h3 className="font-grid mt-1 text-xl font-bold text-white">
              {booking.summary || '—'}
            </h3>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] tracking-wider uppercase ${
              booking.status === 'confirmed'
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-white/10 text-white/60'
            }`}
          >
            {booking.status}
          </span>
        </div>

        {/* Two-column metadata */}
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <div>
            <Row
              label="Date"
              value={start ? formatDate(start) : '—'}
            />
            <Row
              label="Time"
              value={
                start && end
                  ? `${formatTime(start)} → ${formatTime(end)}`
                  : formatTime(start)
              }
            />
            <Row label="Customer name" value={customer.name} />
            <Row label="Customer email" value={customer.email} />
          </div>
          <div>
            <Row
              label="Organizer"
              value={
                booking.organizer
                  ? booking.organizer.displayName || booking.organizer.email
                  : '—'
              }
            />
            <Row
              label="Created by"
              value={
                booking.creator
                  ? booking.creator.displayName || booking.creator.email
                  : '—'
              }
            />
            <Row
              label="Created"
              value={created ? created.toLocaleString() : '—'}
            />
            <Row
              label="Last updated"
              value={updated ? updated.toLocaleString() : '—'}
            />
          </div>
        </div>

        {/* Attendees */}
        {booking.attendees && booking.attendees.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] tracking-wider text-white/40 uppercase">
              Attendees ({booking.attendees.length})
            </p>
            <ul className="space-y-1 rounded-md border border-white/10 bg-black/40 p-3 text-sm">
              {booking.attendees.map((a, i) => (
                <li
                  key={`${a.email ?? 'attendee'}-${i}`}
                  className="flex items-center justify-between"
                >
                  <span className="text-white/80">
                    {a.displayName || a.email?.split('@')[0] || '—'}
                  </span>
                  <span className="text-xs text-white/40">
                    {a.email ?? ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Form responses — parsed from the description into a clean Q&A list */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] tracking-wider text-white/40 uppercase">
              Form responses
            </p>
            {!parsed.unstructured && booking.description && (
              <button
                type="button"
                onClick={() => setShowRaw((s) => !s)}
                className="text-[10px] tracking-wider text-white/40 uppercase hover:text-white/80"
              >
                {showRaw ? 'Show structured' : 'Show raw'}
              </button>
            )}
          </div>

          {!booking.description && (
            <p className="text-sm text-white/40">No description</p>
          )}

          {booking.description && showRaw && (
            <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/40 p-3 text-xs whitespace-pre-wrap text-white/80">
              {parsed.raw}
            </pre>
          )}

          {booking.description &&
            !showRaw &&
            (parsed.unstructured ? (
              <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/40 p-3 text-xs whitespace-pre-wrap text-white/80">
                {parsed.raw}
              </pre>
            ) : (
              <ul className="divide-y divide-white/5 overflow-hidden rounded-md border border-white/10 bg-black/40">
                {parsed.fields.map((f, i) => (
                  <li key={i} className="px-3 py-2">
                    <p className="text-[10px] tracking-wider text-white/40 uppercase">
                      {f.label}
                    </p>
                    <p className="mt-0.5 text-sm text-white/90 break-words">
                      {f.value}
                    </p>
                  </li>
                ))}
              </ul>
            ))}
        </div>

        {/* Booking ID for support */}
        <Row label="Booking ID" value={booking.id} mono />
      </div>
    </Modal>
  );
};

export default BookingDetailsModal;
