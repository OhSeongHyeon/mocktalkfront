import { buildApiUrl } from '../../../shared/lib/http/api';
import { resolveFileUrl, resolveFileViewUrl, resolveImageUrl } from '../../../shared/lib/files';
import type { FileLike, FileVariant } from '../../../shared/lib/files';
import { issueFileViewUrl } from '../api/fileViewApi';

interface FileViewDescriptor {
  fileId: number;
  variant: FileVariant | null;
}

type SupportedMediaElement = HTMLImageElement | HTMLVideoElement | HTMLSourceElement;

const FILE_VIEW_PATH_PATTERN = /\/api\/files\/(\d+)\/view$/;
const FILE_VIEW_ATTRIBUTE_NAMES = ['src', 'poster'] as const;

const normalizeVariant = (value: string | null): FileVariant | null => {
  if (!value || value === 'medium') {
    return null;
  }
  if (value === 'thumb' || value === 'large' || value === 'original' || value === 'original_size') {
    return value;
  }
  return null;
};

const buildDescriptorKey = (descriptor: FileViewDescriptor) => `${descriptor.fileId}:${descriptor.variant ?? 'medium'}`;

const parseFileViewDescriptor = (rawUrl: string): FileViewDescriptor | null => {
  if (!rawUrl) {
    return null;
  }

  try {
    const resolvedUrl = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'https://mocktalk.local');
    if (resolvedUrl.searchParams.has('ticket')) {
      return null;
    }

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

  const resolvedUrlMap = new Map<string, string>();
  await Promise.all(
    Array.from(new Set(targets.map((target) => buildDescriptorKey(target.descriptor)))).map(async (key) => {
      const target = targets.find((item) => buildDescriptorKey(item.descriptor) === key);
      if (!target) {
        return;
      }
      const response = await issueFileViewUrl(target.descriptor.fileId, target.descriptor.variant ?? 'medium');
      resolvedUrlMap.set(key, buildApiUrl(response.viewUrl));
    }),
  );

  targets.forEach((target) => {
    const resolvedUrl = resolvedUrlMap.get(buildDescriptorKey(target.descriptor));
    if (!resolvedUrl) {
      return;
    }
    target.element.setAttribute(target.attributeName, resolvedUrl);
  });
};

export { hydrateProtectedFileViewUrls, parseFileViewDescriptor, resolveProtectedFileViewUrlsInHtml, resolveRenderableFileUrl };
