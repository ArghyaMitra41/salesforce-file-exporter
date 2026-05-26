/**
 * CSV parsing utilities for extracting Salesforce record IDs.
 * Uses PapaParse for robust CSV handling.
 */

import Papa from 'papaparse';

/** Regex for Salesforce 15-char or 18-char IDs */
const SF_ID_REGEX = /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/;

export interface ParseResult {
  ids: string[];
  errors: string[];
  totalRows: number;
}

/**
 * Parse a CSV string and extract Salesforce record IDs.
 * Accepts CSVs where:
 * - First column is the record ID, OR
 * - A column header contains "id" (case-insensitive)
 */
export function parseRecordIdCsv(csvText: string): ParseResult {
  const ids: string[] = [];
  const errors: string[] = [];
  let totalRows = 0;

  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    return {
      ids: [],
      errors: result.errors.map((e) => `Row ${e.row}: ${e.message}`),
      totalRows: 0,
    };
  }

  const headers = result.meta.fields || [];

  // Find the ID column: prefer a header named 'Id', 'ID', 'id', or 'Record ID'
  const idHeader =
    headers.find((h) => /^id$/i.test(h)) ||
    headers.find((h) => /record.?id/i.test(h)) ||
    headers[0];

  totalRows = result.data.length;

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const rawId = idHeader ? (row[idHeader] || '').trim() : Object.values(row)[0]?.trim() || '';

    if (!rawId) continue;

    // Normalize 18-char to 15-char? No — keep both; SF accepts both.
    if (SF_ID_REGEX.test(rawId)) {
      if (!ids.includes(rawId)) {
        ids.push(rawId);
      }
    } else {
      errors.push(`Row ${i + 2}: "${rawId}" doesn't look like a Salesforce ID`);
    }
  }

  return { ids, errors, totalRows };
}

/**
 * Parse plain text (one ID per line) — alternative to CSV upload.
 */
export function parseIdsFromText(text: string): ParseResult {
  const lines = text.split(/[\n,\s]+/).map((l) => l.trim()).filter(Boolean);
  const ids: string[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    if (SF_ID_REGEX.test(line)) {
      if (!ids.includes(line)) ids.push(line);
    } else {
      errors.push(`"${line}" doesn't look like a Salesforce ID`);
    }
  }

  return { ids, errors, totalRows: lines.length };
}
