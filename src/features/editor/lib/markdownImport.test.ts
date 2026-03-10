import { describe, expect, it } from 'vitest';

import { parseMarkdownImport } from './markdownImport';

describe('markdownImport', () => {
  it('frontmatter가 있으면 본문과 메타를 분리한다', () => {
    // given: 제목과 메타가 포함된 Markdown 파일
    const markdown = `---
title: "Mermaid 렌더링 최적화 기록"
tags:
  - markdown
  - mermaid
boardSlug: dev
visibility: public
summary: "요약"
---

# 본문

내용입니다.
`;

    // when: Markdown 임포트를 파싱하면
    const result = parseMarkdownImport(markdown, 'sample-post.md');

    // then: frontmatter 메타와 본문이 올바르게 분리되어야 한다
    expect(result.hadFrontmatter).toBe(true);
    expect(result.metadata.title).toBe('Mermaid 렌더링 최적화 기록');
    expect(result.metadata.tags).toEqual(['markdown', 'mermaid']);
    expect(result.metadata.boardSlug).toBe('dev');
    expect(result.metadata.visibility).toBe('PUBLIC');
    expect(result.metadata.summary).toBe('요약');
    expect(result.content).toContain('# 본문');
    expect(result.warnings).toEqual([]);
  });

  it('frontmatter가 없으면 파일명으로 제목 후보를 만든다', () => {
    // given: frontmatter가 없는 Markdown 파일
    const markdown = '# 제목\n\n본문';

    // when: Markdown 임포트를 파싱하면
    const result = parseMarkdownImport(markdown, 'release-note_v1.md');

    // then: 본문은 그대로 두고 파일명 기준 제목 후보를 만든다
    expect(result.hadFrontmatter).toBe(false);
    expect(result.metadata.title).toBe('release note v1');
    expect(result.content).toBe(markdown);
  });

  it('닫히지 않은 frontmatter는 본문 전체를 그대로 유지하고 경고한다', () => {
    // given: frontmatter 시작만 있고 닫힘 구분자가 없는 파일
    const markdown = `---
title: "초안"

# 본문`;

    // when: Markdown 임포트를 파싱하면
    const result = parseMarkdownImport(markdown, 'draft.md');

    // then: 파일 전체를 본문으로 유지하고 경고를 남긴다
    expect(result.hadFrontmatter).toBe(false);
    expect(result.content).toBe(markdown);
    expect(result.metadata.title).toBe('draft');
    expect(result.warnings).toContain('frontmatter 닫힘 구분자를 찾지 못해 파일 본문 전체를 그대로 불러왔습니다.');
  });

  it('지원하지 않는 필드는 unsupportedFields에 모은다', () => {
    // given: inline tags 배열과 미지원 필드가 섞인 frontmatter
    const markdown = `---
title: 문서 제목
tags: [alpha, "beta test"]
author: admin
board_slug: docs
---

본문`;

    // when: Markdown 임포트를 파싱하면
    const result = parseMarkdownImport(markdown, 'doc.md');

    // then: 지원 필드는 파싱하고 미지원 필드는 따로 모아야 한다
    expect(result.metadata.tags).toEqual(['alpha', 'beta test']);
    expect(result.metadata.boardSlug).toBe('docs');
    expect(result.unsupportedFields).toEqual(['author']);
  });
});
