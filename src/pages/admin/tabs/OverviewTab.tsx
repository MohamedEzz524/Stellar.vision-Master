import { useEffect, useState } from 'react';
import { adminApi, type StatsResponse, ApiError } from '../../../lib/adminApi';

const StatCard = ({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: 'default' | 'positive' | 'muted';
}) => {
  const accentColor =
    accent === 'positive'
      ? 'text-emerald-300'
      : accent === 'muted'
        ? 'text-white/40'
        : 'text-white';
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
      <p className="text-xs tracking-[0.3em] text-white/40 uppercase">
        {label}
      </p>
      <p className={`mt-2 font-grid text-3xl font-bold ${accentColor}`}>
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-[10px] tracking-wider text-white/30 uppercase">
          {hint}
        </p>
      )}
    </div>
  );
};

const OverviewTab = () => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminApi
      .stats()
      .then((r) => {
        if (cancelled) return;
        setStats(r);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load stats');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-grid text-lg font-bold tracking-wider text-white uppercase">
          Overview
        </h2>
        {stats && (
          <p className="text-[10px] tracking-wider text-white/40 uppercase">
            Range: {new Date(stats.range.from).toLocaleDateString()} –{' '}
            {new Date(stats.range.to).toLocaleDateString()}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total"
          value={loading ? '—' : (stats?.total ?? 0)}
          hint="In tracked range"
        />
        <StatCard
          label="Upcoming"
          value={loading ? '—' : (stats?.upcoming ?? 0)}
          hint="From now onward"
          accent="positive"
        />
        <StatCard
          label="Today"
          value={loading ? '—' : (stats?.today ?? 0)}
          hint="Scheduled today"
        />
        <StatCard
          label="Past"
          value={loading ? '—' : (stats?.past ?? 0)}
          hint="Already happened"
          accent="muted"
        />
      </div>
    </div>
  );
};

export default OverviewTab;
