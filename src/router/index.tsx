import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from '../components/Layout';
import { useAuthStore } from '../features/auth/authStore';

const AuthPage = lazy(() => import('../features/auth/AuthPage'));
const CallbackPage = lazy(() => import('../features/auth/CallbackPage'));
const ExportWizard = lazy(() => import('../features/export/ExportWizard'));
const ProgressPage = lazy(() => import('../features/progress/ProgressPage'));
const SetupGuidePage = lazy(() => import('../features/setup/SetupGuidePage'));

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/auth" replace />,
  },
  {
    path: '/auth',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <AuthPage />
      </Suspense>
    ),
  },
  {
    path: '/auth/callback',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <CallbackPage />
      </Suspense>
    ),
  },
  {
    path: '/setup',
    element: (
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
          <SetupGuidePage />
        </Suspense>
      </Layout>
    ),
  },
  {
    path: '/export',
    element: (
      <RequireAuth>
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <ExportWizard />
          </Suspense>
        </Layout>
      </RequireAuth>
    ),
  },
  {
    path: '/export/progress',
    element: (
      <RequireAuth>
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <ProgressPage />
          </Suspense>
        </Layout>
      </RequireAuth>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/auth" replace />,
  },
]);
