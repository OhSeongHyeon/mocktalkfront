import { request } from '../lib/api';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: unknown;
}

export interface FileResponse {
  id: number;
  fileClassId: number;
  fileName: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface UserMentionResponse {
  userId: number;
  handle: string;
  displayName: string;
  profileImage: FileResponse | null;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const searchMentions = async (keyword: string, size = 10) => {
  const params = new URLSearchParams({ keyword, size: String(size) });
  const response = await request<ApiEnvelope<UserMentionResponse[]>>(`/users/mentions?${params.toString()}`);
  return unwrap(response);
};

export { searchMentions };
