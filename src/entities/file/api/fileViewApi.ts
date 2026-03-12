import { request } from '../../../shared/lib/http/api';
import type { ApiEnvelope } from '../../article/api/articleApi';
import type { FileVariant } from '../../../shared/lib/files';

export interface FileViewTicketResponse {
  viewUrl: string;
  expiresInSec: number;
  protectedFile: boolean;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const issueFileViewUrl = async (fileId: number, variant?: FileVariant | null) => {
  const query = new URLSearchParams();
  if (variant && variant !== 'medium') {
    query.set('variant', variant);
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  const response = await request<ApiEnvelope<FileViewTicketResponse>>(`/files/${fileId}/view-ticket${suffix}`, {
    method: 'POST',
  });
  return unwrap(response);
};

export { issueFileViewUrl };
