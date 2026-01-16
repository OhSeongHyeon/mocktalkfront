import DOMPurify from 'dompurify';

import { FILE_BASE_URL } from './files';

const YOUTUBE_IFRAME_PREFIXES = ['https://www.youtube.com/embed', 'https://www.youtube-nocookie.com/embed'];

const normalizeOrigin = (value: string | null) => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const origin = new URL(trimmed).origin;
    return origin.replace(/\/+$/, '');
  } catch {
    return null;
  }
};

const allowedFileOrigins = (() => {
  const origin = normalizeOrigin(FILE_BASE_URL);
  return origin ? [origin] : [];
})();

const isRelativeUrl = (value: string) => {
  if (!value) {
    return false;
  }
  if (value.startsWith('//')) {
    return false;
  }
  return !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
};

const isAllowedFileSrc = (value: string) => {
  if (isRelativeUrl(value)) {
    return true;
  }
  try {
    const origin = new URL(value).origin;
    return allowedFileOrigins.includes(origin);
  } catch {
    return false;
  }
};

const isAllowedIframeSrc = (value: string) => value.startsWith('https://') && YOUTUBE_IFRAME_PREFIXES.some((prefix) => value.startsWith(prefix));

DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  if (!['src', 'poster'].includes(data.attrName)) {
    return;
  }
  const element = node instanceof Element ? node.tagName.toLowerCase() : '';
  if (!['img', 'video', 'source', 'iframe'].includes(element)) {
    return;
  }
  const src = String(data.attrValue ?? '').trim();
  if (!src) {
    data.keepAttr = false;
    return;
  }
  if (element === 'iframe') {
    if (!isAllowedIframeSrc(src)) {
      data.keepAttr = false;
    }
    return;
  }
  if (!isAllowedFileSrc(src)) {
    data.keepAttr = false;
  }
});

const sanitizeHtml = (html: string) =>
  DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ['iframe', 'video', 'source', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'pre', 'code'],
    ADD_ATTR: [
      'src',
      'alt',
      'title',
      'width',
      'height',
      'allow',
      'allowfullscreen',
      'frameborder',
      'controls',
      'poster',
      'type',
      'class',
      'data-id',
      'data-label',
      'data-type',
      'data-youtube-video',
      'colspan',
      'rowspan',
      'rel',
      'target',
    ],
  });

export { sanitizeHtml };
