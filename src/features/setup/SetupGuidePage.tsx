import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardDocumentIcon, CheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5 text-green-600" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative group mt-2 mb-1">
      <pre className="bg-gray-900 text-green-300 text-xs rounded-lg p-3 overflow-x-auto pr-16 font-mono">
        {code}
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {num}
      </div>
      <div className="flex-1 pb-6">
        <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
        <div className="text-sm text-gray-600 space-y-2">{children}</div>
      </div>
    </div>
  );
}

export default function SetupGuidePage() {
  const [tab, setTab] = useState<'app' | 'cors'>('app');

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Link to="/auth" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-6">
        <ArrowLeftIcon className="h-4 w-4" /> Back to Login
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Salesforce Setup Guide</h1>
      <p className="text-gray-500 mb-6 text-sm">
        A Salesforce admin needs to complete these one-time steps to enable the app.
      </p>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'app', label: '1. Create Connected App' },
          { key: 'cors', label: '2. Enable CORS' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'app' | 'cors')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'app' && (
        <div className="card p-6 divide-y divide-gray-100">
          <div className="pb-6">
            <p className="text-sm text-gray-600">
              A Connected App lets this tool authenticate users via OAuth 2.0 PKCE — no passwords are ever stored.
            </p>
          </div>
          <div className="pt-6 space-y-0">
            <Step num={1} title="Go to App Manager">
              <p>In Salesforce Setup, search for <strong>App Manager</strong> and click <strong>New Connected App</strong>.</p>
            </Step>
            <Step num={2} title="Fill in Basic Info">
              <p>Set a name (e.g. <em>Salesforce File Exporter</em>) and your email. The API name fills automatically.</p>
            </Step>
            <Step num={3} title="Enable OAuth Settings">
              <p>Check <strong>Enable OAuth Settings</strong>.</p>
              <p>Add these <strong>Callback URLs</strong> (one per line):</p>
              <CodeBlock code={`${APP_URL}/auth/callback`} />
            </Step>
            <Step num={4} title="Select OAuth Scopes">
              <p>Add these scopes:</p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li><code className="bg-gray-100 px-1 rounded text-xs">api</code> — Access Salesforce API</li>
                <li><code className="bg-gray-100 px-1 rounded text-xs">refresh_token, offline_access</code> — Keep session alive</li>
              </ul>
            </Step>
            <Step num={5} title="Enable PKCE and CORS for OAuth">
              <p>Check both of these boxes:</p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>✅ <strong>Enable Proof Key for Code Exchange (PKCE) Extension</strong></li>
                <li>✅ <strong>Enable CORS for OAuth Endpoints</strong></li>
              </ul>
              <p>Also uncheck:</p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>❌ <strong>Require Secret for Web Server Flow</strong></li>
                <li>❌ <strong>Require Secret for Refresh Token Flow</strong></li>
              </ul>
            </Step>
            <Step num={6} title="Save and Copy the Consumer Key">
              <p>Save the Connected App. After 2–10 minutes, open the app details and copy the <strong>Consumer Key</strong> (Client ID).</p>
              <p className="text-blue-700 font-medium">Paste this key on the login page.</p>
            </Step>
          </div>
        </div>
      )}

      {tab === 'cors' && (
        <div className="card p-6 divide-y divide-gray-100">
          <div className="pb-6">
            <p className="text-sm text-gray-600">
              Salesforce requires you to whitelist this app's origin before it can make REST API calls directly from the browser.
            </p>
          </div>
          <div className="pt-6 space-y-0">
            <Step num={1} title='Go to CORS in Setup'>
              <p>In Setup, search for <strong>CORS</strong> and open <strong>CORS Allowlist</strong>.</p>
            </Step>
            <Step num={2} title="Add this app's URL">
              <p>Click <strong>New</strong> and add:</p>
              <CodeBlock code={APP_URL} />
              <p className="text-xs text-gray-400">Add <code>http://localhost:5173</code> as well for local development.</p>
            </Step>
            <Step num={3} title="Save">
              <p>Click Save. CORS changes take effect immediately.</p>
            </Step>
          </div>

          <div className="pt-6">
            <h3 className="font-semibold text-gray-800 mb-2 text-sm">Verify CORS is working</h3>
            <p className="text-sm text-gray-600">
              After logging in, if you see <em>"CORS error"</em> or blocked API calls, double-check that the exact URL{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">{APP_URL}</code>{' '}
              (no trailing slash) is in the CORS allowlist.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">⚠️ Admin permissions required</p>
        <p>Creating Connected Apps requires the <em>Customize Application</em> and <em>Manage Connected Apps</em> permissions in your Salesforce org.</p>
      </div>
    </div>
  );
}
