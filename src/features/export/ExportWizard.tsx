import { useState } from 'react';
import {
  DocumentTextIcon,
  CodeBracketIcon,
  TableCellsIcon,
  FunnelIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import type { ExportConfig, ExportMode, FileSourceType, FileNamingStrategy, ObjectFieldFilter } from '../../types/export';
import CsvExport from './modes/CsvExport';
import SoqlExport from './modes/SoqlExport';
import ListViewExport from './modes/ListViewExport';
import ObjectExport from './modes/ObjectExport';
import FileNamingOptions from './FileNamingOptions';
import { useExportJob } from './useExportJob';

const MODES: { value: ExportMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'csv',
    label: 'CSV / Paste IDs',
    description: 'Upload a CSV or paste a list of Salesforce Record IDs',
    icon: <DocumentTextIcon className="h-6 w-6" />,
  },
  {
    value: 'soql',
    label: 'SOQL Query',
    description: 'Write a SOQL query to select records',
    icon: <CodeBracketIcon className="h-6 w-6" />,
  },
  {
    value: 'listview',
    label: 'List View',
    description: 'Export files from a Salesforce List View',
    icon: <TableCellsIcon className="h-6 w-6" />,
  },
  {
    value: 'object',
    label: 'Browse Object',
    description: 'Pick an object and filter by field values',
    icon: <FunnelIcon className="h-6 w-6" />,
  },
];

const FILE_TYPES: { value: FileSourceType; label: string; description: string }[] = [
  { value: 'content', label: 'Files (ContentDocument)', description: 'Modern Salesforce Files' },
  { value: 'attachment', label: 'Attachments', description: 'Legacy Attachment object' },
  { value: 'document', label: 'Documents', description: 'Legacy Document object' },
];

const STEPS = ['Mode', 'Configure', 'Files & Filters', 'Naming', 'Review'];

