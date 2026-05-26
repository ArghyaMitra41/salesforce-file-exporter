import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { exchangeCodeForTokens } from './salesforceAuth';
import { useAuthStore } from './authStore';

const SF_ERROR_MESSAGES: Record<string, string> = {
  redirect_uri_mismatch:
    `Redirect URI mismatch — add this exact URL to your Connected App's callback list: ${window.location.origin}/auth/callback`,
  invalid_client: 'Invalid Consumer Key. Double-check it matches the Connected App.',
  access_denied: 'Access denied. Make sure your user has permission to use the Connected App.',
  invalid_grant: 'Authorization code expired. Please log in again.',
};

type ErrorType = 'cors' | 'general';

interface AuthError {
  type: ErrorType;
  message: string;
}

export default function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokens } = useAuthStore();
  const [error, setError] = useState<AuthError | null>(null);

  // Prevent React StrictMode from running this effect twice.
  // StrictMode mounts→unmounts→remounts in dev, but useRef persists across that cycle.
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const sfError = searchParams.get('error');
    const sfErrorDesc = searchParams.get('error_description');

    // Salesforce returned an error on the redirect (e.g. access_denied)
    if (sfError) {
      const msg = SF_ERROR_MESSAGES[sfError] || sfErrorDesc || sfError;
      setError({ type: 'general', message: msg });
      return;
    }

    if (!code || !state) {
      setError({ type: 'general', message: 'Missing authorization code or state. Please try logging in again.' });
      return;
    }

    (async () => {
      try {
        const { tokens, clientId } = await exchangeCodeForTokens(code, state);
        // NOTE: We do NOT call fetchUserInfo(tokens.id, ...) here.
        // tokens.id points to login.salesforce.com / test.salesforce.com which is a
        // different domain from the org instance — CORS blocks it from localhost.
        // User profile (name, email) is fetched lazily from instance_url after login.
        setTokens(tokens, clientId);
        navigate('/export', { replace: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Authentication failed';
        // Detect the CORS sentinel we embed in the error message
        if (msg.startsWith('CORS_ERROR:')) {
          setError({ type: 'cors', message: msg.replace('CORS_ERROR: ', '') });
        } else {
          setError({ type: 'general', message: msg });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    const isCors = error.type === 'cors';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card p-6 max-w-lg w-full">
          <div className="flex items-start gap-3 mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-lg text-gray-900 mb-1">Authentication Failed</h2>
              {isCors ? (
                <p className="text-sm text-gray-600">
                  The browser was blocked from reaching Salesforce (CORS policy).
                </p>
              ) : (
                <p className="text-sm text-red-700">{error.message}</p>
              )}
            </div>
          </div>

          {isCors && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-4 text-sm space-y-3">
              <p className="font-semibold text-amber-900">Two settings must be enabled in Salesforce:</p>

              <div>
                <p className="font-medium text-amber-800">1. Connected App — Enable CORS for OAuth</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Setup → App Manager → <em>your app</em> → Edit →<br />
                  ✅ Check <strong>"Enable CORS for OAuth Endpoints"</strong>
                </p>
              </div>

              <div>
                <p className="font-medium text-amber-800">2. CORS Allowlist — add this origin</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Setup → Security → CORS → New → add:
                </p>
                <code className="block mt-1 bg-amber-100 text-amber-900 px-2 py-1 rounded text-xs font-mono">
                  {window.location.origin}
                </code>
              </div>

              <p className="text-amber-700 text-xs">
                After saving both settings, wait ~2 minutes then try again.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={() => navigate('/auth', { replace: true })}
            >
              Back to Login
            </button>
            {isCors && (
              <Link to="/setup" className="btn-primary">
                Setup Guide
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Completing authentication…</p>
        <p className="text-gray-400 text-sm mt-1">You'll be redirected shortly.</p>
      </div>
    </div>
  );
}
