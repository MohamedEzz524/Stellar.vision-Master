import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAdminAuth } from './AdminAuthContext';

/**
 * Wraps any page that requires an admin login.
 *
 * While the boot-time `/admin/verify` call is in flight we render a thin
 * loader instead of redirecting, otherwise a quick StrictMode re-mount or
 * a slow network would briefly bounce the user to /admin/login before the
 * verify call resolves. After the check completes:
 *   - authenticated → render the wrapped page
 *   - unauthenticated → redirect to /admin/login, remembering the original path
 *     in location.state.from so the login page can send the user back after
 *     a successful login.
 */
const ProtectedAdminRoute = ({ children }: { children: ReactNode }) => {
  const { status } = useAdminAuth();
  const location = useLocation();

  if (status === 'idle' || status === 'checking') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black text-white/70">
        <div className="text-sm tracking-wider uppercase">
          Verifying session…
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;
