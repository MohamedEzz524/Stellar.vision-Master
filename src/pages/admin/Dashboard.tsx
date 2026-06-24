import { useState } from 'react';
import { useAdminAuth } from '../../global/AdminAuthContext';
import OverviewTab from './tabs/OverviewTab';
import BookingsTab from './tabs/BookingsTab';
import BlockedDatesTab from './tabs/BlockedDatesTab';
import SettingsTab from './tabs/SettingsTab';

type Tab = 'overview' | 'bookings' | 'blocked' | 'settings';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'blocked', label: 'Day availability' },
  { key: 'settings', label: 'Business hours' },
];

const AdminDashboardPage = () => {
  const { email, logout } = useAdminAuth();
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-white">
      <header className="border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-grid text-[10px] tracking-[0.3em] text-white/40 uppercase sm:text-xs">
              Stellar Vision
            </p>
            <h1 className="font-grid truncate text-base font-bold tracking-wider text-white uppercase sm:text-lg">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden max-w-[200px] truncate text-xs text-white/60 lg:inline">
              {email}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-white/20 px-3 py-1.5 text-[10px] tracking-wider text-white/80 uppercase transition hover:border-white/40 hover:text-white sm:text-xs"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-white/10 bg-black/40 px-2 sm:px-6">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`relative shrink-0 px-3 py-3 text-[10px] tracking-wider uppercase transition sm:px-4 sm:text-xs ${
                  active ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute right-2 bottom-0 left-2 h-0.5 bg-white" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'bookings' && <BookingsTab />}
        {tab === 'blocked' && <BlockedDatesTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
};

export default AdminDashboardPage;
