/**
 * Individual file downloader.
 *
 * Primary path  — File System Access API (Chrome/Edge 86+):
 *   User picks a folder once; each file is streamed directly into it.
 *   No ZIP, no memory accumulation, files appear on disk as they arrive.
 *
 * Fallback path — Sequential <a download> clicks (Firefox/Safari):
 *   Files are downloaded one at a time to the browser's Downloads folder.
 *   Browser may prompt "allow multiple downloads" once.
 */

import type { FileRecord, FileNamingStrategy, ExportProgress } from '../../types/export';
import { sfDownloadBlob } from '../salesforce/client';
import { resolveZipPath } from './fileNaming';
import { formatLogEntry } from '../utils/logger';
import { useAuthStore } from '../../features/auth/authStore';

// ─── File System Access API type augmentation ────────────────────────────────
// The File System Access API (`showDirectoryPicker`) is not yet in lib.dom.d.ts
// for all TypeScript versions, so we extend Window here to keep types happy.

interface DirectoryPickerOptions {
  mode?: 'read' | 'readwrite';
}

declare global {
  interface Window {
    showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
  }
}

// ─── File System Access API type guard ───────────────────────────────────────

export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Show the folder picker. Must be called synchronously from a user-gesture
 * handler (button click). Returns null if the user cancels.
 */
export async function pickSaveDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsDirectoryPicker()) return null;
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch {
    // User cancelled the picker
    return null;
  }
}

// ─── Options ─────────────────────────────────────────────────────────────────

export interface IndividualDownloadOptions {
  naming: FileNamingStrategy;
  signal: AbortSignal;
  /** Provided when File System Access API path is used */
  dirHandle?: FileSystemDirectoryHandle | null;
  onProgress: (update: Partial<ExportProgress>) => void;
  onFileStatus: (fileId: string, status: 'downloading' | 'done' | 'error', errorMsg?: string) => void;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function downloadFilesIndividually(
  files: FileRecord[],
  options: IndividualDownloadOptions
): Promise<void> {
  const { naming, signal, dirHandle, onProgress, onFileStatus } = options;
  const seen = new Set<string>();
  const instanceUrl = useAuthStore.getState().instanceUrl || '';
  const log: string[] = [];

  let completedFiles = 0;
  let downloadedBytes = 0;
  let errorFiles = 0;

  for (const file of files) {
    if (signal.aborted) break;

    onFileStatus(file.id, 'downloading');
    onProgress({ currentFileName: file.title });

    try {
      const apiUrl = `${instanceUrl}/services/data/v62.0${file.downloadPath}`;
      const blob = await sfDownloadBlob(apiUrl, signal);
      const filePath = resolveZipPath(file, naming, seen);

      if (dirHandle) {
        await saveToDir(dirHandle, filePath, blob);
      } else {
        triggerBrowserDownload(blob, flattenPath(filePath));
        // Small gap so the browser download manager doesn't drop requests
        await delay(250);
      }

      onFileStatus(file.id, 'done');
      completedFiles++;
      downloadedBytes += blob.size;
      log.push(formatLogEntry('success', `Saved: ${filePath}`));
      onProgress({ completedFiles, downloadedBytes, log: [...log] });

    } catch (err) {
      if (signal.aborted) break;
      const msg = err instanceof Error ? err.message : 'Download failed';
      onFileStatus(file.id, 'error', msg);
      errorFiles++;
      completedFiles++;
      log.push(formatLogEntry('error', `Failed: ${file.title} — ${msg}`));
      onProgress({ completedFiles, errorFiles, log: [...log] });
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Save a blob at a (possibly nested) path inside a directory handle.
 * e.g. "0014H000003/invoice.pdf" creates a subfolder then writes the file.
 */
async function saveToDir(
  root: FileSystemDirectoryHandle,
  filePath: string,
  blob: Blob
): Promise<void> {
  const parts = filePath.split('/');
  let dir = root;

  // Create any intermediate directories
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(sanitizeName(parts[i]), { create: true });
  }

  const filename = sanitizeName(parts[parts.length - 1]);
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/** Replace slashes with underscores for flat-download fallback */
function flattenPath(path: string): string {
  return path.replace(/\//g, '_');
}

function sanitizeName(name: string): string {
  // File System entries can't contain certain characters
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'file';
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15_000);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
