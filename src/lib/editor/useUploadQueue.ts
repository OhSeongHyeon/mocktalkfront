import { computed, onBeforeUnmount, ref } from 'vue';

type UploadKind = 'image' | 'video';
type UploadStatus = 'uploading' | 'success' | 'error' | 'canceled';

interface UploadItem {
  id: string;
  file: File;
  kind: UploadKind;
  progress: number;
  status: UploadStatus;
  message: string;
  cancel?: () => void;
}

interface ImageNaturalSize {
  width: number | null;
  height: number | null;
}

interface UploadTaskHandle<T> {
  promise: Promise<T>;
  cancel: () => void;
}

interface UseUploadQueueOptions<TUploadResult> {
  maxUploadSize: number;
  successAutoRemoveDelayMs: number;
  resolveKind: (file: File) => UploadKind | null;
  createUploadTask: (file: File, onProgress: (percent: number) => void) => UploadTaskHandle<TUploadResult>;
  resolveUploadedUrl: (kind: UploadKind, uploaded: TUploadResult) => string | null;
  resolveImageNaturalSize?: (file: File, url: string) => Promise<ImageNaturalSize | null>;
  onInsertUploadedFile: (kind: UploadKind, url: string, imageNaturalSize: ImageNaturalSize | null) => void;
  onError: (message: string) => void;
  unsupportedFileMessage: string;
  maxSizeExceededMessage: string;
}

const createUploadItem = (file: File, kind: UploadKind): UploadItem => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  file,
  kind,
  progress: 0,
  status: 'uploading',
  message: '업로드 대기',
});

const useUploadQueue = <TUploadResult>(options: UseUploadQueueOptions<TUploadResult>) => {
  const uploads = ref<UploadItem[]>([]);
  const uploadAutoRemoveTimers = new Map<string, ReturnType<typeof window.setTimeout>>();

  const uploadInProgressCount = computed(() => uploads.value.filter((item) => item.status === 'uploading').length);

  const clearUploadAutoRemoveTimer = (id: string) => {
    const timeoutId = uploadAutoRemoveTimers.get(id);
    if (timeoutId === undefined) {
      return;
    }
    window.clearTimeout(timeoutId);
    uploadAutoRemoveTimers.delete(id);
  };

  const scheduleUploadAutoRemove = (id: string) => {
    clearUploadAutoRemoveTimer(id);
    const timeoutId = window.setTimeout(() => {
      uploads.value = uploads.value.filter((item) => item.id !== id);
      uploadAutoRemoveTimers.delete(id);
    }, options.successAutoRemoveDelayMs);
    uploadAutoRemoveTimers.set(id, timeoutId);
  };

  const runUpload = async (item: UploadItem) => {
    clearUploadAutoRemoveTimer(item.id);
    item.status = 'uploading';
    item.progress = 0;
    item.message = '업로드 중';

    const task = options.createUploadTask(item.file, (percent) => {
      item.progress = percent;
    });
    item.cancel = task.cancel;

    try {
      const uploaded = await task.promise;
      const url = options.resolveUploadedUrl(item.kind, uploaded);
      if (!url) {
        item.status = 'error';
        item.message = '파일 URL 생성 실패';
        return;
      }
      const imageNaturalSize =
        item.kind === 'image' ? ((await options.resolveImageNaturalSize?.(item.file, url)) ?? { width: null, height: null }) : null;
      options.onInsertUploadedFile(item.kind, url, imageNaturalSize);
      item.status = 'success';
      item.progress = 100;
      item.message = '업로드 완료';
      scheduleUploadAutoRemove(item.id);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        item.status = 'canceled';
        item.message = '업로드 취소';
        return;
      }
      item.status = 'error';
      item.message = error instanceof Error ? error.message : '파일 업로드 실패';
    } finally {
      item.cancel = undefined;
    }
  };

  const handleFiles = async (files: File[]) => {
    const uploadTargets: UploadItem[] = [];
    for (const file of files) {
      const kind = options.resolveKind(file);
      if (!kind) {
        options.onError(options.unsupportedFileMessage);
        continue;
      }
      if (file.size > options.maxUploadSize) {
        options.onError(options.maxSizeExceededMessage);
        continue;
      }
      const item = createUploadItem(file, kind);
      uploads.value = [item, ...uploads.value];
      uploadTargets.push(item);
    }
    await Promise.all(uploadTargets.map((item) => runUpload(item)));
  };

  const retryUpload = async (id: string) => {
    const item = uploads.value.find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    await runUpload(item);
  };

  const cancelUpload = (id: string) => {
    const item = uploads.value.find((entry) => entry.id === id);
    item?.cancel?.();
  };

  const removeUpload = (id: string) => {
    clearUploadAutoRemoveTimer(id);
    uploads.value = uploads.value.filter((item) => item.id !== id);
  };

  const cancelAllUploads = () => {
    for (const upload of uploads.value) {
      if (upload.status === 'uploading') {
        upload.cancel?.();
      }
    }
    for (const timeoutId of uploadAutoRemoveTimers.values()) {
      window.clearTimeout(timeoutId);
    }
    uploadAutoRemoveTimers.clear();
  };

  onBeforeUnmount(() => {
    cancelAllUploads();
  });

  return {
    uploads,
    uploadInProgressCount,
    handleFiles,
    retryUpload,
    cancelUpload,
    removeUpload,
    cancelAllUploads,
  };
};

export { useUploadQueue };
export type { UploadItem, UploadKind };
