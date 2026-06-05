import { buildApiUrl } from '../../../shared/lib/http/api';
import { resolveFileUrl, resolveFileViewUrl, resolveImageUrl } from '../../../shared/lib/files';
import type { FileLike, FileVariant } from '../../../shared/lib/files';
import { batchResultKey, issueFileViewTicketsBatch, issueFileViewUrl, toBatchRequestItem } from '../api/fileViewApi';

interface FileViewDescriptor {
  fileId: number;
  variant: FileVariant | null;
}

type SupportedMediaElement = HTMLImageElement | HTMLVideoElement | HTMLSourceElement;
type FileViewMediaAttribute = 'src' | 'poster';

const FILE_VIEW_PATH_PATTERN = /\/api\/files\/(\d+)\/view$/;
const FILE_VIEW_MEDIA_URL_PATTERN = /\/api\/files\/\d+\/view/;
const FILE_VIEW_ATTRIBUTE_NAMES = ['src', 'poster'] as const;
const FILE_VIEW_MEDIA_SELECTOR = 'img[src], video[src], video[poster], source[src]';
const FILE_VIEW_MEDIA_FAILED_CLASS = 'file-view-media--failed';
const FILE_VIEW_RETRY_ATTR = 'data-file-view-retry';
const FILE_VIEW_RECOVERY_ATTR = 'data-file-view-recovery';

const normalizeVariant = (value: string | null): FileVariant | null => {
  if (!value || value === 'medium') {
    return null;
  }
  if (value === 'thumb' || value === 'large' || value === 'original' || value === 'original_size') {
    return value;
  }
  return null;
};

const buildDescriptorKey = (descriptor: FileViewDescriptor) => batchResultKey(descriptor.fileId, descriptor.variant);

const parseFileViewMediaUrl = (rawUrl: string): FileViewDescriptor | null => {
  if (!rawUrl) {
    return null;
  }

  try {
    const resolvedUrl = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'https://mocktalk.local');
    const match = resolvedUrl.pathname.match(FILE_VIEW_PATH_PATTERN);
    if (!match) {
      return null;
    }

    const fileId = Number(match[1]);
    if (!Number.isFinite(fileId)) {
      return null;
    }

    return {
      fileId,
      variant: normalizeVariant(resolvedUrl.searchParams.get('variant')),
    };
  } catch {
    return null;
  }
};

const parseFileViewDescriptor = (rawUrl: string): FileViewDescriptor | null => {
  if (!rawUrl) {
    return null;
  }

  try {
    const resolvedUrl = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'https://mocktalk.local');
    if (resolvedUrl.searchParams.has('ticket')) {
      return null;
    }
    return parseFileViewMediaUrl(rawUrl);
  } catch {
    return null;
  }
};

const hasFileViewMediaUrls = (html: string) => FILE_VIEW_MEDIA_URL_PATTERN.test(html);

const markMediaFailed = (element: SupportedMediaElement | Element) => {
  element.classList.add(FILE_VIEW_MEDIA_FAILED_CLASS);
  element.setAttribute(FILE_VIEW_RETRY_ATTR, 'exhausted');
};

const getFileViewMediaBinding = (element: Element): { attributeName: FileViewMediaAttribute; rawUrl: string } | null => {
  if (element instanceof HTMLImageElement || element instanceof HTMLSourceElement) {
    const rawUrl = element.getAttribute('src');
    if (!rawUrl || !parseFileViewMediaUrl(rawUrl)) {
      return null;
    }
    return { attributeName: 'src', rawUrl };
  }

  if (element instanceof HTMLVideoElement) {
    const src = element.getAttribute('src');
    if (src && parseFileViewMediaUrl(src)) {
      return { attributeName: 'src', rawUrl: src };
    }
    const poster = element.getAttribute('poster');
    if (poster && parseFileViewMediaUrl(poster)) {
      return { attributeName: 'poster', rawUrl: poster };
    }
  }

  return null;
};

