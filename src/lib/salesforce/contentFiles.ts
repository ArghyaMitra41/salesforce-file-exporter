/**
 * Salesforce ContentDocument/ContentVersion (modern Files) API helpers.
 */

import type { SFContentDocumentLink, SFContentVersion } from '../../types/salesforce';
import type { FileRecord } from '../../types/export';
import { queryAllFlat, chunk, toInClause } from './query';

const CHUNK_SIZE = 200;

/** Resolve ContentVersion file records from a list of parent record IDs */
export async function resolveContentFiles(
  parentIds: string[],
  options: {
    dateStart?: string;
    dateEnd?: string;
    extensions?: string[];
    signal?: AbortSignal;
  } = {}
): Promise<FileRecord[]> {
  if (parentIds.length === 0) return [];

  // Step 1: Get ContentDocumentLinks for all parent IDs
  const allDocIds = new Set<string>();
  const docIdToParent = new Map<string, { parentId: string }>();

  const idChunks = chunk(parentIds, CHUNK_SIZE);
  for (const idChunk of idChunks) {
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const soql = `
      SELECT ContentDocumentId, LinkedEntityId
      FROM ContentDocumentLink
      WHERE LinkedEntityId IN ${toInClause(idChunk)}
    `;
    const links = await queryAllFlat<SFContentDocumentLink>(soql, options.signal);
    for (const link of links) {
      allDocIds.add(link.ContentDocumentId);
      if (!docIdToParent.has(link.ContentDocumentId)) {
        docIdToParent.set(link.ContentDocumentId, { parentId: link.LinkedEntityId });
      }
    }
  }

  if (allDocIds.size === 0) return [];

  // Step 2: Get latest ContentVersion for all document IDs
  const docIdChunks = chunk([...allDocIds], CHUNK_SIZE);
  const fileRecords: FileRecord[] = [];

  for (const docChunk of docIdChunks) {
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    let dateFilter = '';
    if (options.dateStart) dateFilter += ` AND LastModifiedDate >= ${options.dateStart}T00:00:00Z`;
    if (options.dateEnd) dateFilter += ` AND LastModifiedDate <= ${options.dateEnd}T23:59:59Z`;

    let extFilter = '';
    if (options.extensions && options.extensions.length > 0) {
      const exts = options.extensions.map((e) => `'${e.toLowerCase()}'`).join(',');
      extFilter = ` AND FileExtension IN (${exts})`;
    }

    const soql = `
      SELECT Id, Title, FileExtension, ContentSize, ContentDocumentId,
             CreatedDate, LastModifiedDate
      FROM ContentVersion
      WHERE ContentDocumentId IN ${toInClause(docChunk)}
        AND IsLatest = true
        ${dateFilter}
        ${extFilter}
    `;
    const versions = await queryAllFlat<SFContentVersion>(soql, options.signal);

    for (const v of versions) {
      const parent = docIdToParent.get(v.ContentDocumentId);
      fileRecords.push({
        id: v.Id,
        sourceType: 'content',
        title: v.Title,
        extension: v.FileExtension || '',
        contentSize: v.ContentSize,
        parentId: parent?.parentId,
        createdDate: v.CreatedDate,
        lastModifiedDate: v.LastModifiedDate,
        downloadPath: `/sobjects/ContentVersion/${v.Id}/VersionData`,
        contentDocumentId: v.ContentDocumentId,
        status: 'pending',
      });
    }
  }

  return fileRecords;
}
