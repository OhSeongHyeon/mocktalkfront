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

export { FILE_BASE_URL, resolveFileUrl };
