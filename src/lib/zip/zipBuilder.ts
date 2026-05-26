/**
 * Streaming ZIP builder using client-zip.
 * Downloads files concurrently (limited by semaphore) and streams them
 * into a ZIP archive for browser download.
 */

import { downloadZip } from 'client-zip';
import type { FileRecord, FileNamingStrategy, ExportProgress } from '../../types/export';
import { sfDownloadBlob } from '../salesforce/client';
import { resolveZipPath } from './fileNaming';
import { formatLogEntry } from '../utils/logger';
import { useAuthStore } from '../../features/auth/authStore';

const DOWNLOAD_CONCURRENCY = 5;

export interface ZipBuilderOptions {
  naming: FileNamingStrategy;
  signal: AbortSignal;
  onProgress: (update: Partial<ExportProgress>) => void;
  onFileStatus: (fileId: string, status: 'downloading' | 'done' | 'error', errorMsg?: string) => void;
}

/**
 * Download all files and build a streaming ZIP blob.
 * Returns a Blob that can be downloaded.
 */
export async function buildAndDownloadZip(
  files: FileRecord[],
  options: ZipBuilderOptions
): Promise<void> {
  const { naming, signal, onProgress, onFileStatus } = options;
  const seen = new Set<string>();
  const instanceUrl = useAuthStore.getState().instanceUrl || '';
  const log: string[] = [];

  let completedFiles = 0;
  let downloadedBytes = 0;
  let errorFiles = 0;

  // Build an async generator that yields file entries for client-zip
  async function* generateEntries() {
    // Use a pool of concurrent downloads
    const queue = [...files];
    const inFlight = new Map<number, Promise<{ name: string; input: Blob; lastModified: Date } | null>>();
    let nextIndex = 0;

    // Fill initial pool
    function fillPool() {
      while (inFlight.size < DOWNLOAD_CONCURRENCY && nextIndex < queue.length) {
        const file = queue[nextIndex];
        const idx = nextIndex;
        nextIndex++;

        const promise = (async () => {
          if (signal.aborted) return null;
          onFileStatus(file.id, 'downloading');
          onProgress({ currentFileName: file.title });

          try {
            const url = instanceUrl + `/services/data/v62.0${file.downloadPath}`;
            const blob = await sfDownloadBlob(url, signal);
            const zipPath = resolveZipPath(file, naming, seen);

            onFileStatus(file.id, 'done');
            completedFiles++;
            downloadedBytes += blob.size;
            log.push(formatLogEntry('success', `Downloaded: ${file.title}`));
            onProgress({
              completedFiles,
              downloadedBytes,
              log: [...log],
            });

            return {
              name: zipPath,
              input: blob,
              lastModified: new Date(file.lastModifiedDate),
            };
          } catch (err) {
            if (signal.aborted) return null;
            const errorMsg = err instanceof Error ? err.message : 'Download failed';
            onFileStatus(file.id, 'error', errorMsg);
            errorFiles++;
            completedFiles++;
            log.push(formatLogEntry('error', `Failed: ${file.title} — ${errorMsg}`));
            onProgress({
              completedFiles,
              errorFiles,
              log: [...log],
            });
            return null; // Skip this file in ZIP
          }
        })();

        inFlight.set(idx, promise);
      }
    }

    fillPool();

    // Yield results in order (preserves file ordering in ZIP)
    let yieldIdx = 0;
    while (yieldIdx < queue.length) {
      const entry = await inFlight.get(yieldIdx);
      inFlight.delete(yieldIdx);
      yieldIdx++;
      fillPool(); // refill pool
      if (entry) yield entry;
    }
  }

  const zipResponse = downloadZip(generateEntries());
  const blob = await zipResponse.blob();

  if (signal.aborted) return;

  // Trigger browser download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sfdc-export-${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
