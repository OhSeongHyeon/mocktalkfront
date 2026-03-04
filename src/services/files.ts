import { cancelUploadSession, completeUpload, initUpload, uploadBinary, uploadBinaryTask } from './uploadSession';
import type { UploadPurpose } from './uploadSession';

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

const resolveEditorPurpose = (file: File): UploadPurpose => {
  const contentType = file.type.toLowerCase();
  if (contentType.startsWith('image/')) {
    return 'EDITOR_IMAGE';
  }
  if (contentType === 'video/mp4' || contentType === 'video/webm') {
    return 'EDITOR_VIDEO';
  }
  throw new Error('이미지 또는 MP4/WebM 영상만 업로드할 수 있습니다.');
};

const ensureFileResponse = (response: { file: FileResponse | null }) => {
  if (!response.file) {
    throw new Error('파일 업로드 완료 응답이 올바르지 않습니다.');
  }
  return response.file;
};

const safeCancelSession = async (uploadToken: string | null) => {
  if (!uploadToken) {
    return;
  }
  try {
    await cancelUploadSession(uploadToken);
  } catch {
    // 취소 요청 실패는 주 오류를 덮지 않도록 무시한다.
  }
};

const uploadEditorFile = async (file: File, options?: { preserveMetadata?: boolean }) => {
  const purpose = resolveEditorPurpose(file);
  const init = await initUpload({
    purpose,
    originalFileName: file.name,
    contentType: file.type || 'application/octet-stream',
    fileSize: file.size,
    context: {
      preserveMetadata: Boolean(options?.preserveMetadata),
    },
  });

  try {
    await uploadBinary(init.uploadUrl, file, init.headers);
    const completed = await completeUpload<FileResponse>(init.uploadToken);
    return ensureFileResponse(completed);
  } catch (error) {
    await safeCancelSession(init.uploadToken);
    throw error;
  }
};

const uploadArticleAttachmentFile = async (file: File, options?: { preserveMetadata?: boolean }) => {
  const init = await initUpload({
    purpose: 'ARTICLE_ATTACHMENT',
    originalFileName: file.name,
    contentType: file.type || 'application/octet-stream',
    fileSize: file.size,
    context: {
      preserveMetadata: Boolean(options?.preserveMetadata),
    },
  });

  try {
    await uploadBinary(init.uploadUrl, file, init.headers);
    const completed = await completeUpload<FileResponse>(init.uploadToken);
    return ensureFileResponse(completed);
  } catch (error) {
    await safeCancelSession(init.uploadToken);
    throw error;
  }
};

const uploadEditorFileTask = (
  file: File,
  options?: {
    preserveMetadata?: boolean;
    onProgress?: (payload: UploadProgressPayload) => void;
  },
): UploadTaskHandle<FileResponse> => {
  let uploadToken: string | null = null;
  let canceled = false;
  let cancelBinaryUpload: (() => void) | null = null;

  const promise = (async () => {
    const init = await initUpload({
      purpose: resolveEditorPurpose(file),
      originalFileName: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size,
      context: {
        preserveMetadata: Boolean(options?.preserveMetadata),
      },
    });
    uploadToken = init.uploadToken;

    if (canceled) {
      await safeCancelSession(uploadToken);
      throw new DOMException('업로드가 취소되었습니다.', 'AbortError');
    }

    const uploadTask = uploadBinaryTask(init.uploadUrl, file, init.headers, (percent) => {
      options?.onProgress?.({
        loaded: Math.round((percent / 100) * file.size),
        total: file.size,
        percent,
      });
    });
    cancelBinaryUpload = uploadTask.cancel;

    try {
      await uploadTask.promise;
      const completed = await completeUpload<FileResponse>(uploadToken);
      options?.onProgress?.({
        loaded: file.size,
        total: file.size,
        percent: 100,
      });
      return ensureFileResponse(completed);
    } catch (error) {
      await safeCancelSession(uploadToken);
      throw error;
    }
  })();

  return {
    promise,
    cancel: () => {
      canceled = true;
      cancelBinaryUpload?.();
      void safeCancelSession(uploadToken);
    },
  };
};

export { uploadArticleAttachmentFile, uploadEditorFile, uploadEditorFileTask };
