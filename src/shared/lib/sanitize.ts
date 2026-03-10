import DOMPurify from 'dompurify';

import { FILE_BASE_URL } from './files';

const YOUTUBE_IFRAME_PREFIXES = ['https://www.youtube.com/embed', 'https://www.youtube-nocookie.com/embed'];
const SAFE_TEXT_ALIGN_VALUES = new Set(['left', 'center', 'right', 'justify', 'inherit']);
const SAFE_FONT_SIZE_PATTERN = /^\d+(\.\d+)?px$/i;
const SAFE_DIMENSION_PATTERN = /^(\d+(\.\d+)?)(px|%)$/i;
const SAFE_FONT_FAMILY_PATTERN = /^[\w\s"',-]+$/u;
const UNSAFE_CSS_TOKEN_PATTERN = /(?:url|expression|var|attr)\s*\(/i;
const STYLE_PROPERTY_ALLOWLIST = {
  span: ['color', 'font-family', 'font-size'],
  mark: ['background-color', 'color'],
  img: ['width', 'height'],
  p: ['text-align'],
  div: ['text-align'],
  blockquote: ['text-align'],
  li: ['text-align'],
  td: ['text-align'],
  th: ['text-align'],
  h1: ['text-align'],
  h2: ['text-align'],
  h3: ['text-align'],
  h4: ['text-align'],
  h5: ['text-align'],
  h6: ['text-align'],
} as const satisfies Record<string, readonly string[]>;

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

const getAllowedStyleProperties = (elementName: string): readonly string[] =>
  STYLE_PROPERTY_ALLOWLIST[elementName as keyof typeof STYLE_PROPERTY_ALLOWLIST] ?? [];

const normalizeCssValue = (property: string, value: string) => {
  const probe = document.createElement('span');
  probe.style.setProperty(property, value);
  return probe.style.getPropertyValue(property).trim();
};

const sanitizeStyleDeclaration = (property: string, value: string) => {
  const normalizedValue = normalizeCssValue(property, value);
  if (!normalizedValue || UNSAFE_CSS_TOKEN_PATTERN.test(normalizedValue)) {
    return null;
  }

  if (property === 'font-size') {
    return SAFE_FONT_SIZE_PATTERN.test(normalizedValue) ? normalizedValue : null;
  }

  if (property === 'width' || property === 'height') {
    return SAFE_DIMENSION_PATTERN.test(normalizedValue) ? normalizedValue : null;
  }

  if (property === 'font-family') {
    return SAFE_FONT_FAMILY_PATTERN.test(normalizedValue) ? normalizedValue : null;
  }

  if (property === 'text-align') {
    const loweredValue = normalizedValue.toLowerCase();
    return SAFE_TEXT_ALIGN_VALUES.has(loweredValue) ? loweredValue : null;
  }

  return normalizedValue;
};

const sanitizeInlineStyle = (elementName: string, styleValue: string) => {
  const allowedProperties = getAllowedStyleProperties(elementName);
  if (allowedProperties.length === 0) {
    return null;
  }

  const probe = document.createElement('span');
  probe.style.cssText = styleValue;

  const declarations = allowedProperties
    .map((property) => {
      const sanitizedValue = sanitizeStyleDeclaration(property, probe.style.getPropertyValue(property));
      return sanitizedValue ? `${property}: ${sanitizedValue}` : null;
    })
    .filter((declaration): declaration is string => declaration !== null);

  return declarations.length > 0 ? declarations.join('; ') : null;
};

DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  const element = node instanceof Element ? node.tagName.toLowerCase() : '';

  if (data.attrName === 'style') {
    const sanitizedStyle = sanitizeInlineStyle(element, String(data.attrValue ?? ''));
    if (!sanitizedStyle) {
      data.keepAttr = false;
      return;
    }
    data.attrValue = sanitizedStyle;
    return;
  }

  if (!['src', 'poster'].includes(data.attrName)) {
    return;
  }
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
    ADD_TAGS: [
      'iframe',
      'video',
      'source',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'pre',
      'code',
      'mark',
      'sup',
      'sub',
      'figure',
      'figcaption',
      'label',
      'input',
    ],
    ADD_ATTR: [
      'src',
      'alt',
      'title',
      'style',
      'width',
      'height',
      'allow',
      'allowfullscreen',
      'frameborder',
      'controls',
      'poster',
      'type',
      'checked',
      'disabled',
      'class',
      'data-id',
      'data-label',
      'data-type',
      'data-checked',
      'data-align',
      'data-width',
      'data-height',
      'data-original-width',
      'data-original-height',
      'data-caption',
      'data-youtube-video',
      'colspan',
      'rowspan',
      'rel',
      'target',
    ],
  });

export { sanitizeHtml };
