import { API_BASE_URL } from './api';

const rawBaseUrl = import.meta.env.VITE_FILE_BASE_URL as string | undefined;

const normalizeBaseUrl = (value: string | undefined) => {
  if (!value) {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.replace(/\/+$/, '');
};

const FILE_BASE_URL = normalizeBaseUrl(rawBaseUrl);
const API_BASE = normalizeBaseUrl(API_BASE_URL || '/api');

type FileLike = {
  id?: number | null;
  storageKey?: string | null;
  mimeType?: string | null;
};

type FileVariant = 'thumb' | 'medium' | 'large' | 'original';

const resolveFileUrl = (storageKey?: string | null) => {
  if (!storageKey) {
    return null;
  }
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
    return storageKey;
  }
  let normalizedKey = storageKey.replace(/^\/+/, '');
  if (FILE_BASE_URL.endsWith('/uploads') && normalizedKey.startsWith('uploads/')) {
    normalizedKey = normalizedKey.slice('uploads/'.length);
  }
  const prefix = FILE_BASE_URL ? `${FILE_BASE_URL}/` : '/';
  return `${prefix}${normalizedKey}`;
};

const resolveFileViewUrl = (fileId?: number | null, variant?: FileVariant | null) => {
  if (!fileId || !Number.isFinite(fileId)) {
    return null;
  }
  const base = API_BASE ? API_BASE : '/api';
  const path = `${base}/files/${fileId}/view`;
  if (!variant || variant === 'medium') {
    return path;
  }
  return `${path}?variant=${variant}`;
};

const resolveImageUrl = (file?: FileLike | null, variant?: FileVariant | null) => {
  if (!file) {
    return null;
  }
  if (file.mimeType && !file.mimeType.startsWith('image/')) {
    return resolveFileUrl(file.storageKey ?? null);
  }
  const viewUrl = resolveFileViewUrl(file.id ?? null, variant);
  if (viewUrl) {
    return viewUrl;
  }
  return resolveFileUrl(file.storageKey ?? null);
};

export { FILE_BASE_URL, resolveFileUrl, resolveFileViewUrl, resolveImageUrl };
