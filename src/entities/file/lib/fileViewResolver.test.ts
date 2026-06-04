import { beforeEach, describe, expect, it, vi } from 'vitest';

import { issueFileViewTicketsBatch, issueFileViewUrl } from '../api/fileViewApi';
import {
  attachFileViewMediaRecovery,
  hasFileViewMediaUrls,
  parseFileViewDescriptor,
  parseFileViewMediaUrl,
  resolveProtectedFileViewUrlsInHtml,
} from './fileViewResolver';

vi.mock('../api/fileViewApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/fileViewApi')>();
  return {
    ...actual,
    issueFileViewTicketsBatch: vi.fn(),
    issueFileViewUrl: vi.fn(),
  };
});

const issueFileViewTicketsBatchMock = vi.mocked(issueFileViewTicketsBatch);
const issueFileViewUrlMock = vi.mocked(issueFileViewUrl);

describe('entities/file/lib/fileViewResolver', () => {
  beforeEach(() => {
    issueFileViewTicketsBatchMock.mockReset();
    issueFileViewUrlMock.mockReset();
  });

  it('parseFileViewDescriptor는 canonical file view URL에서 fileId와 variant를 추출한다', () => {
    // given
    const url = '/api/files/41/view?variant=original_size';

    // when
    const descriptor = parseFileViewDescriptor(url);

    // then
    expect(descriptor).toEqual({
      fileId: 41,
      variant: 'original_size',
    });
  });

  it('parseFileViewMediaUrl은 ticket이 포함된 URL에서도 fileId와 variant를 추출한다', () => {
    // given
    const url = '/api/files/41/view?variant=thumb&ticket=fv_test';

    // when
    const descriptor = parseFileViewMediaUrl(url);

    // then
    expect(descriptor).toEqual({
      fileId: 41,
      variant: 'thumb',
    });
    expect(parseFileViewDescriptor(url)).toBeNull();
  });

  it('hasFileViewMediaUrls는 본문 HTML에 file view URL이 있으면 true를 반환한다', () => {
    expect(hasFileViewMediaUrls('<img src="/api/files/12/view" />')).toBe(true);
    expect(hasFileViewMediaUrls('<p>no media</p>')).toBe(false);
  });

  it('resolveProtectedFileViewUrlsInHtml은 중복 파일 URL을 배치 API 한 번으로 치환한다', async () => {
    // given
    issueFileViewTicketsBatchMock.mockResolvedValue(
      new Map([
        [
          '41:original_size',
          {
            fileId: 41,
            variant: 'original_size',
            success: true,
            viewUrl: '/api/files/41/view?variant=original_size&ticket=fv_test',
            expiresInSec: 30,
            protectedFile: true,
            errorCode: null,
          },
        ],
      ]),
    );
    const html = [
      '<div>',
      '<img src="/api/files/41/view?variant=original_size" alt="이미지 1" />',
      '<img src="/api/files/41/view?variant=original_size" alt="이미지 2" />',
      '</div>',
    ].join('');

    // when
    const renderedHtml = await resolveProtectedFileViewUrlsInHtml(html, true);

    // then
    expect(issueFileViewTicketsBatchMock).toHaveBeenCalledTimes(1);
    expect(issueFileViewTicketsBatchMock).toHaveBeenCalledWith([{ fileId: 41, variant: 'original_size' }]);
    expect(renderedHtml).toContain('/api/files/41/view?variant=original_size&amp;ticket=fv_test');
  });

  it('resolveProtectedFileViewUrlsInHtml은 success가 false인 항목의 src를 유지하고 failed 클래스를 붙인다', async () => {
    // given
    const originalSrc = '/api/files/99/view';
    issueFileViewTicketsBatchMock.mockResolvedValue(
      new Map([
        [
          '99:',
          {
            fileId: 99,
            variant: null,
            success: false,
            viewUrl: null,
            expiresInSec: 0,
            protectedFile: false,
            errorCode: 'FILE_404',
          },
        ],
      ]),
    );
    const html = `<img src="${originalSrc}" alt="missing" />`;

    // when
    const renderedHtml = await resolveProtectedFileViewUrlsInHtml(html, true);

    // then
    expect(renderedHtml).toContain(originalSrc);
    expect(renderedHtml).toContain('file-view-media--failed');
    expect(renderedHtml).not.toContain('ticket=');
  });

  it('attachFileViewMediaRecovery는 error 시 단건 ticket을 재발급한다', async () => {
    // given
    issueFileViewUrlMock.mockResolvedValue({
      viewUrl: '/api/files/15/view?ticket=fv_new',
      expiresInSec: 120,
      protectedFile: true,
    });
    const root = document.createElement('div');
    const image = document.createElement('img');
    image.setAttribute('src', '/api/files/15/view?ticket=fv_old');
    root.appendChild(image);
    const detach = attachFileViewMediaRecovery(root, true);

    // when
    image.dispatchEvent(new Event('error'));
    await Promise.resolve();
    await Promise.resolve();

    // then
    expect(issueFileViewUrlMock).toHaveBeenCalledTimes(1);
    expect(issueFileViewUrlMock).toHaveBeenCalledWith(15, 'medium');
    expect(image.getAttribute('src')).toContain('ticket=fv_new');

    detach();
  });

  it('attachFileViewMediaRecovery는 재발급 실패 시 retry를 exhausted로 표시한다', async () => {
    // given
    issueFileViewUrlMock.mockRejectedValue(new Error('failed'));
    const root = document.createElement('div');
    const image = document.createElement('img');
    image.setAttribute('src', '/api/files/20/view?ticket=fv_old');
    root.appendChild(image);
    const detach = attachFileViewMediaRecovery(root, true);

    // when
    image.dispatchEvent(new Event('error'));
    await Promise.resolve();
    await Promise.resolve();

    // then
    expect(image.getAttribute('data-file-view-retry')).toBe('exhausted');
    expect(image.classList.contains('file-view-media--failed')).toBe(true);

    detach();
  });
});
