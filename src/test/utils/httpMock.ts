import { vi } from 'vitest';

type FetchMockValue = Response | Error;

const JSON_CONTENT_TYPE = { 'content-type': 'application/json' };

export const createJsonResponse = <T>(body: T, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      ...JSON_CONTENT_TYPE,
      ...(init.headers ?? {}),
    },
  });

export const createTimeoutError = (message = 'network timeout'): Error => {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
};

export const mockFetchSequence = (...values: FetchMockValue[]) => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  values.forEach((value) => {
    if (value instanceof Error) {
      fetchSpy.mockRejectedValueOnce(value);
      return;
    }
    fetchSpy.mockResolvedValueOnce(value);
  });
  return fetchSpy;
};
