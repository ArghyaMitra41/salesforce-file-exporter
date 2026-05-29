import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, ShieldCheckIcon, ServerIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { initiateOAuthFlow, normalizeInstanceUrl } from './salesforceAuth';

const DEFAULT_CLIENT_ID = import.meta.env.VITE_SF_DEFAULT_CLIENT_ID || '';
const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
const REDIRECT_URI = `${APP_URL}/auth/callback`;

export default function AuthPage() {
  const [orgDomain, setOrgDomain] = useState('');
  const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);
  const [isSandbox, setIsSandbox] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!orgDomain.trim()) {
      setError('Please enter your Salesforce org domain.');
      return;
    }
    if (!clientId.trim()) {
      setError('Please enter your Connected App Consumer Key.');
      return;
    }

    setIsLoading(true);
    try {
      const instanceUrl = normalizeInstanceUrl(orgDomain);
      await initiateOAuthFlow({
        instanceUrl,
        clientId: clientId.trim(),
        redirectUri: REDIRECT_URI,
        isSandbox,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate login');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Branding & Features */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-6">
            <DocumentArrowDownIcon className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Salesforce File Exporter</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
            Export Salesforce Files<br />directly to your computer
          </h1>
          <p className="text-gray-600 mb-6">
            Bulk-download ContentFiles, Attachments, and Documents from any Salesforce org.
            100% browser-based — your data never touches our servers.
          </p>

          <div className="space-y-3">
            <Feature icon={<ShieldCheckIcon className="h-5 w-5 text-green-600" />} title="Zero data leaves your browser">
              All API calls go directly from your browser to Salesforce. No proxy, no backend.
            </Feature>
            <Feature icon={<ServerIcon className="h-5 w-5 text-blue-600" />} title="All Salesforce file types">
              ContentDocument (Files), Attachments, and Documents — export them all.
            </Feature>
            <Feature icon={<DocumentArrowDownIcon className="h-5 w-5 text-purple-600" />} title="Flexible export modes">
              CSV of Record IDs, custom SOQL, List Views, or browse by object.
            </Feature>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            Need help?{' '}
            <Link to="/setup" className="text-blue-600 hover:underline">
              View Connected App setup guide →
            </Link>
          </p>
        </div>

        {/* Right: Login Form */}
        <div className="card p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Connect to Salesforce</h2>
          <p className="text-sm text-gray-500 mb-6">
            You'll be redirected to Salesforce to log in securely.
          </p>

          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="label" htmlFor="orgDomain">
                Salesforce Org Domain
              </label>
              <input
                id="orgDomain"
                className="input"
                type="text"
                placeholder="mycompany.my.salesforce.com"
                value={orgDomain}
                onChange={(e) => setOrgDomain(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-gray-400 mt-1">
                e.g. mycompany or mycompany.my.salesforce.com
              </p>
            </div>

            <div>
              <label className="label" htmlFor="clientId">
                Consumer Key (Client ID)
              </label>
              <input
                id="clientId"
                className="input"
                type="text"
                placeholder="3MVG9..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-gray-400 mt-1">
                From your Salesforce Connected App.{' '}
                <Link to="/setup" className="text-blue-600 hover:underline">
                  How to set up →
                </Link>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="sandbox"
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                checked={isSandbox}
                onChange={(e) => setIsSandbox(e.target.checked)}
              />
              <label htmlFor="sandbox" className="text-sm text-gray-700">
                This is a sandbox org
              </label>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Redirecting to Salesforce...
                </>
              ) : (
                <>
                  Connect to Salesforce
                  <ArrowRightIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-center text-gray-400">
              🔒 OAuth 2.0 PKCE — no passwords stored
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-800">{title}</p>
        <p className="text-xs text-gray-500">{children}</p>
      </div>
    </div>
  );
}
