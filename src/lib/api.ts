import { clearAccessToken, getAccessToken, setAccessToken } from '../stores/auth';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl.trim() : '/api';

class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const buildUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const suffix = path.startsWith('/') ? path : `/${path}`;
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

const shouldAttemptRefresh = (path: string) => !path.startsWith('/auth/');

const tryRefreshAccessToken = async () => {
  try {
    const response = await fetch(buildUrl('/auth/refresh'), {
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
    setAccessToken(data.accessToken, data.expiresInSec);
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

const request = async <T>(path: string, init: RequestInit = {}, retry = true): Promise<T> => {
  const headers = new Headers(init.headers ?? {});
  const accessToken = getAccessToken();
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401 && retry && shouldAttemptRefresh(path)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request<T>(path, init, false);
      }
      clearAccessToken();
      globalThis.dispatchEvent(new CustomEvent('auth:logout'));
    }
    const details = await readErrorBody(response);
    const message =
      typeof details === 'string' ? details : (extractMessage(details) ?? response.statusText);
    throw new ApiError(response.status, message, details ?? undefined);
  }

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
};

const post = async <T>(path: string, init: RequestInit = {}) =>
  request<T>(path, { ...init, method: 'POST' });

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

export { API_BASE_URL, ApiError, post, postJson, request };
