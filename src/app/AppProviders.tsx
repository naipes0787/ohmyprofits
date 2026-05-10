import { Outlet } from 'react-router';
import { AuthProvider } from '@features/auth/AuthProvider';
import { ToastProvider } from '@shared/ui/Toast';

/**
 * Top-level layout route that wraps every page with the auth/toast providers.
 *
 * Why a layout route instead of wrapping the RouterProvider's children
 * directly? `AuthProvider` and `ToastProvider` need to live *inside* the
 * router so descendants can call `useNavigate`, `useLocation`, etc., from
 * their event handlers without a separate wrapper at every page.
 */
export function AppProviders() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Outlet />
      </ToastProvider>
    </AuthProvider>
  );
}
