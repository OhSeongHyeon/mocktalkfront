import { describe, expect, it } from 'vitest';

import { extractFileIdsFromContent } from './contentFiles';

describe('features/editor/lib/contentFiles', () => {
  it('본문 HTML에서 첨부 파일 ID를 중복 없이 추출한다', () => {
    // given
    const content = `
      <p>첫 번째 첨부 <a href="/api/files/12/view">다운로드</a></p>
      <p>중복 첨부 <a href="/api/files/12/view">다운로드</a></p>
      <p>두 번째 첨부 <a href="/api/files/77/view?download=true">다운로드</a></p>
      <p>잘못된 링크 <a href="/api/files/not-number/view">무시</a></p>
    `;

    // when
    const fileIds = extractFileIdsFromContent(content);

    // then
    expect(fileIds).toEqual([12, 77]);
  });

  it('빈 본문 입력 시 빈 배열을 반환한다', () => {
    // given
    const content = '';

    // when
    const fileIds = extractFileIdsFromContent(content);

    // then
    expect(fileIds).toEqual([]);
  });
});
