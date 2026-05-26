/**
 * File naming logic for exports.
 * Handles naming strategies and duplicate deduplication.
 */

import type { FileRecord, FileNamingStrategy } from '../../types/export';

/** Sanitize a filename — remove characters invalid in file paths */
function sanitize(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

/**
 * In Salesforce, ContentVersion.Title often already includes the extension
 * (e.g. "invoice.pdf") even though FileExtension is also stored separately.
 * Strip any trailing extension from the title so we don't get "invoice.pdf.pdf".
 */
function stripTrailingExtension(title: string, ext: string): string {
  if (!ext) return title;
  const suffix = `.${ext.toLowerCase()}`;
  if (title.toLowerCase().endsWith(suffix)) {
    return title.slice(0, -suffix.length);
  }
  return title;
}

/**
 * Resolve the file path for a record based on naming strategy.
 * Uses a seen-names set to deduplicate.
 */
export function resolveZipPath(
  file: FileRecord,
  strategy: FileNamingStrategy,
  seen: Set<string>
): string {
  const ext = file.extension ? `.${file.extension}` : '';
  // Strip extension from title before re-appending it — prevents "name.pdf.pdf"
  const cleanTitle = sanitize(stripTrailingExtension(file.title, file.extension));
  const base = cleanTitle + ext;
  const parentId = file.parentId || 'unknown';

  let path: string;

  switch (strategy) {
    case 'id-only':
      path = `${file.id}${ext}`;
      break;
    case 'id-prefix':
      path = `${parentId}_${base}`;
      break;
    case 'folder-per-record':
      path = `${parentId}/${base}`;
      break;
    case 'original':
    default:
      path = base;
      break;
  }

  // Deduplicate: add (1), (2), etc. for same-path collisions
  if (!seen.has(path)) {
    seen.add(path);
    return path;
  }

  // Find a unique suffix
  let counter = 1;
  let candidate: string;
  do {
    // Insert (n) before the extension
    const lastDot = path.lastIndexOf('.');
    if (lastDot > 0 && strategy !== 'folder-per-record') {
      candidate = `${path.slice(0, lastDot)} (${counter})${path.slice(lastDot)}`;
    } else {
      candidate = `${path} (${counter})`;
    }
    counter++;
  } while (seen.has(candidate));

  seen.add(candidate);
  return candidate;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
