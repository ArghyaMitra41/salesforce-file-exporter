import type { FileNamingStrategy } from '../../types/export';

const OPTIONS: { value: FileNamingStrategy; label: string; description: string }[] = [
  {
    value: 'original',
    label: 'Original filename',
    description: 'e.g. Contract.pdf',
  },
  {
    value: 'id-prefix',
    label: 'Record ID prefix',
    description: 'e.g. 0014H000003kABCQAM_Contract.pdf',
  },
  {
    value: 'folder-per-record',
    label: 'Folder per record',
    description: 'Creates a subfolder per parent record ID',
  },
  {
    value: 'id-only',
    label: 'Record ID only',
    description: 'e.g. 068XXXXXXXXXXXXXXXXX.pdf',
  },
];

interface Props {
  value: FileNamingStrategy;
  onChange: (v: FileNamingStrategy) => void;
}

export default function FileNamingOptions({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      {OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            value === opt.value
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <input
            type="radio"
            name="naming"
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="mt-0.5 h-4 w-4 text-blue-600"
          />
          <div>
            <p className="text-sm font-medium text-gray-800">{opt.label}</p>
            <p className="text-xs text-gray-500">{opt.description}</p>
          </div>
        </label>
      ))}
    </div>
  );
}
