import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { getQueryableObjects } from '../../../lib/salesforce/objects';
import { getListViews } from '../../../lib/salesforce/listViews';

interface Props {
  objectName: string;
  listViewId: string;
  onObjectChange: (name: string) => void;
  onListViewChange: (id: string) => void;
}

export default function ListViewExport({ objectName, listViewId, onObjectChange, onListViewChange }: Props) {
  const [objectSearch, setObjectSearch] = useState('');

  const { data: objects, isLoading: objectsLoading } = useQuery({
    queryKey: ['sf-objects'],
    queryFn: getQueryableObjects,
    staleTime: 5 * 60 * 1000,
  });

  const { data: listViews, isLoading: viewsLoading } = useQuery({
    queryKey: ['sf-listviews', objectName],
    queryFn: () => getListViews(objectName),
    enabled: !!objectName,
    staleTime: 60 * 1000,
  });

  const filteredObjects = objects?.filter((o) =>
    o.label.toLowerCase().includes(objectSearch.toLowerCase()) ||
    o.name.toLowerCase().includes(objectSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Salesforce Object</label>
        <input
          className="input mb-2"
          type="text"
          placeholder="Search objects…"
          value={objectSearch}
          onChange={(e) => setObjectSearch(e.target.value)}
        />
        <div className="relative">
          <select
            className="input appearance-none pr-8"
            value={objectName}
            onChange={(e) => {
              onObjectChange(e.target.value);
              onListViewChange('');
            }}
          >
            <option value="">— Select an object —</option>
            {objectsLoading && <option disabled>Loading…</option>}
            {filteredObjects?.map((o) => (
              <option key={o.name} value={o.name}>
                {o.label} ({o.name})
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {objectName && (
        <div>
          <label className="label">List View</label>
          <div className="relative">
            <select
              className="input appearance-none pr-8"
              value={listViewId}
              onChange={(e) => onListViewChange(e.target.value)}
              disabled={viewsLoading}
            >
              <option value="">— Select a list view —</option>
              {viewsLoading && <option disabled>Loading list views…</option>}
              {listViews?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
              {listViews?.length === 0 && <option disabled>No SOQL-compatible list views found</option>}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {listViews?.length === 0 && !viewsLoading && (
            <p className="text-xs text-amber-600 mt-1">
              No list views found. Try a different object or use SOQL mode.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
