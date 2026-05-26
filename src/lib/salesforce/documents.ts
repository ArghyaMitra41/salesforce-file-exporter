/**
 * Legacy Salesforce Document object API helpers.
 */

import type { SFDocument } from '../../types/salesforce';
import type { FileRecord } from '../../types/export';
import { queryAllFlat, chunk, toInClause } from './query';

const CHUNK_SIZE = 200;

/**
 * Resolve Document file records from a list of folder IDs.
 * For general export (no specific folder), pass empty array to get all accessible documents.
 */
export async function resolveDocuments(
  folderIds: string[],
  options: {
    dateStart?: string;
    dateEnd?: string;
    signal?: AbortSignal;
  } = {}
): Promise<FileRecord[]> {
  const fileRecords: FileRecord[] = [];

  let dateFilter = '';
  if (options.dateStart) dateFilter += ` AND LastModifiedDate >= ${options.dateStart}T00:00:00Z`;
  if (options.dateEnd) dateFilter += ` AND LastModifiedDate <= ${options.dateEnd}T23:59:59Z`;

  let whereClause = '';
  if (folderIds.length > 0) {
    const chunks = chunk(folderIds, CHUNK_SIZE);
    for (const folderChunk of chunks) {
      if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const soql = `
        SELECT Id, Name, FolderId, BodyLength, ContentType, Type, CreatedDate, LastModifiedDate
        FROM Document
        WHERE FolderId IN ${toInClause(folderChunk)}
          ${dateFilter}
        ORDER BY LastModifiedDate DESC
      `;
      const docs = await queryAllFlat<SFDocument>(soql, options.signal);
      fileRecords.push(...mapDocuments(docs));
    }
  } else {
    // No specific folder — query all
    whereClause = dateFilter ? `WHERE 1=1 ${dateFilter}` : '';
    const soql = `
      SELECT Id, Name, FolderId, BodyLength, ContentType, Type, CreatedDate, LastModifiedDate
      FROM Document
      ${whereClause}
      ORDER BY LastModifiedDate DESC
    `;
    const docs = await queryAllFlat<SFDocument>(soql, options.signal);
    fileRecords.push(...mapDocuments(docs));
  }

  return fileRecords;
}

function mapDocuments(docs: SFDocument[]): FileRecord[] {
  return docs.map((doc) => {
    const nameParts = doc.Name.split('.');
    const ext = nameParts.length > 1 ? nameParts.pop() || doc.Type || '' : doc.Type || '';
    const title = nameParts.join('.');

    return {
      id: doc.Id,
      sourceType: 'document' as const,
      title: title || doc.Name,
      extension: ext,
      contentSize: doc.BodyLength,
      parentId: doc.FolderId,
      createdDate: doc.CreatedDate,
      lastModifiedDate: doc.LastModifiedDate,
      downloadPath: `/sobjects/Document/${doc.Id}/Body`,
      status: 'pending' as const,
    };
  });
}
