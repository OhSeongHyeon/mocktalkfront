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

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const uploadEditorFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request<ApiEnvelope<FileResponse>>('/files/editor', {
    method: 'POST',
    body: formData,
  });
  return unwrap(response);
};

export { uploadEditorFile };
