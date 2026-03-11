import { useAuthStore } from '../../../stores/auth';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl.trim() : '/api';
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

const isAbsoluteUrl = (value: string) => value.startsWith('http://') || value.startsWith('https://');

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const resolvePathname = (value: string) => {
  if (!isAbsoluteUrl(value)) {
    return value;
  }
  try {
    return new URL(value).pathname;
  } catch {
    return value;
  }
};

const resolveBasePath = (value: string) => {
  const base = trimTrailingSlash(value);
  if (!isAbsoluteUrl(base)) {
    return base;
  }
  try {
    const pathname = trimTrailingSlash(new URL(base).pathname);
    return pathname.length > 0 ? pathname : '/';
  } catch {
    return base;
  }
};

const API_BASE_PATH = resolveBasePath(API_BASE_URL);

class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const buildApiUrl = (path: string) => {
  if (isAbsoluteUrl(path)) {
    return path;
  }
  const base = trimTrailingSlash(API_BASE_URL);
  const suffix = path.startsWith('/') ? path : `/${path}`;

  if (isAbsoluteUrl(base)) {
    if (API_BASE_PATH.length > 0 && (suffix === API_BASE_PATH || suffix.startsWith(`${API_BASE_PATH}/`))) {
      const trimmedSuffix = suffix.slice(API_BASE_PATH.length);
      if (!trimmedSuffix) {
        return base;
      }
      if (trimmedSuffix.startsWith('/')) {
        return `${base}${trimmedSuffix}`;
      }
      return `${base}/${trimmedSuffix}`;
    }
    return `${base}${suffix}`;
  }

  if (suffix === base || suffix.startsWith(`${base}/`)) {
    return suffix;
  }
  return `${base}${suffix}`;
};

const readErrorBody = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    return await response.text();
  } catch {
    return null;
  }
};

const extractMessage = (details: unknown) => {
  if (!details || typeof details !== 'object') {
    return null;
  }
  const typed = details as {
    message?: unknown;
    reason?: unknown;
    error?: { reason?: unknown };
  };
  if (typed.message) {
    return String(typed.message);
  }
  if (typed.reason) {
    return String(typed.reason);
  }
  if (typed.error?.reason) {
    return String(typed.error.reason);
  }
  return null;
};

type TokenResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSec: number;
};

let refreshPromise: Promise<boolean> | null = null;

const shouldAttemptRefresh = (path: string) => {
  const pathname = resolvePathname(path);
  return !(pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/'));
};

const tryRefreshAccessToken = async () => {
  try {
    const response = await fetch(buildApiUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      return false;
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return false;
    }
    const data = (await response.json()) as TokenResponse;
    if (!data?.accessToken || typeof data.expiresInSec !== 'number') {
      return false;
    }
    const authStore = useAuthStore();
    authStore.setAccessToken(data.accessToken, data.expiresInSec);
    return true;
  } catch {
    return false;
  }
};

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = tryRefreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

type FetchWithAuthOptions = {
  retry?: boolean;
  acceptedStatuses?: readonly number[];
};

const fetchWithAuth = async (path: string, init: RequestInit = {}, options: FetchWithAuthOptions = {}): Promise<Response> => {
  const retry = options.retry ?? true;
  const acceptedStatuses = options.acceptedStatuses ?? [];
  const headers = new Headers(init.headers ?? {});
  const authStore = useAuthStore();
  const accessToken = authStore.getAccessToken();
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok && !acceptedStatuses.includes(response.status)) {
    if (response.status === 401 && retry && shouldAttemptRefresh(path)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return fetchWithAuth(path, init, {
          retry: false,
          acceptedStatuses,
        });
      }
      authStore.clearAccessToken();
      globalThis.dispatchEvent(new CustomEvent('auth:logout'));
    }
    const details = await readErrorBody(response);
    const message = typeof details === 'string' ? details : (extractMessage(details) ?? response.statusText);
    throw new ApiError(response.status, message, details ?? undefined);
  }

  return response;
};

const request = async <T>(path: string, init: RequestInit = {}, retry = true): Promise<T> => {
  const response = await fetchWithAuth(path, init, { retry });

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
};

const requestBlob = async (path: string, init: RequestInit = {}, retry = true) => {
  const response = await fetchWithAuth(path, init, { retry });
  return response.blob();
};

const requestRedirectLocation = async (path: string, init: RequestInit = {}, retry = true) => {
  const response = await fetchWithAuth(
    path,
    {
      ...init,
      redirect: 'manual',
    },
    {
      retry,
      acceptedStatuses: REDIRECT_STATUSES,
    },
  );
  const location = response.headers.get('location') ?? response.headers.get('Location');
  if (!location) {
    throw new ApiError(500, '리다이렉트 위치가 비어있습니다.');
  }
  return location;
};

const requestBlobWithoutAuth = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
  });
  if (!response.ok) {
    const details = await readErrorBody(response);
    const message = typeof details === 'string' ? details : (extractMessage(details) ?? response.statusText);
    throw new ApiError(response.status, message, details ?? undefined);
  }
  return response.blob();
};

const post = async <T>(path: string, init: RequestInit = {}) => request<T>(path, { ...init, method: 'POST' });

const postJson = async <T>(path: string, body?: unknown, init: RequestInit = {}) => {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return request<T>(path, {
    ...init,
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
};

export { API_BASE_URL, ApiError, buildApiUrl, post, postJson, request, requestBlob, requestBlobWithoutAuth, requestRedirectLocation };
