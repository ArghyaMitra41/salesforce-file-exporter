/**
 * Core export orchestration hook.
 * Manages the full pipeline: resolve IDs → collect file metadata → download files.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ExportConfig, FileRecord } from '../../types/export';
import { useExportStore } from './exportStore';
import { queryAllFlat } from '../../lib/salesforce/query';
import { resolveContentFiles } from '../../lib/salesforce/contentFiles';
import { resolveAttachments } from '../../lib/salesforce/attachments';
import { resolveDocuments } from '../../lib/salesforce/documents';
import { getListViewRecordIds } from '../../lib/salesforce/listViews';
import { buildAndDownloadZip } from '../../lib/zip/zipBuilder';
import { downloadFilesIndividually } from '../../lib/zip/fileDownloader';
import { getApiLimits } from '../../lib/salesforce/objects';
import { formatLogEntry } from '../../lib/utils/logger';

export function useExportJob() {
  const navigate = useNavigate();
  const store = useExportStore();

  const runExport = useCallback(async (
    config: ExportConfig,
    dirHandle?: FileSystemDirectoryHandle | null
  ) => {
    const job = store.startJob(config);
    const signal = job.abortController.signal;
    const log = (msg: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') =>
      store.appendLog(formatLogEntry(level, msg));

    navigate('/export/progress');

    try {
      // ── Phase 1: Check API limits ────────────────────────────────────────
      try {
        const limits = await getApiLimits();
        const pct = Math.round(((limits.max - limits.remaining) / limits.max) * 100);
        log(`API calls today: ${limits.max - limits.remaining}/${limits.max} used (${pct}%)`);
        if (limits.remaining < 100) {
          store.updateProgress({
            phase: 'resolving',
            errorMessage: `⚠️ Only ${limits.remaining} API calls remaining today. Export may fail.`,
          });
        }
      } catch {
        log('Could not fetch API limits — proceeding anyway', 'warn');
      }

      // ── Phase 2: Resolve record IDs ──────────────────────────────────────
      store.updateProgress({ phase: 'resolving' });
      log('Resolving record IDs…');

      let recordIds: string[] = [];

      if (config.mode === 'csv') {
        recordIds = config.csvRecordIds || [];
        log(`Using ${recordIds.length} IDs from CSV`);
      } else if (config.mode === 'soql') {
        if (!config.soqlQuery) throw new Error('No SOQL query provided');
        log(`Running SOQL: ${config.soqlQuery.substring(0, 100)}…`);
        const records = await queryAllFlat<{ Id: string }>(config.soqlQuery, signal);
        recordIds = records.map((r) => r.Id);
        log(`Query returned ${recordIds.length} records`, 'success');
      } else if (config.mode === 'listview') {
        if (!config.objectName || !config.listViewId) throw new Error('Missing object or list view');
        log(`Fetching list view records for ${config.objectName}…`);
        recordIds = await getListViewRecordIds(config.objectName, config.listViewId, signal);
        log(`List view returned ${recordIds.length} records`, 'success');
      } else if (config.mode === 'object') {
        if (!config.objectName) throw new Error('No object name provided');
        let whereClause = '';
        if (config.objectFilters && config.objectFilters.length > 0) {
          const conditions = config.objectFilters.map((f) => {
            const val = f.operator === 'contains'
              ? `LIKE '%${f.value}%'`
              : f.operator === 'starts_with'
              ? `LIKE '${f.value}%'`
              : f.operator === 'equals'
              ? `= '${f.value}'`
              : f.operator === 'not_equals'
              ? `!= '${f.value}'`
              : f.operator === 'greater_than'
              ? `> '${f.value}'`
              : `< '${f.value}'`;
            return `${f.field} ${val}`;
          });
          whereClause = `WHERE ${conditions.join(' AND ')}`;
        }
        const soql = `SELECT Id FROM ${config.objectName} ${whereClause}`;
        log(`Querying ${config.objectName}…`);
        const records = await queryAllFlat<{ Id: string }>(soql, signal);
        recordIds = records.map((r) => r.Id);
        log(`Found ${recordIds.length} records`, 'success');
      }

      if (signal.aborted) {
        store.updateProgress({ phase: 'cancelled' });
        return;
      }

      if (recordIds.length === 0) {
        store.updateProgress({ phase: 'done', errorMessage: 'No records found matching your criteria.' });
        return;
      }

      // ── Phase 3: Collect file metadata ───────────────────────────────────
      store.updateProgress({ phase: 'collecting' });
      log('Collecting file metadata…');

      const fileTypes = config.filter.fileTypes;
      const allFiles: FileRecord[] = [];

      const filterOpts = {
        dateStart: config.filter.dateRange?.start,
        dateEnd: config.filter.dateRange?.end,
        extensions: config.filter.fileExtensions,
        signal,
      };

      if (fileTypes.includes('content')) {
        log('Resolving ContentFiles…');
        const files = await resolveContentFiles(recordIds, filterOpts);
        allFiles.push(...files);
        log(`Found ${files.length} ContentFiles`, 'success');
      }

      if (fileTypes.includes('attachment')) {
        log('Resolving Attachments…');
        const files = await resolveAttachments(recordIds, filterOpts);
        allFiles.push(...files);
        log(`Found ${files.length} Attachments`, 'success');
      }

      if (fileTypes.includes('document')) {
        // For document mode, use recordIds as folder IDs (or export all if no IDs)
        log('Resolving Documents…');
        const files = await resolveDocuments([], { ...filterOpts });
        allFiles.push(...files);
        log(`Found ${files.length} Documents`, 'success');
      }

      if (signal.aborted) {
        store.updateProgress({ phase: 'cancelled' });
        return;
      }

      if (allFiles.length === 0) {
        store.updateProgress({
          phase: 'done',
          errorMessage: 'No files found for the selected records and filters.',
        });
        return;
      }

      // Warn if large export
      const totalBytes = allFiles.reduce((sum, f) => sum + (f.contentSize || 0), 0);
      const estimatedGb = totalBytes / (1024 * 1024 * 1024);
      if (estimatedGb > 0.5) {
        log(`⚠️ Large export: ~${estimatedGb.toFixed(1)} GB estimated`, 'warn');
      }

      store.setFiles(allFiles);
      log(`Total: ${allFiles.length} files to download`, 'success');

      // ── Phase 4: Download files ──────────────────────────────────────────
      store.updateProgress({ phase: 'downloading' });

      const progressCallbacks = {
        onProgress: (update: Partial<import('../../types/export').ExportProgress>) =>
          store.updateProgress(update),
        onFileStatus: (fileId: string, status: 'downloading' | 'done' | 'error', errorMsg?: string) =>
          store.updateFileStatus(fileId, status, errorMsg),
      };

      if (config.downloadMethod === 'individual') {
        log(dirHandle ? `Saving files to chosen folder…` : 'Saving files individually…');
        await downloadFilesIndividually(allFiles, {
          naming: config.naming,
          signal,
          dirHandle,
          ...progressCallbacks,
        });
      } else {
        log('Building ZIP…');
        await buildAndDownloadZip(allFiles, {
          naming: config.naming,
          signal,
          ...progressCallbacks,
        });
      }

      if (signal.aborted) {
        store.updateProgress({ phase: 'cancelled' });
        return;
      }

      store.updateProgress({ phase: 'done' });
      log(
        config.downloadMethod === 'individual'
          ? 'All files saved!'
          : 'Export complete! ZIP downloaded.',
        'success'
      );
    } catch (err) {
      if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        store.updateProgress({ phase: 'cancelled' });
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      store.updateProgress({ phase: 'error', errorMessage: message });
      log(`Fatal error: ${message}`, 'error');
    }
  }, [navigate, store]);

  return { runExport };
}
