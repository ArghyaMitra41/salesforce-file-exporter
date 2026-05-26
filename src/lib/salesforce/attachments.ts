/**
 * Legacy Salesforce Attachment object API helpers.
 */

import type { SFAttachment } from '../../types/salesforce';
import type { FileRecord } from '../../types/export';
import { queryAllFlat, chunk, toInClause } from './query';

const CHUNK_SIZE = 200;

/** Resolve Attachment file records from a list of parent record IDs */
export async function resolveAttachments(
  parentIds: string[],
  options: {
    dateStart?: string;
    dateEnd?: string;
    extensions?: string[];
    signal?: AbortSignal;
  } = {}
): Promise<FileRecord[]> {
  if (parentIds.length === 0) return [];

  const fileRecords: FileRecord[] = [];
  const idChunks = chunk(parentIds, CHUNK_SIZE);

  for (const idChunk of idChunks) {
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    let dateFilter = '';
    if (options.dateStart) dateFilter += ` AND LastModifiedDate >= ${options.dateStart}T00:00:00Z`;
    if (options.dateEnd) dateFilter += ` AND LastModifiedDate <= ${options.dateEnd}T23:59:59Z`;

    const soql = `
      SELECT Id, Name, ParentId, BodyLength, ContentType, CreatedDate, LastModifiedDate
      FROM Attachment
      WHERE ParentId IN ${toInClause(idChunk)}
        ${dateFilter}
      ORDER BY LastModifiedDate DESC
    `;

    const attachments = await queryAllFlat<SFAttachment>(soql, options.signal);

    for (const att of attachments) {
      // Filter by extension if specified
      if (options.extensions && options.extensions.length > 0) {
        const ext = att.Name.split('.').pop()?.toLowerCase() || '';
        if (!options.extensions.map((e) => e.toLowerCase()).includes(ext)) continue;
      }

      const nameParts = att.Name.split('.');
      const ext = nameParts.length > 1 ? nameParts.pop() || '' : '';
      const title = nameParts.join('.');

      fileRecords.push({
        id: att.Id,
        sourceType: 'attachment',
        title: title || att.Name,
        extension: ext,
        contentSize: att.BodyLength,
        parentId: att.ParentId,
        createdDate: att.CreatedDate,
        lastModifiedDate: att.LastModifiedDate,
        downloadPath: `/sobjects/Attachment/${att.Id}/Body`,
        status: 'pending',
      });
    }
  }

  return fileRecords;
}
