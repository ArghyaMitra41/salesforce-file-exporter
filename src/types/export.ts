// Export domain types

export type ExportMode = 'csv' | 'soql' | 'listview' | 'object';
export type FileSourceType = 'content' | 'attachment' | 'document';

export type ExportPhase =
  | 'idle'
  | 'resolving'
  | 'collecting'
  | 'downloading'
  | 'zipping'
  | 'done'
  | 'cancelled'
  | 'error';

export type FileStatus = 'pending' | 'downloading' | 'done' | 'error' | 'skipped';

export type FileNamingStrategy = 'original' | 'id-prefix' | 'id-only' | 'folder-per-record';

/** How files are delivered to the user */
export type DownloadMethod = 'individual' | 'zip';

export interface DateRangeFilter {
  start?: string; // ISO date string
  end?: string;
}

export interface ExportFilter {
  dateRange?: DateRangeFilter;
  fileExtensions?: string[]; // e.g. ['pdf','docx']
  fileTypes: FileSourceType[]; // which SF object types to include
}

export interface ExportConfig {
  mode: ExportMode;
  filter: ExportFilter;
  naming: FileNamingStrategy;
  downloadMethod: DownloadMethod;
  includeSubfolders?: boolean;
  // mode-specific config
  csvRecordIds?: string[];
  soqlQuery?: string;
  objectName?: string;
  listViewId?: string;
  recordId?: string; // single record
  objectFilters?: ObjectFieldFilter[];
}

export interface ObjectFieldFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'greater_than' | 'less_than';
  value: string;
}

export interface FileRecord {
  id: string; // ContentVersion Id / Attachment Id / Document Id
  sourceType: FileSourceType;
  title: string;
  extension: string;
  contentSize: number;
  parentId?: string;
  parentName?: string;
  createdDate: string;
  lastModifiedDate: string;
  downloadPath: string; // relative SF API path for blob download
  contentDocumentId?: string; // for dedup
  status: FileStatus;
  errorMessage?: string;
}

export interface ExportJob {
  id: string;
  config: ExportConfig;
  createdAt: string;
  abortController: AbortController;
}

export interface ExportProgress {
  phase: ExportPhase;
  totalFiles: number;
  completedFiles: number;
  errorFiles: number;
  totalBytes: number;
  downloadedBytes: number;
  currentFileName?: string;
  errorMessage?: string; // fatal error
  log: string[];
}

export interface ExportError {
  fileId: string;
  fileName: string;
  error: string;
}
