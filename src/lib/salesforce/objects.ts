/**
 * SObject metadata helpers — global describe, object describe.
 */

import type { SFGlobalDescribeResult, SFSObjectBasic, SFDescribeResult } from '../../types/salesforce';
import { sfGet } from './client';

/** Fetch the list of all queryable SObjects */
export async function getQueryableObjects(): Promise<SFSObjectBasic[]> {
  const result = await sfGet<SFGlobalDescribeResult>('/sobjects');
  return result.sobjects
    .filter((s) => s.queryable)
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Fetch field metadata for a specific SObject */
export async function describeObject(objectName: string): Promise<SFDescribeResult> {
  return sfGet<SFDescribeResult>(`/sobjects/${objectName}/describe`);
}

/** Fetch the Salesforce API limits (for usage warnings before large exports) */
export async function getApiLimits(): Promise<{ max: number; remaining: number }> {
  interface LimitItem { Max: number; Remaining: number }
  const result = await sfGet<{ DailyApiRequests: LimitItem }>('/limits');
  return {
    max: result.DailyApiRequests.Max,
    remaining: result.DailyApiRequests.Remaining,
  };
}
