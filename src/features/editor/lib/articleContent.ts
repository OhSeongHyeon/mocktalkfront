import type { ArticleContentFormat } from '../../../entities/article';
import { stripMarkdownFrontmatter } from './markdownFrontmatter';

const stripHtmlTags = (value: string) => value.replace(/<[^>]*>/g, ' ');

const stripMarkdownSyntax = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, ' 코드블록 ')
    .replace(/`([^`]+)`/g, ' $1 ')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, ' $1 이미지 ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, ' $1 ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^- \[[ xX]\]\s+/gm, '')
    .replace(/[*_~>#-]+/g, ' ')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasMeaningfulArticleContent = (contentSource: string, contentFormat: ArticleContentFormat) => {
  if (contentFormat === 'HTML') {
    return (
      contentSource
        .replace(/<(img|video|iframe|figure)\b[^>]*>/gi, ' 미디어 ')
        .replace(/<\/figure>/gi, ' ')
        .replace(/<figcaption\b[^>]*>/gi, ' ')
        .replace(/<\/figcaption>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim().length > 0
    );
  }
  return stripMarkdownSyntax(stripHtmlTags(stripMarkdownFrontmatter(contentSource))).length > 0;
};

const hasMarkdownConversionRisk = (htmlSource: string) => {
  return /<(table|video|iframe|figure|figcaption|mark|sup|sub|input|span|div)\b|style=|data-|\bclass=/i.test(htmlSource);
};

export { hasMarkdownConversionRisk, hasMeaningfulArticleContent };
