import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { adminApi, tokenStorage, EVENTS, ApiError } from '../lib/adminApi';

/**
 * Admin authentication state.
 *
 * Wraps the API token in a React context so every admin component sees the
 * same login state. Calls `/admin/verify` once on boot to confirm a stored
 * token is still valid (and not expired or revoked by a JWT-secret rotation),
 * and listens for the `admin-token-expired` event the API client dispatches
 * when any request returns 401 — that way one expired-token response logs
 * the user out everywhere without each caller handling it.
 */

interface AdminAuthValue {
  status: 'idle' | 'checking' | 'authenticated' | 'unauthenticated';
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Last login error, cleared on next attempt. */
  error: string | null;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AdminAuthValue['status']>('idle');
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Avoid re-running the boot verify if React re-mounts in StrictMode.
  const bootedRef = useRef(false);

  // Boot: if a token is in storage, verify it once.
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    const token = tokenStorage.get();
    if (!token) {
      setStatus('unauthenticated');
      return;
    }
    setStatus('checking');
    adminApi
      .verify()
      .then((r) => {
        setEmail(r.email);
        setStatus('authenticated');
      })
      .catch(() => {
        tokenStorage.clear();
        setEmail(null);
        setStatus('unauthenticated');
      });
  }, []);

  // Listen for the 401-triggered logout signal from the API client.
  useEffect(() => {
    const handler = () => {
      tokenStorage.clear();
      setEmail(null);
      setStatus('unauthenticated');
    };
    window.addEventListener(EVENTS.TOKEN_EXPIRED, handler);
    return () => window.removeEventListener(EVENTS.TOKEN_EXPIRED, handler);
  }, []);

  const login = useCallback(async (loginEmail: string, password: string) => {
    setError(null);
    try {
      const r = await adminApi.login(loginEmail, password);
      tokenStorage.set(r.token);
      setEmail(r.email);
      setStatus('authenticated');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Network error — could not reach the server.';
      setError(msg);
      setStatus('unauthenticated');
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setEmail(null);
    setStatus('unauthenticated');
    setError(null);
  }, []);

  const value = useMemo<AdminAuthValue>(
    () => ({ status, email, login, logout, error }),
    [status, email, login, logout, error],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx)
    throw new Error('useAdminAuth must be used within <AdminAuthProvider>');
  return ctx;
};
