import { postJson } from '../../../shared/lib/http/api';
import type { ApiEnvelope } from '../../article/api/articleApi';
import type { FileVariant } from '../../../shared/lib/files';

export interface FileViewTicketResponse {
  viewUrl: string;
  expiresInSec: number;
  protectedFile: boolean;
}

export interface FileViewTicketBatchItemRequest {
  fileId: number;
  variant?: FileVariant | null;
}

export interface FileViewTicketBatchItemResponse {
  fileId: number;
  variant: string | null;
  success: boolean;
  viewUrl: string | null;
  expiresInSec: number;
  protectedFile: boolean;
  errorCode: string | null;
}

export interface FileViewTicketBatchResponse {
  items: FileViewTicketBatchItemResponse[];
}

const VIEW_TICKET_BATCH_MAX = 100;

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const batchResultKey = (fileId: number, variant: string | null | undefined) => `${fileId}:${variant ?? ''}`;

const toBatchRequestItem = (fileId: number, variant: FileVariant | null): FileViewTicketBatchItemRequest => {
  if (!variant) {
    return { fileId };
  }
  return { fileId, variant };
};

const issueFileViewUrl = async (fileId: number, variant?: FileVariant | null) => {
  const query = new URLSearchParams();
  if (variant && variant !== 'medium') {
    query.set('variant', variant);
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  const response = await postJson<ApiEnvelope<FileViewTicketResponse>>(`/files/${fileId}/view-ticket${suffix}`);
  return unwrap(response);
};

const issueFileViewTicketsBatch = async (items: FileViewTicketBatchItemRequest[]) => {
  if (items.length === 0) {
    return new Map<string, FileViewTicketBatchItemResponse>();
  }

  const results = new Map<string, FileViewTicketBatchItemResponse>();

  for (let offset = 0; offset < items.length; offset += VIEW_TICKET_BATCH_MAX) {
    const chunk = items.slice(offset, offset + VIEW_TICKET_BATCH_MAX);
    const response = await postJson<ApiEnvelope<FileViewTicketBatchResponse>>('/files/view-tickets', { items: chunk });
    const data = unwrap(response);
    for (const row of data.items) {
      results.set(batchResultKey(row.fileId, row.variant), row);
    }
  }

  return results;
};

export { VIEW_TICKET_BATCH_MAX, batchResultKey, issueFileViewTicketsBatch, issueFileViewUrl, toBatchRequestItem };
