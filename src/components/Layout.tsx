import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import {
  DocumentArrowDownIcon,
  ArrowRightStartOnRectangleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../features/auth/authStore';
import OrgBadge from './OrgBadge';

interface Props {
  children: React.ReactNode;
}

/** Fetch user display name from the org instance_url (CORS-safe) after login */
function useUserProfile() {
  const { isAuthenticated, userId, userDisplayName, instanceUrl, accessToken, setUserProfile } = useAuthStore();

  useEffect(() => {
    // Skip if already have a name, not authenticated, or missing required data
    if (!isAuthenticated || userDisplayName || !userId || !instanceUrl || !accessToken) return;

    const SF_API_VERSION = 'v62.0';
    fetch(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/User/${userId}?fields=Name,Email,Username`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
      .then((r) => r.json())
      .then((data: { Name?: string; Email?: string }) => {
        if (data.Name) setUserProfile(data.Name, data.Email || '');
      })
      .catch(() => {
        // Non-fatal — OrgBadge will just show the org domain instead
      });
  }, [isAuthenticated, userId, userDisplayName, instanceUrl, accessToken, setUserProfile]);
}

export default function Layout({ children }: Props) {
  const location = useLocation();
  const { isAuthenticated, clearAuth } = useAuthStore();

  useUserProfile();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to={isAuthenticated ? '/export' : '/auth'} className="flex items-center gap-2">
            <DocumentArrowDownIcon className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-gray-900 text-sm">Salesforce File Exporter</span>
          </Link>

          <nav className="flex items-center gap-3">
            {isAuthenticated && (
              <>
                <OrgBadge />
                <Link
                  to="/setup"
                  className={`text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 ${
                    location.pathname === '/setup' ? 'text-blue-600' : ''
                  }`}
                >
                  <QuestionMarkCircleIcon className="h-4 w-4" />
                  Setup
                </Link>
                <button
                  onClick={clearAuth}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                  Disconnect
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-3 px-4 text-center text-xs text-gray-400 space-y-1">
        <p>All data flows directly between your browser and Salesforce. Nothing is stored on external servers.</p>
        <p>
          Built by{' '}
          <a href="https://arghyamitra.netlify.app" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            Arghya Mitra
          </a>
          {' '}·{' '}
          <a href="https://github.com/ArghyaMitra41/salesforce-file-exporter" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
