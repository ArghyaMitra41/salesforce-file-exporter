import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  XCircleIcon,
  DocumentArrowDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useExportStore } from '../export/exportStore';
import { formatFileSize } from '../../lib/zip/fileNaming';
import type { FileRecord } from '../../types/export';

export default function ProgressPage() {
  const navigate = useNavigate();
  const { progress, files, cancelJob, resetJob } = useExportStore();
  const [showLog, setShowLog] = useState(false);

  const isDone = progress.phase === 'done';
  const isError = progress.phase === 'error';
  const isCancelled = progress.phase === 'cancelled';
  const isActive = ['resolving', 'collecting', 'downloading', 'zipping'].includes(progress.phase);

  const pct =
    progress.totalFiles > 0
      ? Math.round((progress.completedFiles / progress.totalFiles) * 100)
      : 0;

  const handleCancel = () => {
    cancelJob();
  };

  const handleNewExport = () => {
    resetJob();
    navigate('/export');
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {isDone && <CheckCircleIcon className="h-6 w-6 text-green-500" />}
          {isError && <ExclamationCircleIcon className="h-6 w-6 text-red-500" />}
          {isCancelled && <XCircleIcon className="h-6 w-6 text-gray-500" />}
          {isActive && <ArrowPathIcon className="h-6 w-6 text-blue-500 animate-spin" />}
          <h1 className="text-xl font-semibold text-gray-900">
            {isDone ? 'Export Complete' :
             isError ? 'Export Failed' :
             isCancelled ? 'Export Cancelled' :
             progress.phase === 'resolving' ? 'Resolving records…' :
             progress.phase === 'collecting' ? 'Collecting file metadata…' :
             progress.phase === 'downloading' ? 'Downloading files…' :
             'Preparing export…'}
          </h1>
        </div>

        {isActive && (
          <button onClick={handleCancel} className="btn-danger text-xs py-1.5 px-3">
            Cancel
          </button>
        )}
      </div>

      {/* Progress card */}
      <div className="card p-5 mb-4">
        {/* Overall progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-gray-600">
              {progress.completedFiles} / {progress.totalFiles || '…'} files
            </span>
            <span className="font-medium text-gray-800">{pct}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isDone ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat
            label="Downloaded"
            value={formatFileSize(progress.downloadedBytes)}
            sub={progress.totalBytes > 0 ? `of ${formatFileSize(progress.totalBytes)}` : undefined}
          />
          <Stat label="Completed" value={String(progress.completedFiles)} sub="files" />
          <Stat
            label="Errors"
            value={String(progress.errorFiles)}
            sub="files"
            valueClass={progress.errorFiles > 0 ? 'text-red-600' : undefined}
          />
        </div>

        {/* Current file */}
        {isActive && progress.currentFileName && (
          <p className="mt-3 text-xs text-gray-500 truncate">
            Downloading: <span className="font-medium text-gray-700">{progress.currentFileName}</span>
          </p>
        )}

        {/* Error message */}
        {(isError || isCancelled) && progress.errorMessage && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {progress.errorMessage}
          </div>
        )}

        {isDone && (
          <div className="mt-3 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-center gap-2">
            <DocumentArrowDownIcon className="h-4 w-4 flex-shrink-0" />
            File has been downloaded to your browser's default download folder.
          </div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-4 py-2.5 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Files ({files.length})
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {files.map((f) => (
              <FileRow key={f.id} file={f} />
            ))}
          </div>
        </div>
      )}

      {/* Log */}
      {progress.log.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <button
            onClick={() => setShowLog((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hover:bg-gray-50"
          >
            Export Log ({progress.log.length} entries)
            {showLog ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </button>
          {showLog && (
            <div className="bg-gray-900 text-gray-300 font-mono text-xs p-3 max-h-48 overflow-y-auto">
              {progress.log.map((entry, i) => (
                <div key={i} className="leading-relaxed">{entry}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button onClick={handleNewExport} className="btn-secondary">
          New Export
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, valueClass }: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-lg font-semibold ${valueClass || 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function FileRow({ file }: { file: FileRecord }) {
  const statusIcon = {
    pending: <span className="h-2 w-2 rounded-full bg-gray-300 inline-block" />,
    downloading: <ArrowPathIcon className="h-3.5 w-3.5 text-blue-500 animate-spin" />,
    done: <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />,
    error: <ExclamationCircleIcon className="h-3.5 w-3.5 text-red-500" />,
    skipped: <XCircleIcon className="h-3.5 w-3.5 text-gray-400" />,
  }[file.status];

  return (
    <div className="flex items-center gap-2.5 px-4 py-2 text-sm">
      <div className="flex-shrink-0">{statusIcon}</div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-gray-800">
          {file.title}{file.extension ? `.${file.extension}` : ''}
        </p>
        {file.errorMessage && (
          <p className="text-xs text-red-600 truncate">{file.errorMessage}</p>
        )}
      </div>
      <div className="flex-shrink-0 text-xs text-gray-400">
        {formatFileSize(file.contentSize)}
      </div>
    </div>
  );
}
