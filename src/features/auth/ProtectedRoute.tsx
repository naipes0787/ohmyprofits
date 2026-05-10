import { Navigate, useLocation } from 'react-router';
import { useAuth } from './use-auth';
import { buildLoginUrl } from './return-to';
import { RouteFallback } from '@app/RouteFallback';

/**
 * Auth boundary. Per §3.1, all routes except /login, /signup, /verify, /forgot
 * are gated. While the initial session probe is still resolving we render the
 * RouteFallback so we don't flash the unauthenticated /login screen.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isReady, session } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return <RouteFallback />;
  }

  if (!session) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={buildLoginUrl(next)} replace />;
  }

  return <>{children}</>;
}
