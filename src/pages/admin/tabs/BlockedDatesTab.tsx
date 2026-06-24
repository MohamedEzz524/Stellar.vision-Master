import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminApi,
  ApiError,
  type BlockedDate,
  type BusinessRules,
} from '../../../lib/adminApi';
import Button from '../components/Button';

/**
 * Visual day-availability editor.
 *
 * Renders a Mon..Sun grid for the selected month with the same status
 * categories the public calendar uses:
 *   - Past             → muted, not clickable
 *   - Weekly closed    → dimmed red, not clickable (managed in Business hours)
 *   - Blocked          → solid red, click to unblock (with reason tooltip)
 *   - Available        → silver chrome, click to block
 *
 * Navigation: ← / → moves one calendar month at a time, "Today" resets to the
 * current month. Toggles fire one API call each; we mutate local state from
 * the server response so the grid reflects truth instead of optimistically.
 */

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABEL_FMT = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
});

/** YYYY-MM-DD in the viewer's local timezone (avoids UTC off-by-one). */
const toIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Returns 0..6 (Mon=0..Sun=6) for the first slot of the calendar grid so we
 * always pad to a Monday start. `Date#getDay()` is Sun=0, so we shift by 1
 * and mod 7.
 */
const mondayOffset = (date: Date) => (date.getDay() + 6) % 7;

/** Build the 35- or 42-cell month grid (Mon-first weeks). */
function buildMonthGrid(viewMonth: Date): Date[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const padStart = mondayOffset(first);

  const cells: Date[] = [];
  // Lead-in days from the previous month.
  for (let i = padStart; i > 0; i -= 1) {
    cells.push(new Date(year, month, 1 - i));
  }
  // The month itself.
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d += 1) {
    cells.push(new Date(year, month, d));
  }
  // Trailing days to complete the final week (so the grid always ends on Sunday).
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    cells.push(
      new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
    );
  }
  return cells;
}

