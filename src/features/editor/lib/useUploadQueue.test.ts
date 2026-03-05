import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useUploadQueue } from './useUploadQueue';

interface UploadResult {
  key: string;
}

const createFile = (name: string, type: string, content: string) => new File([content], name, { type });

const mountUploadQueue = (
  createUploadTask: (file: File, onProgress: (percent: number) => void) => { promise: Promise<UploadResult>; cancel: () => void },
) => {
  const onInsertUploadedFile = vi.fn();
  const onError = vi.fn();

  const Harness = defineComponent({
    setup() {
      const queue = useUploadQueue<UploadResult>({
        maxUploadSize: 1024 * 1024,
        successAutoRemoveDelayMs: 1000,
        resolveKind: (file) => (file.type.startsWith('image/') ? 'image' : null),
        createUploadTask,
        resolveUploadedUrl: (_kind, uploaded) => uploaded.key,
        resolveImageNaturalSize: async () => ({ width: 1200, height: 800 }),
        onInsertUploadedFile,
        onError,
        unsupportedFileMessage: '지원하지 않는 파일입니다.',
        maxSizeExceededMessage: '파일 용량이 너무 큽니다.',
      });
      return { queue };
    },
    render() {
      return h('div');
    },
  });

  const wrapper = mount(Harness);
  const queue = (wrapper.vm as unknown as { queue: ReturnType<typeof useUploadQueue> }).queue;
  if (!queue) {
    throw new Error('업로드 큐 초기화 실패');
  }

  return { wrapper, queue, onInsertUploadedFile, onError };
};

describe('features/editor/lib/useUploadQueue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('업로드 성공 시 success 상태 전이 후 자동 제거된다', async () => {
    // given
    vi.useFakeTimers();
    const createUploadTask = vi.fn((_file: File, onProgress: (percent: number) => void) => {
      onProgress(45);
      return {
        promise: Promise.resolve({ key: '/uploads/editor/success.png' }),
        cancel: vi.fn(),
      };
    });
    const { wrapper, queue, onInsertUploadedFile } = mountUploadQueue(createUploadTask);

    // when
    await queue.handleFiles([createFile('success.png', 'image/png', 'payload')]);

    // then
    expect(queue.uploads.value).toHaveLength(1);
    expect(queue.uploads.value[0]?.status).toBe('success');
    expect(queue.uploads.value[0]?.progress).toBe(100);
    expect(onInsertUploadedFile).toHaveBeenCalledTimes(1);
    expect(onInsertUploadedFile).toHaveBeenCalledWith('image', '/uploads/editor/success.png', { width: 1200, height: 800 });

    vi.advanceTimersByTime(1000);
    await nextTick();

    expect(queue.uploads.value).toHaveLength(0);
    wrapper.unmount();
  });

  it('업로드 취소 시 canceled 상태로 전이된다', async () => {
    // given
    let rejectUpload: ((reason?: unknown) => void) | null = null;
    const cancelSpy = vi.fn(() => {
      rejectUpload?.(new DOMException('업로드 취소', 'AbortError'));
    });
    const createUploadTask = vi.fn(() => ({
      promise: new Promise<UploadResult>((_resolve, reject) => {
        rejectUpload = reject;
      }),
      cancel: cancelSpy,
    }));
    const { wrapper, queue, onInsertUploadedFile } = mountUploadQueue(createUploadTask);

    // when
    const runPromise = queue.handleFiles([createFile('cancel.png', 'image/png', 'payload')]);
    await nextTick();
    const uploadId = queue.uploads.value[0]?.id;
    if (!uploadId) {
      throw new Error('업로드 항목 생성 실패');
    }
    queue.cancelUpload(uploadId);
    await runPromise;

    // then
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(queue.uploads.value[0]?.status).toBe('canceled');
    expect(queue.uploads.value[0]?.message).toBe('업로드 취소');
    expect(onInsertUploadedFile).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
