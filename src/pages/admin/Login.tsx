import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../global/AdminAuthContext';

const AdminLoginPage = () => {
  const { login, status, error } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // After auth flips to authenticated, send the user to where they came from
  // (set by ProtectedAdminRoute) or to /admin by default.
  useEffect(() => {
    if (status === 'authenticated') {
      const from =
        (location.state as { from?: string } | null)?.from || '/admin';
      navigate(from, { replace: true });
    }
  }, [status, navigate, location.state]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch {
      /* error surfaced via context */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center bg-black px-4 py-8">
      {/* subtle radial glow */}
      <div
        aria-hidden
        className="admin-login-glow pointer-events-none absolute inset-0 opacity-40"
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950/80 p-8 shadow-2xl backdrop-blur"
      >
        <div className="mb-8 text-center">
          <p className="font-grid text-xs tracking-[0.4em] text-white/40 uppercase">
            Stellar Vision
          </p>
          <h1 className="font-grid mt-2 text-2xl font-bold tracking-wider text-white uppercase">
            Admin Dashboard
          </h1>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs tracking-wider text-white/60 uppercase">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-white/15 bg-black/60 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/40 focus:bg-black/80"
              placeholder="you@stellar.vision"
              disabled={submitting}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs tracking-wider text-white/60 uppercase">
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-white/15 bg-black/60 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/40 focus:bg-black/80"
              placeholder="••••••••"
              disabled={submitting}
            />
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !email || !password}
          className="admin-login-button mt-6 w-full cursor-pointer rounded-md px-4 py-3 text-sm font-bold tracking-wider text-black uppercase disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-6 text-center text-[10px] tracking-wider text-white/30 uppercase">
          Authorized access only · Session lasts 8 hours
        </p>
      </form>
    </div>
  );
};

export default AdminLoginPage;
