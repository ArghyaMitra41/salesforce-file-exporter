import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { parseRecordIdCsv, parseIdsFromText } from '../../../lib/utils/csvParser';

interface Props {
  onChange: (ids: string[]) => void;
}

export default function CsvExport({ onChange }: Props) {
  const [pasteText, setPasteText] = useState('');
  const [parseResult, setParseResult] = useState<{ ids: string[]; errors: string[]; totalRows: number } | null>(null);
  const [fileName, setFileName] = useState('');

  const processText = useCallback((text: string, isCsv: boolean, name = '') => {
    const result = isCsv ? parseRecordIdCsv(text) : parseIdsFromText(text);
    setParseResult(result);
    setFileName(name);
    onChange(result.ids);
  }, [onChange]);

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processText(text, file.name.endsWith('.csv'), file.name);
    };
    reader.readAsText(file);
  }, [processText]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  });

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPasteText(text);
    if (text.trim()) {
      processText(text, text.includes(',') && text.includes('\n'), '');
    } else {
      setParseResult(null);
      onChange([]);
    }
  };

  const reset = () => {
    setPasteText('');
    setParseResult(null);
    setFileName('');
    onChange([]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Upload a CSV file</h3>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <DocumentArrowUpIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            {isDragActive ? 'Drop the file here' : 'Drag & drop a CSV/TXT, or click to browse'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            CSV should have a column named "Id" or "Record ID". First column is used if not found.
          </p>
        </div>
      </div>

      <div className="relative">
        <p className="text-xs text-gray-500 text-center mb-2">— or paste IDs directly —</p>
        <textarea
          className="input min-h-[100px] font-mono text-xs"
          placeholder="0014H000003kABCQAM&#10;0034H000005xDEFGAM&#10;..."
          value={pasteText}
          onChange={handlePaste}
        />
      </div>

      {parseResult && (
        <div className={`rounded-lg p-3 text-sm ${
          parseResult.ids.length > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-gray-800">
              {fileName && <span className="text-gray-500 mr-1">{fileName}:</span>}
              {parseResult.ids.length} valid record ID{parseResult.ids.length !== 1 ? 's' : ''} found
              {parseResult.totalRows > 0 && ` (${parseResult.totalRows} rows)`}
            </span>
            <button onClick={reset} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          {parseResult.errors.length > 0 && (
            <div className="mt-2 text-xs text-amber-700">
              <p className="font-medium">{parseResult.errors.length} warnings:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {parseResult.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {parseResult.errors.length > 5 && (
                  <li>…and {parseResult.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
