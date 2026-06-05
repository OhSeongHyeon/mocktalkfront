import { describe, expect, it } from 'vitest';

import { mergeManagedMarkdownFrontmatter, stripMarkdownFrontmatter } from './markdownFrontmatter';

describe('markdownFrontmatter', () => {
  it('stripMarkdownFrontmatter는 유효한 frontmatter를 제거하고 본문만 반환한다', () => {
    // given: frontmatter와 본문이 함께 있는 Markdown
    const markdown = `---
title: "문서 제목"
tags:
  - alpha
---

# 본문
`;

    // when: frontmatter를 제거하면
    const result = stripMarkdownFrontmatter(markdown);

    // then: 본문만 남아야 한다
    expect(result).toBe('# 본문\n');
  });

  it('mergeManagedMarkdownFrontmatter는 기존 tags와 summary를 보존하면서 관리 키를 갱신한다', () => {
    // given: tags, summary가 있는 기존 frontmatter
    const markdown = `---
title: "이전 제목"
boardSlug: "old-board"
visibility: "MEMBERS"
categoryName: "이전 카테고리"
tags:
  - alpha
summary: "요약"
customFlag: true
---

본문`;

    // when: 관리 키를 다시 써넣으면
    const result = mergeManagedMarkdownFrontmatter(markdown, {
      title: '새 제목',
      boardSlug: 'dev',
      visibility: 'PUBLIC',
      categoryName: '백엔드',
    });

    // then: 관리 키는 최신값으로 바뀌고 나머지 frontmatter는 유지되어야 한다
    expect(result).toContain('title: "새 제목"');
    expect(result).toContain('boardSlug: "dev"');
    expect(result).toContain('visibility: "PUBLIC"');
    expect(result).toContain('categoryName: "백엔드"');
    expect(result).toContain('tags:');
    expect(result).toContain('summary: "요약"');
    expect(result).toContain('customFlag: true');
    expect(result).toContain('\n\n본문');
  });

  it('body 옵션으로 본문만 교체하면서 원본 frontmatter의 비관리 필드를 보존한다', () => {
    const original = `---
title: "이전 제목"
tags:
  - alpha
---

이전 본문`;

    const result = mergeManagedMarkdownFrontmatter(
      original,
      {
        title: '새 제목',
        boardSlug: 'dev',
        visibility: 'PUBLIC',
      },
      { body: '수정된 본문' },
    );

    expect(result).toContain('title: "새 제목"');
    expect(result).toContain('tags:');
    expect(result).toContain('alpha');
    expect(result).toContain('수정된 본문');
    expect(result).not.toContain('이전 본문');
  });

  it('frontmatter가 없어도 관리 키를 새 frontmatter로 추가한다', () => {
    // given: frontmatter가 없는 Markdown
    const markdown = '# 본문';

    // when: 관리 키를 합치면
    const result = mergeManagedMarkdownFrontmatter(markdown, {
      title: '문서 제목',
      boardSlug: 'dev',
      visibility: 'PUBLIC',
    });

    // then: 새 frontmatter가 붙어야 한다
    expect(result).toContain('title: "문서 제목"');
    expect(result).toContain('boardSlug: "dev"');
    expect(result).toContain('visibility: "PUBLIC"');
    expect(result).toContain('\n\n# 본문');
  });
});
