import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  adminApi,
  ApiError,
  type BookingItem,
} from '../../../lib/adminApi';
import {
  extractCustomer,
  formatDate,
  formatTime,
  getStartDate,
  toLocalDateInput,
} from '../utils/format';
import Button from '../components/Button';
import Modal from '../components/Modal';
import RescheduleModal from '../components/RescheduleModal';
import BookingDetailsModal from '../components/BookingDetailsModal';

/**
 * Bookings management tab.
 *
 * Lists Google Calendar events as bookings, with date-range and free-text
 * filters that round-trip to the server (the backend handles the heavy
 * filtering — we only debounce the search input and let the server slice the
 * result set with `q`). Each row supports cancel (DELETE) and reschedule
 * (PATCH); deletes are confirmed via a modal because they're irreversible.
 */

const defaultFrom = () => toLocalDateInput(new Date());
const defaultTo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return toLocalDateInput(d);
};

const BookingsTab = () => {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [items, setItems] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BookingItem | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<BookingItem | null>(
    null,
  );
  const [detailsTarget, setDetailsTarget] = useState<BookingItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce the search input by ~300ms so we don't fire on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Tracks the most recent fetch so a slow response from a previous filter
  // can't overwrite a newer result.
  const reqIdRef = useRef(0);
  const fetchBookings = useCallback(async () => {
    const myReqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      // The backend expects ISO dates; pad single-date inputs to start/end of day.
      const fromIso = from ? new Date(`${from}T00:00:00`).toISOString() : undefined;
      const toIso = to ? new Date(`${to}T23:59:59`).toISOString() : undefined;
      const r = await adminApi.bookings({
        from: fromIso,
        to: toIso,
        q: debouncedSearch || undefined,
        limit: 100,
      });
      if (reqIdRef.current !== myReqId) return;
      setItems(r.items);
      setLoading(false);
    } catch (err) {
      if (reqIdRef.current !== myReqId) return;
      setError(err instanceof ApiError ? err.message : 'Failed to load bookings');
      setLoading(false);
    }
  }, [from, to, debouncedSearch]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Sort by start time ascending — Google's API returns in start order already
  // (orderBy=startTime is set server-side), but resorting locally guards against
  // any all-day events that compare oddly.
  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const da = getStartDate(a.start)?.getTime() ?? 0;
        const db = getStartDate(b.start)?.getTime() ?? 0;
        return da - db;
      }),
    [items],
  );

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await adminApi.deleteBooking(confirmDelete.id);
      setItems((prev) => prev.filter((it) => it.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to cancel booking',
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleRescheduled = (updated: BookingItem) => {
    setItems((prev) =>
      prev.map((it) => (it.id === updated.id ? updated : it)),
    );
    setRescheduleTarget(null);
  };

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-grid text-lg font-bold tracking-wider text-white uppercase">
          Bookings
        </h2>
        <p className="text-[10px] tracking-wider text-white/40 uppercase">
          {loading ? 'Loading…' : `${sortedItems.length} bookings`}
        </p>
      </div>

      {/* Filter row */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_2fr_auto]">
        <label className="block">
          <span className="mb-1 block text-[10px] tracking-wider text-white/60 uppercase">
            From
          </span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] tracking-wider text-white/60 uppercase">
            To
          </span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
          />
        </label>
        <label className="col-span-2 block lg:col-span-1">
          <span className="mb-1 block text-[10px] tracking-wider text-white/60 uppercase">
            Search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, summary…"
            className="w-full rounded-md border border-white/15 bg-black/60 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/40"
          />
        </label>
        <div className="col-span-2 flex items-end lg:col-span-1">
          <Button
            variant="secondary"
            onClick={fetchBookings}
            disabled={loading}
            className="w-full lg:w-auto"
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] tracking-wider text-white/40 uppercase">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Summary</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && sortedItems.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-xs text-white/40 uppercase tracking-wider"
                >
                  Loading bookings…
                </td>
              </tr>
            )}
            {!loading && sortedItems.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-xs text-white/40 uppercase tracking-wider"
                >
                  No bookings in this range
                </td>
              </tr>
            )}
            {sortedItems.map((b) => {
              const start = getStartDate(b.start);
              const customer = extractCustomer(b);
              return (
                <tr
                  key={b.id}
                  onClick={() => setDetailsTarget(b)}
                  className="cursor-pointer border-b border-white/5 last:border-b-0 transition hover:bg-white/[0.04]"
                  title="Click to view details"
                >
                  <td className="px-4 py-3 align-top">
                    <div className="text-white">{formatDate(start)}</div>
                    <div className="text-xs text-white/50">
                      {formatTime(start)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-white/90">
                    {b.summary || '—'}
                    {b.htmlLink && (
                      <a
                        href={b.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="ml-2 text-[10px] tracking-wider text-white/40 underline-offset-2 hover:underline"
                      >
                        Open
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="text-white/90">{customer.name}</div>
                    <div className="text-xs text-white/50">
                      {customer.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] tracking-wider uppercase ${
                        b.status === 'confirmed'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 align-top"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setRescheduleTarget(b)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setConfirmDelete(b)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cancel confirmation */}
      <Modal
        open={!!confirmDelete}
        onClose={() => !deleting && setConfirmDelete(null)}
        title="Cancel booking?"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
            >
              Keep
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Cancelling…' : 'Yes, cancel'}
            </Button>
          </>
        }
      >
        {confirmDelete && (
          <div>
            <p>
              This will remove the event from Google Calendar. The customer is
              not auto-notified — you may want to email them separately.
            </p>
            <div className="mt-4 rounded-md border border-white/10 bg-black/40 p-3 text-xs">
              <div className="text-white">{confirmDelete.summary}</div>
              <div className="mt-1 text-white/60">
                {getStartDate(confirmDelete.start)?.toLocaleString() ?? '—'}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <RescheduleModal
        booking={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSaved={handleRescheduled}
      />

      <BookingDetailsModal
        booking={detailsTarget}
        onClose={() => setDetailsTarget(null)}
        onReschedule={(b) => {
          setDetailsTarget(null);
          setRescheduleTarget(b);
        }}
        onCancel={(b) => {
          setDetailsTarget(null);
          setConfirmDelete(b);
        }}
      />
    </div>
  );
};

export default BookingsTab;
