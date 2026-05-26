/**
 * PKCE (Proof Key for Code Exchange) helpers for Salesforce OAuth 2.0
 * Uses Web Crypto API — available in all modern browsers.
 */

function base64urlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/** Generate a cryptographically random code verifier (96 bytes → 128 base64url chars) */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(96);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

/** SHA-256 hash the verifier → base64url-encoded code challenge */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(digest);
}

/** Generate a random state nonce to prevent CSRF on the callback */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

/** Storage helpers — store PKCE verifier between redirect and callback */
const VERIFIER_KEY_PREFIX = 'sf_pkce_verifier_';

export function storePkceVerifier(state: string, verifier: string): void {
  sessionStorage.setItem(VERIFIER_KEY_PREFIX + state, verifier);
}

export function retrievePkceVerifier(state: string): string | null {
  const verifier = sessionStorage.getItem(VERIFIER_KEY_PREFIX + state);
  if (verifier) {
    sessionStorage.removeItem(VERIFIER_KEY_PREFIX + state);
  }
  return verifier;
}
