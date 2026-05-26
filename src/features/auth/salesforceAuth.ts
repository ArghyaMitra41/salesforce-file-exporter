import type { SFTokenResponse, SFUserInfo } from '../../types/salesforce';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  storePkceVerifier,
  retrievePkceVerifier,
} from './pkce';

export interface OAuthConfig {
  instanceUrl: string; // e.g. "https://mycompany.my.salesforce.com"
  clientId: string;
  redirectUri: string;
  isSandbox?: boolean;
}

const SF_API_VERSION = 'v62.0';

/** Normalize the user-entered org domain to a full URL */
export function normalizeInstanceUrl(raw: string): string {
  let url = raw.trim().toLowerCase();
  // Strip protocol if present
  url = url.replace(/^https?:\/\//, '');
  // Strip trailing slash
  url = url.replace(/\/$/, '');
  // If it looks like just a subdomain without .salesforce.com, append it
  if (!url.includes('.') || (!url.includes('salesforce.com') && !url.includes('force.com'))) {
    url = `${url}.my.salesforce.com`;
  }
  return `https://${url}`;
}

/**
 * Build the Salesforce OAuth authorization URL and initiate PKCE redirect.
 * Stores the code_verifier in sessionStorage keyed by the state nonce.
 */
export async function initiateOAuthFlow(config: OAuthConfig): Promise<void> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateState();

  storePkceVerifier(state, verifier);
  // Also store config so callback page can use it
  sessionStorage.setItem('sf_auth_config', JSON.stringify({
    instanceUrl: config.instanceUrl,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
  }));

  const loginBase = config.isSandbox
    ? 'https://test.salesforce.com'
    : config.instanceUrl;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    scope: 'api refresh_token offline_access',
  });

  window.location.href = `${loginBase}/services/oauth2/authorize?${params.toString()}`;
}

export interface TokenExchangeResult {
  tokens: SFTokenResponse;
  clientId: string;
  instanceUrl: string;
}

/**
 * Exchange the authorization code for tokens.
 * Called from the callback page after Salesforce redirects back.
 * Returns tokens + the clientId (needed for future refresh calls).
 */
export async function exchangeCodeForTokens(
  code: string,
  state: string
): Promise<TokenExchangeResult> {
  const verifier = retrievePkceVerifier(state);
  if (!verifier) {
    throw new Error(
      'PKCE verifier not found — this can happen if the page was refreshed or if the browser ' +
      'opened the callback URL in a new tab. Please go back and log in again.'
    );
  }

  const configRaw = sessionStorage.getItem('sf_auth_config');
  if (!configRaw) {
    throw new Error('Authentication session expired. Please go back and log in again.');
  }
  const config = JSON.parse(configRaw) as Pick<OAuthConfig, 'instanceUrl' | 'clientId' | 'redirectUri'>;
  // Remove config now so a page refresh doesn't reuse a spent auth code
  sessionStorage.removeItem('sf_auth_config');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code_verifier: verifier,
  });

  let res: Response;
  try {
    res = await fetch(`${config.instanceUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch {
    // fetch() itself throws (TypeError) on CORS block or network failure
    throw new Error(
      'CORS_ERROR: The browser could not reach Salesforce. ' +
      'Two things must be configured in Salesforce:\n' +
      '1. Your Connected App → Edit → check "Enable CORS for OAuth Endpoints"\n' +
      `2. Setup → Security → CORS → add "${window.location.origin}"`
    );
  }

  if (!res.ok) {
    let err: { error?: string; error_description?: string } = {};
    try { err = await res.json(); } catch { /* ignore */ }
    throw new Error(err.error_description || err.error || `Token exchange failed (HTTP ${res.status})`);
  }

  const tokens = await res.json() as SFTokenResponse;
  return { tokens, clientId: config.clientId, instanceUrl: config.instanceUrl };
}

/** Refresh the access token using the stored refresh token */
export async function refreshAccessToken(
  instanceUrl: string,
  clientId: string,
  refreshToken: string
): Promise<SFTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken,
  });

  const res = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'refresh_failed' }));
    throw new Error(err.error_description || 'Token refresh failed');
  }

  return res.json() as Promise<SFTokenResponse>;
}

/** Fetch basic user info from the identity URL */
export async function fetchUserInfo(
  identityUrl: string,
  accessToken: string
): Promise<SFUserInfo> {
  const res = await fetch(identityUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  return res.json() as Promise<SFUserInfo>;
}

export function getSFApiBase(instanceUrl: string): string {
  return `${instanceUrl}/services/data/${SF_API_VERSION}`;
}
