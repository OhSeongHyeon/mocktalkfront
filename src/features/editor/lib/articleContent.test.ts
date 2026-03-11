import { describe, expect, it } from 'vitest';

import { hasMarkdownConversionRisk, hasMeaningfulArticleContent } from './articleContent';
import { convertHtmlToMarkdown } from './markdownConversion';

describe('articleContent', () => {
  it('hasMeaningfulArticleContent는 Markdown 이미지 문법도 본문으로 인정한다', () => {
    // given: 이미지 문법만 있는 Markdown 본문
    const markdown = '![대표 이미지](/api/files/10/view)';

    // when: 본문 유효성을 검사하면
    const result = hasMeaningfulArticleContent(markdown, 'MARKDOWN');

    // then: 의미 있는 본문으로 판단해야 한다
    expect(result).toBe(true);
  });

  it('hasMeaningfulArticleContent는 frontmatter만 있는 Markdown을 빈 본문으로 본다', () => {
    // given: frontmatter만 있고 본문이 없는 Markdown
    const markdown = `---
title: "제목"
visibility: "PUBLIC"
---`;

    // when: 본문 유효성을 검사하면
    const result = hasMeaningfulArticleContent(markdown, 'MARKDOWN');

    // then: 의미 있는 본문으로 판단하지 않아야 한다
    expect(result).toBe(false);
  });

  it('hasMarkdownConversionRisk는 표와 인라인 스타일을 위험 요소로 감지한다', () => {
    // given: 표와 스타일이 포함된 HTML
    const html = '<table><tr><td style="color:red">값</td></tr></table>';

    // when: Markdown 전환 위험 여부를 판단하면
    const result = hasMarkdownConversionRisk(html);

    // then: 전환 위험이 있다고 판단해야 한다
    expect(result).toBe(true);
  });
});

describe('markdownConversion', () => {
  it('convertHtmlToMarkdown은 제목과 굵은 텍스트를 Markdown으로 변환한다', async () => {
    // given: 기본 서식이 포함된 HTML
    const html = '<h1>제목</h1><p><strong>강조</strong> 문장</p>';

    // when: Markdown으로 변환하면
    const markdown = await convertHtmlToMarkdown(html);

    // then: 제목과 굵은 문법이 반영되어야 한다
    expect(markdown).toContain('# 제목');
    expect(markdown).toContain('**강조**');
  });
});