const BlockedDatesTab = () => {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [blocked, setBlocked] = useState<BlockedDate[]>([]);
  const [rules, setRules] = useState<BusinessRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyDate, setBusyDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reasonInput, setReasonInput] = useState('');

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [bd, st] = await Promise.all([
        adminApi.blockedDates(),
        adminApi.settings(),
      ]);
      setBlocked(bd.items);
      setRules(st.rules);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const blockedMap = useMemo(() => {
    const m = new Map<string, BlockedDate>();
    for (const b of blocked) m.set(b.date, b);
    return m;
  }, [blocked]);

  const closedWeekdays = useMemo(
    () => new Set(rules?.closedWeekdays ?? []),
    [rules],
  );

  // Active-week boundaries (Sunday-start week containing today) — mirrors the
  // backend's getWeekBoundariesInBusinessZone so the UI's "open this week"
  // logic matches what /availability/year actually returns.
  const activeWeek = useMemo(() => {
    const t = new Date();
    const dow = t.getDay(); // 0=Sun..6=Sat
    const start = new Date(t.getFullYear(), t.getMonth(), t.getDate() - dow);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return { start: toIsoDate(start), end: toIsoDate(end) };
  }, []);

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const handleToggle = async (isoDate: string) => {
    if (busyDate) return;
    setBusyDate(isoDate);
    setError(null);
    try {
      if (blockedMap.has(isoDate)) {
        const r = await adminApi.removeBlockedDate(isoDate);
        setBlocked(r.items);
        setReasonInput('');
      } else {
        const r = await adminApi.addBlockedDate(
          isoDate,
          reasonInput.trim() || undefined,
        );
        setBlocked(r.items);
        setReasonInput('');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update');
    } finally {
      setBusyDate(null);
    }
  };

  const goPrev = () =>
    setViewMonth(
      (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
    );
  const goNext = () =>
    setViewMonth(
      (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
    );
  const goToday = () => {
    const d = new Date();
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const todayIso = toIsoDate(new Date());

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-grid text-lg font-bold tracking-wider text-white uppercase">
            Day availability
          </h2>
          <p className="text-[10px] tracking-wider text-white/40 uppercase">
            Click any day to block or unblock. Closed weekdays are managed
            under Business hours.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={goToday}>
            Today
          </Button>
          <Button variant="secondary" onClick={goPrev}>
            ←
          </Button>
          <span className="min-w-[140px] text-center text-sm tracking-wider text-white uppercase">
            {MONTH_LABEL_FMT.format(viewMonth)}
          </span>
          <Button variant="secondary" onClick={goNext}>
            →
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-white/10 bg-black/40 p-3">
        <label className="block">
          <span className="mb-1 block text-[10px] tracking-wider text-white/60 uppercase">
            Reason (optional) — applied to the next day you block
          </span>
          <input
            type="text"
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            placeholder="e.g. National holiday, vacation, conference"
            className="w-full rounded-md border border-white/15 bg-black/60 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/40"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 pb-2">
          {WEEK_LABELS.map((l) => (
            <div
              key={l}
              className="text-center text-[10px] tracking-wider text-white/40 uppercase"
            >
              {l}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d, i) => {
            const iso = toIsoDate(d);
            const inMonth = d.getMonth() === viewMonth.getMonth();
            const isPast = iso < todayIso;
            const isToday = iso === todayIso;
            // Luxon weekday: Mon=1..Sun=7, but JS Date.getDay() is Sun=0..Sat=6.
            const luxonWeekday = ((d.getDay() + 6) % 7) + 1;
            const isWeeklyClosedDay = closedWeekdays.has(luxonWeekday);
            // Same rule the backend uses: if "Open weekends this week" is on,
            // closed-weekday rules are suspended for days inside the active
            // (current) week. Outside the active week, closed-weekday rules
            // still apply.
            const isInActiveWeek = iso >= activeWeek.start && iso <= activeWeek.end;
            const isOpenedByWeekendToggle =
              isWeeklyClosedDay &&
              isInActiveWeek &&
              !!rules?.enableActiveWeekWeekend;
            const isWeeklyClosed = isWeeklyClosedDay && !isOpenedByWeekendToggle;
            const blockedEntry = blockedMap.get(iso);
            const isBlocked = !!blockedEntry;
            const isBusy = busyDate === iso;

            // Categorize cell into a style state.
            let stateClass = '';
            let title = '';
            let clickable = false;

            if (!inMonth) {
              stateClass = 'bg-transparent text-white/15';
              title = '';
              clickable = false;
            } else if (isPast) {
              stateClass = 'bg-black/30 text-white/25';
              title = 'In the past';
            } else if (isWeeklyClosed) {
              stateClass =
                'border border-red-500/30 bg-red-500/10 text-red-200/60';
              title = 'Weekly closed (managed in Business hours)';
            } else if (isBlocked) {
              stateClass =
                'border border-red-500/60 bg-red-500/30 text-white cursor-pointer hover:bg-red-500/45';
              title = blockedEntry?.reason
                ? `Blocked: ${blockedEntry.reason}`
                : 'Blocked — click to unblock';
              clickable = true;
            } else {
              stateClass =
                'border border-white/15 bg-gradient-to-b from-neutral-300/90 to-neutral-400/70 text-black hover:from-neutral-200 hover:to-neutral-300 cursor-pointer';
              title = isOpenedByWeekendToggle
                ? 'Available (weekend opened this week) — click to block'
                : 'Available — click to block';
              clickable = true;
            }

            const todayRing = isToday ? 'ring-1 ring-white/60' : '';

            return (
              <button
                key={i}
                type="button"
                onClick={
                  clickable ? () => handleToggle(iso) : undefined
                }
                disabled={!clickable || isBusy}
                title={title}
                className={`relative aspect-square min-h-[44px] rounded-md text-center transition disabled:cursor-not-allowed sm:min-h-0 ${stateClass} ${todayRing}`}
              >
                <span className="absolute top-0.5 left-1 text-[11px] font-semibold sm:top-1 sm:left-1.5 sm:text-xs">
                  {d.getDate()}
                </span>
                {isToday && (
                  <span className="absolute bottom-0.5 left-1/2 hidden -translate-x-1/2 text-[8px] tracking-wider uppercase sm:inline">
                    Today
                  </span>
                )}
                {isBlocked && (
                  <span className="absolute right-1 bottom-0.5 hidden text-[8px] tracking-wider uppercase sm:inline">
                    ✕
                  </span>
                )}
                {isBusy && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] tracking-wider text-white uppercase">
                    …
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] tracking-wider text-white/50 uppercase">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-gradient-to-b from-neutral-300 to-neutral-400" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border border-red-500/60 bg-red-500/30" />
            Blocked (admin)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border border-red-500/30 bg-red-500/10" />
            Weekly closed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-black/40" />
            Past / other month
          </span>
        </div>
      </div>

      {/* Currently blocked list (compact reference) */}
      <div className="mt-6">
        <p className="mb-2 text-xs tracking-wider text-white/60 uppercase">
          All blocked dates ({blocked.length})
        </p>
        {loading && blocked.length === 0 && (
          <p className="text-xs text-white/40">Loading…</p>
        )}
        {!loading && blocked.length === 0 && (
          <p className="text-xs text-white/40">None.</p>
        )}
        {blocked.length > 0 && (
          <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-black/40 text-sm">
            {[...blocked]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((b) => (
                <li
                  key={b.date}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <div>
                    <span className="text-white">{b.date}</span>
                    {b.reason && (
                      <span className="ml-3 text-xs text-white/50">
                        {b.reason}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => handleToggle(b.date)}
                    disabled={busyDate === b.date}
                  >
                    {busyDate === b.date ? '…' : 'Unblock'}
                  </Button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default BlockedDatesTab;
