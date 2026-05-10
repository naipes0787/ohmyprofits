// This is a router configuration module, not a component module — fast-refresh
// of route configs requires a full page reload regardless.
/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';

import { AppProviders } from '@app/AppProviders';
import { RootLayout } from '@app/RootLayout';
import { RouteFallback } from '@app/RouteFallback';
import { RouteError } from '@app/RouteError';

import { AuthLayout } from '@features/auth/AuthLayout';
import { ProtectedRoute } from '@features/auth/ProtectedRoute';

/**
 * Code-split per `bundle-dynamic-imports`. Auth pages share an AuthLayout
 * outlet; the rest live behind ProtectedRoute inside RootLayout.
 *
 * The whole tree is wrapped in <AppProviders /> so AuthProvider + ToastProvider
 * sit *inside* the router (descendants use useNavigate / useLocation).
 */
const ClientsPage = lazy(() => import('@features/clients/ClientsPage'));
const ProductsPage = lazy(() => import('@features/products/ProductsPage'));
const OrdersPage = lazy(() => import('@features/orders/OrdersPage'));
const AccountPage = lazy(() => import('@features/account/AccountPage'));

const LoginPage = lazy(() => import('@features/auth/LoginPage'));
const SignupPage = lazy(() => import('@features/auth/SignupPage'));
const MagicLinkPage = lazy(() => import('@features/auth/MagicLinkPage'));
const VerifyPage = lazy(() => import('@features/auth/VerifyPage'));
const ForgotPage = lazy(() => import('@features/auth/ForgotPage'));
const ResetPage = lazy(() => import('@features/auth/ResetPage'));

function lazied(node: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <AppProviders />,
    errorElement: <RouteError />,
    children: [
      // Public auth routes — no ProtectedRoute, no RootLayout chrome.
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: lazied(<LoginPage />) },
          { path: '/signup', element: lazied(<SignupPage />) },
          { path: '/magic-link', element: lazied(<MagicLinkPage />) },
          { path: '/verify', element: lazied(<VerifyPage />) },
          { path: '/forgot', element: lazied(<ForgotPage />) },
          { path: '/reset', element: lazied(<ResetPage />) },
        ],
      },

      // Protected app shell — everything else.
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <RootLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="/clients" replace /> },
          { path: 'clients', element: lazied(<ClientsPage />) },
          { path: 'products', element: lazied(<ProductsPage />) },
          { path: 'orders', element: lazied(<OrdersPage />) },
          { path: 'account', element: lazied(<AccountPage />) },
        ],
      },

      // Anything else → bounce to /clients (which itself bounces to /login if signed out).
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
