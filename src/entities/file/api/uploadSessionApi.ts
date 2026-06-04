import { translate } from '../../../shared/i18n/translate';
import { request } from '../../../shared/lib/http/api';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: unknown;
}

type UploadPurpose = 'EDITOR_IMAGE' | 'EDITOR_VIDEO' | 'ARTICLE_ATTACHMENT' | 'BOARD_IMAGE' | 'PROFILE_IMAGE';
type BoardImageUploadChannel = 'BOARD_OWNER' | 'ADMIN_BOARD' | 'BOARD_SETTINGS_ADMIN';

interface UploadInitContext {
  boardId?: number;
  channel?: BoardImageUploadChannel;
  preserveMetadata?: boolean;
}

interface UploadInitRequest {
  purpose: UploadPurpose;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  context?: UploadInitContext;
}

interface UploadInitResponse {
  uploadToken: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
}

interface UploadCompleteRequest {
  uploadToken: string;
}

export interface UploadCompleteResponse<TFile = unknown, TBoard = unknown, TUserProfile = unknown> {
  purpose: UploadPurpose;
  file: TFile | null;
  board: TBoard | null;
  userProfile: TUserProfile | null;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const initUpload = async (payload: UploadInitRequest) => {
  const response = await request<ApiEnvelope<UploadInitResponse>>('/uploads/init', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const completeUpload = async <TFile = unknown, TBoard = unknown, TUserProfile = unknown>(uploadToken: string) => {
  const payload: UploadCompleteRequest = { uploadToken };
  const response = await request<ApiEnvelope<UploadCompleteResponse<TFile, TBoard, TUserProfile>>>('/uploads/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const cancelUploadSession = async (uploadToken: string) => {
  await request<ApiEnvelope<void>>(`/uploads/${encodeURIComponent(uploadToken)}`, {
    method: 'DELETE',
  });
};

const uploadBinary = async (uploadUrl: string, file: File, headers: Record<string, string>) => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: file,
  });
  if (!response.ok) {
    throw new Error(translate('editor.file.uploadFailed'));
  }
};

const uploadBinaryTask = (uploadUrl: string, file: File, headers: Record<string, string>, onProgress?: (percent: number) => void) => {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<void>((resolve, reject) => {
    xhr.open('PUT', uploadUrl);

    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return;
      }
      const percent = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
      onProgress(percent);
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(translate('editor.file.uploadFailed')));
        return;
      }
      onProgress?.(100);
      resolve();
    };

    xhr.onerror = () => {
      reject(new Error(translate('editor.file.uploadFailed')));
    };

    xhr.onabort = () => {
      reject(new DOMException(translate('editor.file.uploadCancelled'), 'AbortError'));
    };

    xhr.send(file);
  });

  return {
    promise,
    cancel: () => xhr.abort(),
  };
};

export { cancelUploadSession, completeUpload, initUpload, uploadBinary, uploadBinaryTask };
export type { BoardImageUploadChannel, UploadInitContext, UploadInitResponse, UploadPurpose };
