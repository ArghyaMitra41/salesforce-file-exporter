/**
 * File naming logic for ZIP exports.
 * Handles naming strategies and duplicate deduplication.
 */

import type { FileRecord, FileNamingStrategy } from '../../types/export';

/** Sanitize a filename — remove characters invalid in ZIP paths */
function sanitize(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

/**
 * Resolve the ZIP path for a file record based on naming strategy.
 * Uses a seen-names set to deduplicate.
 */
export function resolveZipPath(
  file: FileRecord,
  strategy: FileNamingStrategy,
  seen: Set<string>
): string {
  const ext = file.extension ? `.${file.extension}` : '';
  const base = sanitize(file.title) + ext;
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
