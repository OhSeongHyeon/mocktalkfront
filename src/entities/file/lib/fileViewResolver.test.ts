import { beforeEach, describe, expect, it, vi } from 'vitest';

import { issueFileViewUrl } from '../api/fileViewApi';
import { parseFileViewDescriptor, resolveProtectedFileViewUrlsInHtml } from './fileViewResolver';

vi.mock('../api/fileViewApi', () => ({
  issueFileViewUrl: vi.fn(),
}));

const issueFileViewUrlMock = vi.mocked(issueFileViewUrl);

describe('entities/file/lib/fileViewResolver', () => {
  beforeEach(() => {
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

  it('resolveProtectedFileViewUrlsInHtml은 중복 파일 URL을 한 번만 ticket 발급해 치환한다', async () => {
    // given
    issueFileViewUrlMock.mockResolvedValue({
      viewUrl: '/api/files/41/view?variant=original_size&ticket=fv_test',
      expiresInSec: 30,
      protectedFile: true,
    });
    const html = [
      '<div>',
      '<img src="/api/files/41/view?variant=original_size" alt="이미지 1" />',
      '<img src="/api/files/41/view?variant=original_size" alt="이미지 2" />',
      '</div>',
    ].join('');

    // when
    const renderedHtml = await resolveProtectedFileViewUrlsInHtml(html, true);

    // then
    expect(issueFileViewUrlMock).toHaveBeenCalledTimes(1);
    expect(issueFileViewUrlMock).toHaveBeenCalledWith(41, 'original_size');
    expect(renderedHtml).toContain('/api/files/41/view?variant=original_size&amp;ticket=fv_test');
  });
});
