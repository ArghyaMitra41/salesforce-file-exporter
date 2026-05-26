import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { getQueryableObjects, describeObject } from '../../../lib/salesforce/objects';
import type { ObjectFieldFilter } from '../../../types/export';

interface Props {
  objectName: string;
  filters: ObjectFieldFilter[];
  onObjectChange: (name: string) => void;
  onFiltersChange: (filters: ObjectFieldFilter[]) => void;
}

const OPERATORS = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '≠' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
] as const;

export default function ObjectExport({ objectName, filters, onObjectChange, onFiltersChange }: Props) {
  const [search, setSearch] = useState('');

  const { data: objects } = useQuery({
    queryKey: ['sf-objects'],
    queryFn: getQueryableObjects,
    staleTime: 5 * 60 * 1000,
  });

  const { data: describe } = useQuery({
    queryKey: ['sf-describe', objectName],
    queryFn: () => describeObject(objectName),
    enabled: !!objectName,
    staleTime: 5 * 60 * 1000,
  });

  const filterableFields = describe?.fields.filter((f) => f.filterable) || [];

  const filteredObjects = objects?.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  const addFilter = () => {
    onFiltersChange([
      ...filters,
      { field: filterableFields[0]?.name || 'Name', operator: 'equals', value: '' },
    ]);
  };

  const updateFilter = (i: number, update: Partial<ObjectFieldFilter>) => {
    onFiltersChange(filters.map((f, idx) => (idx === i ? { ...f, ...update } : f)));
  };

  const removeFilter = (i: number) => {
    onFiltersChange(filters.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Salesforce Object</label>
        <input
          className="input mb-2"
          placeholder="Search objects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="relative">
          <select
            className="input appearance-none pr-8"
            value={objectName}
            onChange={(e) => { onObjectChange(e.target.value); onFiltersChange([]); }}
          >
            <option value="">— Select an object —</option>
            {filteredObjects?.map((o) => (
              <option key={o.name} value={o.name}>{o.label} ({o.name})</option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {objectName && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Filters <span className="text-xs font-normal text-gray-400">(optional)</span></label>
            <button type="button" onClick={addFilter} className="btn-secondary text-xs py-1 px-2">
              <PlusIcon className="h-3 w-3" />
              Add filter
            </button>
          </div>

          {filters.length === 0 && (
            <p className="text-xs text-gray-400">No filters — all records will be exported.</p>
          )}

          <div className="space-y-2">
            {filters.map((f, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select
                  className="input flex-1 text-xs py-1.5"
                  value={f.field}
                  onChange={(e) => updateFilter(i, { field: e.target.value })}
                >
                  {filterableFields.map((field) => (
                    <option key={field.name} value={field.name}>{field.label}</option>
                  ))}
                </select>
                <select
                  className="input w-28 text-xs py-1.5"
                  value={f.operator}
                  onChange={(e) => updateFilter(i, { operator: e.target.value as ObjectFieldFilter['operator'] })}
                >
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
                <input
                  className="input flex-1 text-xs py-1.5"
                  placeholder="value"
                  value={f.value}
                  onChange={(e) => updateFilter(i, { value: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeFilter(i)}
                  className="text-gray-400 hover:text-red-500 flex-shrink-0"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
