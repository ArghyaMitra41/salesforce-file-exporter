/**
 * Salesforce List Views API helpers.
 */

import type { SFListView, SFListViewsResponse, SFListViewDescribe } from '../../types/salesforce';
import { sfGet } from './client';
import { queryAllFlat } from './query';

/** Fetch all list views for a given SObject type */
export async function getListViews(objectName: string): Promise<SFListView[]> {
  const allViews: SFListView[] = [];
  let url = `/sobjects/${objectName}/listviews?pageSize=200`;

  while (url) {
    const result = await sfGet<SFListViewsResponse>(url);
    allViews.push(...result.listviews);
    url = result.nextRecordsUrl || '';
  }

  return allViews.filter((v) => v.soqlCompatible);
}

/**
 * Describe a list view — returns the underlying SOQL query string.
 * We re-run this query to get all record IDs.
 */
export async function describeListView(
  objectName: string,
  listViewId: string
): Promise<SFListViewDescribe> {
  return sfGet<SFListViewDescribe>(
    `/sobjects/${objectName}/listviews/${listViewId}/describe`
  );
}

/**
 * Extract record IDs from list view results by running the list view's SOQL.
 * The describe endpoint gives us the query string we can run via queryAll.
 */
export async function getListViewRecordIds(
  objectName: string,
  listViewId: string,
  signal?: AbortSignal
): Promise<string[]> {
  const describe = await describeListView(objectName, listViewId);
  // The SOQL from the describe may select specific fields; we need at least Id
  // Replace the SELECT clause to ensure we get Id
  const soql = ensureIdInSelect(describe.query);

  const records = await queryAllFlat<{ Id: string }>(soql, signal);
  return records.map((r) => r.Id);
}

/** Ensure the SOQL query selects the Id field */
function ensureIdInSelect(soql: string): string {
  const match = soql.match(/SELECT\s+(.*?)\s+FROM/is);
  if (!match) return soql;

  const fields = match[1].split(',').map((f) => f.trim());
  if (!fields.some((f) => f.toUpperCase() === 'ID')) {
    fields.unshift('Id');
  }
  return soql.replace(/SELECT\s+.*?\s+FROM/is, `SELECT ${fields.join(', ')} FROM`);
}
