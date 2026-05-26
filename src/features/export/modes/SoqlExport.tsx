import { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const EXAMPLES = [
  { label: 'All Accounts', soql: 'SELECT Id FROM Account' },
  { label: 'Accounts modified this year', soql: "SELECT Id FROM Account WHERE LastModifiedDate = THIS_YEAR" },
  { label: 'Opportunities (Closed Won)', soql: "SELECT Id FROM Opportunity WHERE StageName = 'Closed Won'" },
  { label: 'All Contacts', soql: 'SELECT Id FROM Contact' },
];

export default function SoqlExport({ value, onChange }: Props) {
  const [showTips, setShowTips] = useState(false);

  return (
    <div className="space-y-3">
      <div>
        <label className="label">
          SOQL Query
          <span className="text-xs text-gray-400 font-normal ml-1">(must return records with an Id field)</span>
        </label>
        <textarea
          className="input min-h-[120px] font-mono text-sm"
          placeholder="SELECT Id FROM Account WHERE..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-500 self-center">Examples:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => onChange(ex.soql)}
            className="text-xs px-2 py-1 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowTips((v) => !v)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
      >
        <InformationCircleIcon className="h-4 w-4" />
        {showTips ? 'Hide tips' : 'SOQL tips'}
      </button>

      {showTips && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800 space-y-1.5">
          <p>• The query must <strong>SELECT Id</strong> (or a field named Id) to identify which records' files to export.</p>
          <p>• You can filter by any field: <code className="bg-blue-100 px-1 rounded">WHERE CreatedDate = LAST_N_DAYS:30</code></p>
          <p>• Use <code className="bg-blue-100 px-1 rounded">LIMIT 100</code> to test before running large exports.</p>
          <p>• SOQL date literals work: <code className="bg-blue-100 px-1 rounded">THIS_YEAR</code>, <code className="bg-blue-100 px-1 rounded">LAST_MONTH</code>, <code className="bg-blue-100 px-1 rounded">LAST_N_DAYS:7</code></p>
        </div>
      )}
    </div>
  );
}
