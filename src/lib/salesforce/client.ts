/**
 * Base Salesforce REST API client.
 * - Injects Authorization header from authStore
 * - Auto-retries 401 with token refresh
 * - Exponential backoff for 429/503
 * - Concurrency semaphore (max 5 concurrent requests)
 * - Supports AbortSignal for job cancellation
 */

import { useAuthStore } from '../../features/auth/authStore';

const SF_API_VERSION = 'v62.0';
const MAX_CONCURRENT = 5;

// Simple counting semaphore
let activeRequests = 0;
const waitQueue: Array<() => void> = [];

function acquireSemaphore(): Promise<void> {
  return new Promise((resolve) => {
    if (activeRequests < MAX_CONCURRENT) {
      activeRequests++;
      resolve();
    } else {
      waitQueue.push(() => {
        activeRequests++;
        resolve();
      });
    }
  });
}

function releaseSemaphore(): void {
  activeRequests--;
  const next = waitQueue.shift();
  if (next) next();
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ResponseType = 'json' | 'blob' | 'arraybuffer' | 'text';

export class SalesforceApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'SalesforceApiError';
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.clone().json();
    if (Array.isArray(body) && body[0]?.message) return body[0].message;
    if (body?.error_description) return body.error_description;
    if (body?.message) return body.message;
  } catch {
    // ignore
  }
  return `HTTP ${res.status}: ${res.statusText}`;
}

/**
 * Make a request to the Salesforce REST API.
 * @param path - relative path from /services/data/vXX.X/  OR full URL
 * @param options - standard RequestInit
 * @param responseType - how to parse the response
 * @param signal - AbortSignal for cancellation
 */
export async function sfFetch(
  path: string,
  options: RequestInit = {},
  responseType: ResponseType = 'json',
  signal?: AbortSignal
): Promise<unknown> {
  const state = useAuthStore.getState();
  if (!state.isAuthenticated || !state.accessToken || !state.instanceUrl) {
    throw new SalesforceApiError('Not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  const url = path.startsWith('http')
    ? path
    : `${state.instanceUrl}/services/data/${SF_API_VERSION}${path}`;

  let retries = 0;
  const maxRetries = 3;

  while (retries <= maxRetries) {
    await acquireSemaphore();

    try {
      const res = await fetch(url, {
        ...options,
        signal,
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          Accept: 'application/json',
          ...options.headers,
        },
      });

      // Token expired — try refresh once
      if (res.status === 401 && retries === 0) {
        try {
          await useAuthStore.getState().refreshSession();
          retries++;
          continue;
        } catch {
          useAuthStore.getState().clearAuth();
          throw new SalesforceApiError('Session expired. Please log in again.', 401, 'SESSION_EXPIRED');
        }
      }

      // Rate limited or server error — backoff and retry
      if ((res.status === 429 || res.status === 503) && retries < maxRetries) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10);
        await sleep((retryAfter || Math.pow(2, retries)) * 1000);
        retries++;
        continue;
      }

      if (!res.ok) {
        const message = await parseErrorMessage(res);
        throw new SalesforceApiError(message, res.status);
      }

      if (responseType === 'blob') return await res.blob();
      if (responseType === 'arraybuffer') return await res.arrayBuffer();
      if (responseType === 'text') return await res.text();
      return await res.json();
    } finally {
      releaseSemaphore();
    }
  }

  throw new SalesforceApiError('Max retries exceeded', 503);
}

/** Convenience: GET JSON */
export async function sfGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return sfFetch(path, { method: 'GET' }, 'json', signal) as Promise<T>;
}

/** Download a blob (for file body downloads) */
export async function sfDownloadBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  return sfFetch(path, { method: 'GET' }, 'blob', signal) as Promise<Blob>;
}

export { SF_API_VERSION };