const createMediaErrorHandler = (isAuthenticated: boolean) => {
  return async (event: Event) => {
    if (!isAuthenticated) {
      return;
    }

    const target = event.currentTarget;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.getAttribute(FILE_VIEW_RETRY_ATTR) === 'exhausted' || target.getAttribute(FILE_VIEW_RETRY_ATTR) === 'pending') {
      return;
    }

    const binding = getFileViewMediaBinding(target);
    if (!binding) {
      return;
    }

    const descriptor = parseFileViewMediaUrl(binding.rawUrl);
    if (!descriptor) {
      return;
    }

    target.setAttribute(FILE_VIEW_RETRY_ATTR, 'pending');

    try {
      const response = await issueFileViewUrl(descriptor.fileId, descriptor.variant ?? 'medium');
      target.setAttribute(binding.attributeName, buildApiUrl(response.viewUrl));
      target.removeAttribute(FILE_VIEW_RETRY_ATTR);
      target.classList.remove(FILE_VIEW_MEDIA_FAILED_CLASS);
    } catch {
      markMediaFailed(target);
    }
  };
};

const attachFileViewMediaRecovery = (root: HTMLElement | null, isAuthenticated: boolean) => {
  if (!root || !isAuthenticated || typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = createMediaErrorHandler(isAuthenticated);
  const boundElements: Element[] = [];

  root.querySelectorAll(FILE_VIEW_MEDIA_SELECTOR).forEach((element) => {
    if (!getFileViewMediaBinding(element)) {
      return;
    }
    if (element.getAttribute(FILE_VIEW_RECOVERY_ATTR) === '1') {
      return;
    }
    element.setAttribute(FILE_VIEW_RECOVERY_ATTR, '1');
    element.addEventListener('error', handler, true);
    boundElements.push(element);
  });

  return () => {
    boundElements.forEach((element) => {
      element.removeEventListener('error', handler, true);
      element.removeAttribute(FILE_VIEW_RECOVERY_ATTR);
    });
  };
};

const resolveRenderableFileUrl = async (file: FileLike | null | undefined, variant: FileVariant | null | undefined, isAuthenticated: boolean) => {
  if (!file) {
    return null;
  }

  const fallbackVariant = variant ?? 'medium';
  if (!isAuthenticated || !file.id || !Number.isFinite(file.id)) {
    if (file.mimeType && file.mimeType.startsWith('image/')) {
      return resolveImageUrl(file, fallbackVariant);
    }
    const viewUrl = resolveFileViewUrl(file.id ?? null, fallbackVariant);
    if (viewUrl) {
      return viewUrl;
    }
    return resolveFileUrl(file.storageKey ?? null);
  }

  const response = await issueFileViewUrl(file.id, fallbackVariant);
  return buildApiUrl(response.viewUrl);
};

const resolveProtectedFileViewUrlsInHtml = async (html: string, isAuthenticated: boolean) => {
  if (!isAuthenticated || !html || typeof DOMParser === 'undefined') {
    return html;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');
  await hydrateProtectedFileViewUrls(document.body, isAuthenticated);
  return document.body.innerHTML;
};

const hydrateProtectedFileViewUrls = async (root: ParentNode | null, isAuthenticated: boolean) => {
  if (!root || !isAuthenticated) {
    return;
  }

  const targets: Array<{
    element: SupportedMediaElement;
    attributeName: (typeof FILE_VIEW_ATTRIBUTE_NAMES)[number];
    descriptor: FileViewDescriptor;
  }> = [];

  for (const attributeName of FILE_VIEW_ATTRIBUTE_NAMES) {
    const elements = root.querySelectorAll<SupportedMediaElement>(`[${attributeName}]`);
    elements.forEach((element) => {
      const rawUrl = element.getAttribute(attributeName);
      if (!rawUrl) {
        return;
      }
      const descriptor = parseFileViewDescriptor(rawUrl);
      if (!descriptor) {
        return;
      }
      targets.push({ element, attributeName, descriptor });
    });
  }

  if (targets.length === 0) {
    return;
  }

  const uniqueDescriptors = Array.from(new Map(targets.map((target) => [buildDescriptorKey(target.descriptor), target.descriptor])).values());
  const batchItems = uniqueDescriptors.map((descriptor) => toBatchRequestItem(descriptor.fileId, descriptor.variant));
  const batchResults = await issueFileViewTicketsBatch(batchItems);

  targets.forEach((target) => {
    const result = batchResults.get(buildDescriptorKey(target.descriptor));
    if (!result?.success || !result.viewUrl) {
      markMediaFailed(target.element);
      return;
    }
    target.element.setAttribute(target.attributeName, buildApiUrl(result.viewUrl));
  });
};

export {
  attachFileViewMediaRecovery,
  hasFileViewMediaUrls,
  hydrateProtectedFileViewUrls,
  parseFileViewDescriptor,
  parseFileViewMediaUrl,
  resolveProtectedFileViewUrlsInHtml,
  resolveRenderableFileUrl,
};
