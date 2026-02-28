import { API_BASE_URL, request } from '../lib/api';
import { getAccessToken } from '../stores/auth';

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

export interface UploadProgressPayload {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadTaskHandle<T> {
  promise: Promise<T>;
  cancel: () => void;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const uploadEditorFile = async (file: File, options?: { preserveMetadata?: boolean }) => {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.preserveMetadata) {
    formData.append('preserveMetadata', 'true');
  }
  const response = await request<ApiEnvelope<FileResponse>>('/files/editor', {
    method: 'POST',
    body: formData,
  });
  return unwrap(response);
};

const uploadArticleAttachmentFile = async (file: File, options?: { preserveMetadata?: boolean }) => {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.preserveMetadata) {
    formData.append('preserveMetadata', 'true');
  }
  const response = await request<ApiEnvelope<FileResponse>>('/files/article-attachments', {
    method: 'POST',
    body: formData,
  });
  return unwrap(response);
};

const buildUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
};

const resolveApiErrorMessage = (error: unknown) => {
  if (typeof error === 'string') {
    return error;
  }
  if (!error || typeof error !== 'object') {
    return '파일 업로드에 실패했습니다.';
  }
  const typed = error as {
    message?: unknown;
    reason?: unknown;
    error?: { reason?: unknown };
  };
  if (typeof typed.message === 'string') {
    return typed.message;
  }
  if (typeof typed.reason === 'string') {
    return typed.reason;
  }
  if (typeof typed.error?.reason === 'string') {
    return typed.error.reason;
  }
  return '파일 업로드에 실패했습니다.';
};

const uploadEditorFileTask = (
  file: File,
  options?: {
    preserveMetadata?: boolean;
    onProgress?: (payload: UploadProgressPayload) => void;
  },
): UploadTaskHandle<FileResponse> => {
  const xhr = new XMLHttpRequest();
  const formData = new FormData();
  formData.append('file', file);
  if (options?.preserveMetadata) {
    formData.append('preserveMetadata', 'true');
  }

  const promise = new Promise<FileResponse>((resolve, reject) => {
    xhr.open('POST', buildUrl('/files/editor'));
    xhr.withCredentials = true;
    xhr.responseType = 'json';

    const accessToken = getAccessToken();
    if (accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !options?.onProgress) {
        return;
      }
      const percent = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
      options.onProgress({
        loaded: event.loaded,
        total: event.total,
        percent,
      });
    };

    xhr.onload = () => {
      const body = xhr.response as ApiEnvelope<FileResponse> | null;
      if (xhr.status < 200 || xhr.status >= 300 || !body || !body.success) {
        reject(new Error(resolveApiErrorMessage(body?.error)));
        return;
      }
      options?.onProgress?.({
        loaded: file.size,
        total: file.size,
        percent: 100,
      });
      resolve(body.data);
    };

    xhr.onerror = () => {
      reject(new Error('파일 업로드에 실패했습니다.'));
    };

    xhr.onabort = () => {
      reject(new DOMException('업로드가 취소되었습니다.', 'AbortError'));
    };

    xhr.send(formData);
  });

  return {
    promise,
    cancel: () => xhr.abort(),
  };
};

export { uploadArticleAttachmentFile, uploadEditorFile, uploadEditorFileTask };
