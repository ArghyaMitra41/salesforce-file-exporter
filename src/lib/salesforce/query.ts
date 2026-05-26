/**
 * SOQL query helpers with automatic pagination via nextRecordsUrl.
 */

import type { SFQueryResult } from '../../types/salesforce';
import { sfGet } from './client';
import { useAuthStore } from '../../features/auth/authStore';

/**
 * Execute a SOQL query and return all records, automatically following
 * nextRecordsUrl pagination. Yields batches of records.
 */
export async function* queryAll<T>(
  soql: string,
  signal?: AbortSignal
): AsyncGenerator<T[]> {
  const encoded = encodeURIComponent(soql);
  let result = await sfGet<SFQueryResult<T>>(`/query?q=${encoded}`, signal);
  yield result.records;

  while (!result.done && result.nextRecordsUrl) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    // nextRecordsUrl is a full path like /services/data/vXX/query/01g...
    const instanceUrl = useAuthStore.getState().instanceUrl || '';
    result = await sfGet<SFQueryResult<T>>(
      instanceUrl + result.nextRecordsUrl,
      signal
    );
    yield result.records;
  }
}

/**
 * Execute a SOQL query and collect ALL records into a flat array.
 * Use for smaller result sets where streaming isn't needed.
 */
export async function queryAllFlat<T>(
  soql: string,
  signal?: AbortSignal
): Promise<T[]> {
  const records: T[] = [];
  for await (const batch of queryAll<T>(soql, signal)) {
    records.push(...batch);
  }
  return records;
}

/** Execute a single SOQL query (one page, up to 2000 records) */
export async function querySingle<T>(
  soql: string,
  signal?: AbortSignal
): Promise<SFQueryResult<T>> {
  const encoded = encodeURIComponent(soql);
  return sfGet<SFQueryResult<T>>(`/query?q=${encoded}`, signal);
}

/** Chunk an array into batches of given size */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Format an array of IDs for use in a SOQL IN clause */
export function toInClause(ids: string[]): string {
  return `('${ids.join("','")}')`;
}