export default function ExportWizard() {
  const { runExport } = useExportJob();
  const [step, setStep] = useState(0);

  // Config state
  const [mode, setMode] = useState<ExportMode>('csv');
  const [csvIds, setCsvIds] = useState<string[]>([]);
  const [soqlQuery, setSoqlQuery] = useState('SELECT Id FROM Account LIMIT 100');
  const [objectName, setObjectName] = useState('');
  const [listViewId, setListViewId] = useState('');
  const [objectFilters, setObjectFilters] = useState<ObjectFieldFilter[]>([]);
  const [fileTypes, setFileTypes] = useState<FileSourceType[]>(['content']);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [extensions, setExtensions] = useState('');
  const [naming, setNaming] = useState<FileNamingStrategy>('original');

  const toggleFileType = (ft: FileSourceType) => {
    setFileTypes((prev) =>
      prev.includes(ft) ? prev.filter((t) => t !== ft) : [...prev, ft]
    );
  };

  const canProceed = (): boolean => {
    if (step === 0) return true;
    if (step === 1) {
      if (mode === 'csv') return csvIds.length > 0;
      if (mode === 'soql') return soqlQuery.trim().length > 10;
      if (mode === 'listview') return !!objectName && !!listViewId;
      if (mode === 'object') return !!objectName;
    }
    if (step === 2) return fileTypes.length > 0;
    return true;
  };

  const handleStart = () => {
    const extArr = extensions
      .split(/[,\s]+/)
      .map((e) => e.trim().replace(/^\./, '').toLowerCase())
      .filter(Boolean);

    const config: ExportConfig = {
      mode,
      filter: {
        fileTypes,
        dateRange: dateStart || dateEnd ? { start: dateStart || undefined, end: dateEnd || undefined } : undefined,
        fileExtensions: extArr.length > 0 ? extArr : undefined,
      },
      naming,
      csvRecordIds: mode === 'csv' ? csvIds : undefined,
      soqlQuery: mode === 'soql' ? soqlQuery : undefined,
      objectName: ['listview', 'object'].includes(mode) ? objectName : undefined,
      listViewId: mode === 'listview' ? listViewId : undefined,
      objectFilters: mode === 'object' ? objectFilters : undefined,
    };

    runExport(config);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Step indicator */}
      <nav className="flex gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full ${
              i < step ? 'bg-blue-600' : i === step ? 'bg-blue-400' : 'bg-gray-200'
            }`}
          />
        ))}
      </nav>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}</span>
        <span className="text-xs font-medium text-gray-600">{STEPS[step]}</span>
      </div>

      <div className="card p-6 mt-3">
        {/* Step 0: Choose mode */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">How would you like to select records?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`text-left p-4 rounded-lg border transition-colors ${
                    mode === m.value
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`mb-2 ${mode === m.value ? 'text-blue-600' : 'text-gray-500'}`}>
                    {m.icon}
                  </div>
                  <p className="font-medium text-sm text-gray-800">{m.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Configure mode */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {MODES.find((m) => m.value === mode)?.label}
            </h2>
            {mode === 'csv' && <CsvExport onChange={setCsvIds} />}
            {mode === 'soql' && <SoqlExport value={soqlQuery} onChange={setSoqlQuery} />}
            {mode === 'listview' && (
              <ListViewExport
                objectName={objectName}
                listViewId={listViewId}
                onObjectChange={setObjectName}
                onListViewChange={setListViewId}
              />
            )}
            {mode === 'object' && (
              <ObjectExport
                objectName={objectName}
                filters={objectFilters}
                onObjectChange={setObjectName}
                onFiltersChange={setObjectFilters}
              />
            )}
          </div>
        )}

        {/* Step 2: File types & date filter */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Which file types to export?</h2>
              <div className="space-y-2">
                {FILE_TYPES.map((ft) => (
                  <label
                    key={ft.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      fileTypes.includes(ft.value)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 rounded"
                      checked={fileTypes.includes(ft.value)}
                      onChange={() => toggleFileType(ft.value)}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{ft.label}</p>
                      <p className="text-xs text-gray-500">{ft.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Date Range <span className="text-xs font-normal text-gray-400">(optional)</span></h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">From</label>
                  <input type="date" className="input text-sm" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">To</label>
                  <input type="date" className="input text-sm" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label className="label">File Extensions <span className="text-xs font-normal text-gray-400">(optional)</span></label>
              <input
                className="input"
                placeholder="pdf, docx, xlsx (leave blank for all)"
                value={extensions}
                onChange={(e) => setExtensions(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 3: File naming */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">File naming in ZIP</h2>
            <FileNamingOptions value={naming} onChange={setNaming} />
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Review & Start Export</h2>
            <dl className="space-y-3 text-sm">
              <ReviewRow label="Mode" value={MODES.find((m) => m.value === mode)?.label || mode} />
              {mode === 'csv' && <ReviewRow label="Record IDs" value={`${csvIds.length} IDs`} />}
              {mode === 'soql' && <ReviewRow label="SOQL" value={<code className="text-xs bg-gray-100 px-1 rounded">{soqlQuery.substring(0, 80)}{soqlQuery.length > 80 ? '…' : ''}</code>} />}
              {mode === 'listview' && <ReviewRow label="Object / List View" value={`${objectName} / ${listViewId}`} />}
              {mode === 'object' && <ReviewRow label="Object" value={`${objectName}${objectFilters.length > 0 ? ` (${objectFilters.length} filter${objectFilters.length !== 1 ? 's' : ''})` : ''}`} />}
              <ReviewRow label="File types" value={fileTypes.join(', ')} />
              <ReviewRow label="Date range" value={dateStart || dateEnd ? `${dateStart || '—'} → ${dateEnd || '—'}` : 'All time'} />
              <ReviewRow label="Extensions" value={extensions || 'All'} />
              <ReviewRow label="File naming" value={naming} />
            </dl>

            <div className="mt-5 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
              Files will be downloaded directly from Salesforce to your browser and bundled into a ZIP.
              Large exports (hundreds of files) may take several minutes.
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        {step > 0 ? (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary">
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>
        ) : (
          <div />
        )}

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="btn-primary"
            disabled={!canProceed()}
          >
            Next
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            className="btn-primary"
            disabled={fileTypes.length === 0}
          >
            Start Export
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-800 font-medium text-right">{value}</dd>
    </div>
  );
}
