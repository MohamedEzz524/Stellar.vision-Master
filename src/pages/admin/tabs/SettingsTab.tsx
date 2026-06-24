import { useCallback, useEffect, useState } from 'react';
import {
  adminApi,
  ApiError,
  type BusinessRules,
  type SettingsResponse,
} from '../../../lib/adminApi';
import Button from '../components/Button';
import Modal from '../components/Modal';

/**
 * Business hours / rules editor.
 *
 * Surfaces the same source the public calendar reads (work windows for
 * weekdays, weekend rules for active weekends, closed-weekday list, and the
 * two feature flags). The editor maintains a draft in component state and
 * only sends a PATCH on save — so admins can tweak multiple fields without
 * round-tripping per change. A reset button restores the seed defaults.
 *
 * Luxon weekday numbering: Mon=1 … Sun=7. We render Mon..Sun in that order.
 */

type Window = BusinessRules['workWindows'][number];

const WEEKDAYS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

/** Format an hour:minute pair as HH:mm for the time inputs. */
const toTimeStr = (h: number, m: number) =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

/** Parse HH:mm back into a pair. Returns null on bad input. */
const parseTime = (s: string): { h: number; m: number } | null => {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mn = Number(m[2]);
  if (h < 0 || h > 23 || mn < 0 || mn > 59) return null;
  return { h, m: mn };
};

const emptyWindow = (): Window => ({
  startHour: 9,
  startMinute: 0,
  endHour: 17,
  endMinute: 0,
});

