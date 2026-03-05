import { mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';

type ImageAlign = 'left' | 'center' | 'right';
type ImageSizeValue = string | null;

const normalizeImageAlign = (value: unknown): ImageAlign => {
  if (value === 'center' || value === 'right') {
    return value;
  }
  return 'left';
};

const normalizeImageSize = (value: unknown): ImageSizeValue => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return `${Math.round(value)}px`;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return `${Math.round(Number(trimmed))}px`;
  }
  if (/^\d+(\.\d+)?%$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d+(\.\d+)?px$/.test(trimmed)) {
    return trimmed;
  }
  return null;
};

const normalizeOriginalWidth = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }
  return null;
};

const stripImageSizeStyles = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .split(';')
    .map((rule) => rule.trim())
    .filter((rule) => {
      if (rule.length === 0) {
        return false;
      }
      const lowered = rule.toLowerCase();
      return !lowered.startsWith('width:') && !lowered.startsWith('height:');
    })
    .join('; ');
};

const normalizeCaption = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toHtmlDimensionAttribute = (value: ImageSizeValue) => {
  if (!value || !value.endsWith('px')) {
    return null;
  }
  const parsed = Number(value.slice(0, -2).trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return String(Math.round(parsed));
};

const RichImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'left',
        parseHTML: (element: HTMLElement) => {
          const figure = element.closest('figure[data-type="editor-image"]');
          const raw = figure?.getAttribute('data-align') ?? element.getAttribute('data-align');
          return normalizeImageAlign(raw);
        },
        renderHTML: (attributes: { align?: unknown }) => ({
          'data-align': normalizeImageAlign(attributes.align),
        }),
      },
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-width') ?? element.style.width ?? element.getAttribute('width');
          return normalizeImageSize(raw);
        },
        renderHTML: (attributes: { width?: unknown }) => {
          const width = normalizeImageSize(attributes.width);
          if (!width) {
            return {};
          }
          return {
            'data-width': width,
          };
        },
      },
      height: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-height') ?? element.style.height ?? element.getAttribute('height');
          return normalizeImageSize(raw);
        },
        renderHTML: (attributes: { height?: unknown }) => {
          const height = normalizeImageSize(attributes.height);
          if (!height) {
            return {};
          }
          return {
            'data-height': height,
          };
        },
      },
      originalWidth: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const figure = element.closest('figure[data-type="editor-image"]');
          const raw = figure?.getAttribute('data-original-width') ?? element.getAttribute('data-original-width');
          return normalizeOriginalWidth(raw);
        },
        renderHTML: (attributes: { originalWidth?: unknown }) => {
          const originalWidth = normalizeOriginalWidth(attributes.originalWidth);
          if (!originalWidth) {
            return {};
          }
          return {
            'data-original-width': String(originalWidth),
          };
        },
      },
      originalHeight: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const figure = element.closest('figure[data-type="editor-image"]');
          const raw = figure?.getAttribute('data-original-height') ?? element.getAttribute('data-original-height');
          return normalizeOriginalWidth(raw);
        },
        renderHTML: (attributes: { originalHeight?: unknown }) => {
          const originalHeight = normalizeOriginalWidth(attributes.originalHeight);
          if (!originalHeight) {
            return {};
          }
          return {
            'data-original-height': String(originalHeight),
          };
        },
      },
      caption: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const figure = element.closest('figure[data-type="editor-image"]');
          const figcaption = figure?.querySelector('figcaption')?.textContent;
          const raw = figcaption ?? element.getAttribute('data-caption');
          return normalizeCaption(raw);
        },
        renderHTML: (attributes: { caption?: unknown }) => {
          const caption = normalizeCaption(attributes.caption);
          if (!caption) {
            return {};
          }
          return {
            'data-caption': caption,
            title: caption,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-type="editor-image"]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }
          const image = node.querySelector('img');
          if (!image) {
            return false;
          }
          const caption = node.querySelector('figcaption')?.textContent ?? image.getAttribute('data-caption');
          return {
            src: image.getAttribute('src'),
            alt: image.getAttribute('alt'),
            title: image.getAttribute('title'),
            align: normalizeImageAlign(node.getAttribute('data-align') ?? image.getAttribute('data-align')),
            width: normalizeImageSize(image.getAttribute('data-width') ?? image.style.width ?? image.getAttribute('width')),
            height: normalizeImageSize(image.getAttribute('data-height') ?? image.style.height ?? image.getAttribute('height')),
            originalWidth: normalizeOriginalWidth(node.getAttribute('data-original-width') ?? image.getAttribute('data-original-width')),
            originalHeight: normalizeOriginalWidth(node.getAttribute('data-original-height') ?? image.getAttribute('data-original-height')),
            caption: normalizeCaption(caption),
          };
        },
      },
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const align = normalizeImageAlign(HTMLAttributes.align);
    const width = normalizeImageSize(HTMLAttributes.width);
    const height = normalizeImageSize(HTMLAttributes.height);
    const originalWidth = normalizeOriginalWidth(HTMLAttributes.originalWidth);
    const originalHeight = normalizeOriginalWidth(HTMLAttributes.originalHeight);
    const caption = normalizeCaption(HTMLAttributes.caption);
    const baseStyle = stripImageSizeStyles(HTMLAttributes.style);
    const mergedStyle = [baseStyle, width ? `width: ${width};` : '', height ? `height: ${height};` : ''].filter(Boolean).join(' ');
    const widthAttribute = toHtmlDimensionAttribute(width);
    const heightAttribute = toHtmlDimensionAttribute(height);

    const imageAttrs = {
      ...HTMLAttributes,
      style: mergedStyle,
      class: ['editor-image-node', `editor-image-node-${align}`, HTMLAttributes.class].filter(Boolean).join(' '),
      'data-align': align,
    } as Record<string, unknown>;

    delete imageAttrs.align;
    delete imageAttrs.width;
    delete imageAttrs.height;
    delete imageAttrs.originalWidth;
    delete imageAttrs.originalHeight;
    delete imageAttrs.caption;
    if (!imageAttrs.style) {
      delete imageAttrs.style;
    }
    if (!width) {
      delete imageAttrs['data-width'];
    } else {
      imageAttrs['data-width'] = width;
    }
    if (!height) {
      delete imageAttrs['data-height'];
    } else {
      imageAttrs['data-height'] = height;
    }
    if (!widthAttribute) {
      delete imageAttrs.width;
    } else {
      imageAttrs.width = widthAttribute;
    }
    if (!heightAttribute) {
      delete imageAttrs.height;
    } else {
      imageAttrs.height = heightAttribute;
    }
    if (!originalWidth) {
      delete imageAttrs['data-original-width'];
    } else {
      imageAttrs['data-original-width'] = String(originalWidth);
    }
    if (!originalHeight) {
      delete imageAttrs['data-original-height'];
    } else {
      imageAttrs['data-original-height'] = String(originalHeight);
    }

    if (!caption) {
      delete imageAttrs['data-caption'];
    } else {
      imageAttrs['data-caption'] = caption;
      imageAttrs.title = caption;
    }

    const children: unknown[] = [['img', mergeAttributes(this.options.HTMLAttributes, imageAttrs)]];
    if (caption) {
      children.push(['figcaption', {}, caption]);
    }

    return [
      'figure',
      {
        'data-type': 'editor-image',
        'data-align': align,
        ...(originalWidth ? { 'data-original-width': String(originalWidth) } : {}),
        ...(originalHeight ? { 'data-original-height': String(originalHeight) } : {}),
        class: ['editor-image-figure', `editor-image-figure-${align}`].join(' '),
      },
      ...children,
    ];
  },
});

export { RichImage };
