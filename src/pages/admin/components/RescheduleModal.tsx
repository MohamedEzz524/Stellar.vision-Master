import { useEffect, useState } from 'react';
import {
  adminApi,
  ApiError,
  type BookingItem,
} from '../../../lib/adminApi';
import {
  getStartDate,
  getViewerTimezone,
  toLocalDateTimeInput,
} from '../utils/format';
import Modal from './Modal';
import Button from './Button';

/**
 * Reschedule a booking by picking a new start time.
 *
 * The backend re-validates against business rules (open day, work window,
 * 30-min grid, lead time, conflicts) and returns 400 with a message if any
 * check fails — we just surface that message inline. The datetime-local input
 * gives the admin's local time, which we convert to a UTC ISO string before
 * sending so the server interprets it unambiguously.
 */
const RescheduleModal = ({
  booking,
  onClose,
  onSaved,
}: {
  booking: BookingItem | null;
  onClose: () => void;
  onSaved: (updated: BookingItem) => void;
}) => {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state whenever a new booking is opened.
  useEffect(() => {
    if (!booking) return;
    const current = getStartDate(booking.start);
    setValue(current ? toLocalDateTimeInput(current) : '');
    setError(null);
    setSaving(false);
  }, [booking]);

  const handleSave = async () => {
    if (!booking || !value) return;
    setSaving(true);
    setError(null);
    try {
      const localDate = new Date(value);
      if (isNaN(localDate.getTime())) {
        setError('Pick a valid date and time.');
        setSaving(false);
        return;
      }
      const updated = await adminApi.patchBooking(booking.id, {
        slot_start_time: localDate.toISOString(),
        timezone: getViewerTimezone(),
      });
      onSaved(updated);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not reschedule.',
      );
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!booking}
      onClose={onClose}
      title="Reschedule booking"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || !value}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      {booking && (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] tracking-wider text-white/40 uppercase">
              Currently
            </p>
            <p className="mt-1 text-white">
              {getStartDate(booking.start)?.toLocaleString() ?? '—'}
            </p>
          </div>
          <label className="block">
            <span className="mb-1 block text-[10px] tracking-wider text-white/60 uppercase">
              New date and time
            </span>
            <input
              type="datetime-local"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-md border border-white/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
            />
          </label>
          <p className="text-[10px] tracking-wider text-white/30">
            Must fall on a 30-minute slot inside an open business window.
          </p>
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default RescheduleModal;
