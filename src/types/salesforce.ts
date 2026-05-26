// Salesforce REST API response types

export interface SFQueryResult<T> {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: T[];
}

export interface SFTokenResponse {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string; // URL like https://login.salesforce.com/id/{orgId}/{userId}
  token_type: string;
  issued_at: string;
  signature: string;
  scope?: string;
}

export interface SFUserInfo {
  sub: string;
  user_id: string;
  organization_id: string;
  name: string;
  email: string;
  preferred_username: string;
  urls: {
    rest: string;
    sobjects: string;
    query: string;
    metadata: string;
  };
}

export interface SFLimitsResponse {
  DailyApiRequests: { Max: number; Remaining: number };
  [key: string]: { Max: number; Remaining: number };
}

// Content Files (modern Salesforce Files)
export interface SFContentDocumentLink {
  ContentDocumentId: string;
  ContentDocument: {
    Id: string;
    Title: string;
    FileType: string;
    ContentSize: number;
    CreatedDate: string;
    LastModifiedDate: string;
    LatestPublishedVersionId: string;
  };
  LinkedEntityId: string;
}

export interface SFContentVersion {
  Id: string;
  Title: string;
  FileExtension: string;
  ContentSize: number;
  ContentDocumentId: string;
  ContentDocument: {
    Title: string;
    CreatedDate: string;
  };
  IsLatest: boolean;
  CreatedDate: string;
  LastModifiedDate: string;
}

// Legacy Attachment
export interface SFAttachment {
  Id: string;
  Name: string;
  ParentId: string;
  Parent?: { Name?: string };
  BodyLength: number;
  ContentType: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

// Legacy Document
export interface SFDocument {
  Id: string;
  Name: string;
  FolderId: string;
  Folder?: { Name?: string };
  BodyLength: number;
  ContentType: string;
  Type: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

// List Views
export interface SFListView {
  id: string;
  label: string;
  soqlCompatible: boolean;
  url: string;
}

export interface SFListViewsResponse {
  done: boolean;
  listviews: SFListView[];
  nextRecordsUrl?: string;
  size: number;
  sobjectType: string;
  totalSize: number;
}

export interface SFListViewDescribe {
  id: string;
  label: string;
  query: string;
  scope: string;
  sobjectType: string;
  columns: Array<{ fieldNameOrPath: string; label: string; type: string }>;
}

// SObject describe (for object picker)
export interface SFSObjectBasic {
  name: string;
  label: string;
  labelPlural: string;
  queryable: boolean;
  searchable: boolean;
  createable: boolean;
  updateable: boolean;
  custom: boolean;
}

export interface SFGlobalDescribeResult {
  encoding: string;
  maxBatchSize: number;
  sobjects: SFSObjectBasic[];
}

export interface SFDescribeField {
  name: string;
  label: string;
  type: string;
  filterable: boolean;
  sortable: boolean;
  referenceTo?: string[];
}

export interface SFDescribeResult {
  name: string;
  label: string;
  fields: SFDescribeField[];
}

export interface SFApiError {
  message: string;
  errorCode: string;
  fields?: string[];
}