const WindowsEditor = ({
  label,
  hint,
  windows,
  onChange,
}: {
  label: string;
  hint: string;
  windows: Window[];
  onChange: (next: Window[]) => void;
}) => {
  const update = (idx: number, patch: Partial<Window>) => {
    onChange(windows.map((w, i) => (i === idx ? { ...w, ...patch } : w)));
  };
  const remove = (idx: number) => {
    onChange(windows.filter((_, i) => i !== idx));
  };
  const add = () => {
    onChange([...windows, emptyWindow()]);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <p className="text-xs tracking-wider text-white uppercase">
            {label}
          </p>
          <p className="text-[10px] tracking-wider text-white/40 uppercase">
            {hint}
          </p>
        </div>
        <Button variant="secondary" onClick={add}>
          + Window
        </Button>
      </div>
      {windows.length === 0 && (
        <p className="py-4 text-center text-xs tracking-wider text-white/40 uppercase">
          No windows
        </p>
      )}
      <div className="space-y-2">
        {windows.map((w, i) => {
          const startStr = toTimeStr(w.startHour, w.startMinute);
          const endStr = toTimeStr(w.endHour, w.endMinute);
          return (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 rounded-md border border-white/5 bg-black/40 px-3 py-2"
            >
              <span className="text-[10px] tracking-wider text-white/40 uppercase">
                From
              </span>
              <input
                type="time"
                aria-label="Window start time"
                value={startStr}
                onChange={(e) => {
                  const p = parseTime(e.target.value);
                  if (p) update(i, { startHour: p.h, startMinute: p.m });
                }}
                className="rounded-md border border-white/15 bg-black/60 px-2 py-1 text-sm text-white outline-none focus:border-white/40"
              />
              <span className="text-[10px] tracking-wider text-white/40 uppercase">
                To
              </span>
              <input
                type="time"
                aria-label="Window end time"
                value={endStr}
                onChange={(e) => {
                  const p = parseTime(e.target.value);
                  if (p) update(i, { endHour: p.h, endMinute: p.m });
                }}
                className="rounded-md border border-white/15 bg-black/60 px-2 py-1 text-sm text-white outline-none focus:border-white/40"
              />
              <div className="ml-auto">
                <Button variant="danger" onClick={() => remove(i)}>
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Custom on/off switch. The native `<input type="checkbox">` looks terrible
 * (and is often invisible) on dark themes, especially on mobile where the
 * Tailwind `accent-white` hint is partially supported. This is a styled
 * button that visually reads as a toggle and works identically on every
 * platform — including touch screens where it's a full-width-clickable row.
 */
const ToggleRow = ({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  hint: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked ? 'true' : 'false'}
    onClick={() => onChange(!checked)}
    className="flex w-full items-start justify-between gap-3 rounded-md border border-white/5 bg-black/30 px-3 py-3 text-left transition hover:border-white/20"
  >
    <div className="flex-1">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-white/50">{hint}</p>
    </div>
    <span
      aria-hidden
      className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition ${
        checked ? 'bg-emerald-500' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </span>
  </button>
);

const SettingsTab = () => {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [draft, setDraft] = useState<BusinessRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminApi.settings();
      setSettings(r);
      setDraft(structuredClone(r.rules));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const r = await adminApi.patchSettings(draft);
      setSettings((prev) => (prev ? { ...prev, rules: r.rules } : prev));
      setDraft(structuredClone(r.rules));
      setInfo('Saved');
      // Clear the success badge after a moment so the editor doesn't show
      // stale success state forever.
      setTimeout(() => setInfo(null), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await adminApi.resetSettings();
      setSettings((prev) => (prev ? { ...prev, rules: r.rules } : prev));
      setDraft(structuredClone(r.rules));
      setConfirmReset(false);
      setInfo('Defaults restored');
      setTimeout(() => setInfo(null), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !draft) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center">
        <p className="text-xs tracking-wider text-white/40 uppercase">
          Loading…
        </p>
      </div>
    );
  }

  const toggleClosedWeekday = (value: number) => {
    setDraft((d) => {
      if (!d) return d;
      const has = d.closedWeekdays.includes(value);
      const next = has
        ? d.closedWeekdays.filter((v) => v !== value)
        : [...d.closedWeekdays, value].sort((a, b) => a - b);
      return { ...d, closedWeekdays: next };
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-grid text-lg font-bold tracking-wider text-white uppercase">
          Business hours
        </h2>
        <div className="flex items-center gap-2">
          {info && (
            <span className="text-xs tracking-wider text-emerald-300 uppercase">
              ✓ {info}
            </span>
          )}
          <Button
            variant="ghost"
            onClick={() => setConfirmReset(true)}
            disabled={saving}
          >
            Reset to defaults
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      {settings && (
        <p className="mb-4 text-[10px] tracking-wider text-white/40 uppercase">
          Slot: {settings.constants.meetingDuration}min · Min lead:{' '}
          {settings.constants.minBookingHours}h · Business zone:{' '}
          {settings.constants.businessZone}
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Feature toggles */}
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
          <p className="mb-3 text-xs tracking-wider text-white uppercase">
            Booking window
          </p>
          <div className="space-y-4">
            <ToggleRow
              checked={draft.enableActiveWeekWeekend}
              onChange={(v) =>
                setDraft({ ...draft, enableActiveWeekWeekend: v })
              }
              title="Open weekends this week"
              hint="Make this week's normally-closed weekend days bookable (using the Weekend hours below). Next week's weekends stay closed."
            />
            <ToggleRow
              checked={draft.enableNextWeek}
              onChange={(v) => setDraft({ ...draft, enableNextWeek: v })}
              title="Allow next-week bookings"
              hint="Let customers book days from next week, not just this week."
            />
          </div>
        </div>

        {/* Closed weekdays */}
        <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
          <p className="mb-1 text-xs tracking-wider text-white uppercase">
            Always-closed days
          </p>
          <p className="mb-3 text-[10px] tracking-wider text-white/40 uppercase">
            Pick days of the week that are off every week (e.g. weekends).
            Tap a day to toggle it.
          </p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => {
              const closed = draft.closedWeekdays.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleClosedWeekday(d.value)}
                  className={`rounded-md border px-3 py-2 text-xs tracking-wider uppercase transition ${
                    closed
                      ? 'border-red-500/50 bg-red-500/20 text-red-200'
                      : 'border-white/15 bg-black/40 text-white/60 hover:border-white/40'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Work windows */}
        <WindowsEditor
          label="Weekday hours"
          hint="Time windows offered on every open day"
          windows={draft.workWindows}
          onChange={(next) => setDraft({ ...draft, workWindows: next })}
        />

        {/* Active weekend windows */}
        <WindowsEditor
          label="Weekend hours"
          hint="Used only when 'Open weekends this week' is on (above)"
          windows={draft.activeWeekendWindows}
          onChange={(next) =>
            setDraft({ ...draft, activeWeekendWindows: next })
          }
        />
      </div>

      <Modal
        open={confirmReset}
        onClose={() => !saving && setConfirmReset(false)}
        title="Reset to defaults?"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmReset(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleReset}
              disabled={saving}
            >
              {saving ? 'Resetting…' : 'Reset'}
            </Button>
          </>
        }
      >
        <p>
          This discards every unsaved change and restores the original work
          windows, closed weekdays, and feature toggles. Cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default SettingsTab;
