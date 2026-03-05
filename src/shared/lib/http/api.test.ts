import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAccessToken, getAccessToken, setAccessToken } from '../../../stores/auth';
import { ApiError, request } from './api';

const OLD_TOKEN = 'e30.eyJyb2xlIjoiVVNFUiJ9.old';
const NEW_TOKEN = 'e30.eyJyb2xlIjoiVVNFUiJ9.new';

describe('shared/lib/http/api characterization', () => {
  beforeEach(() => {
    clearAccessToken();
  });

  it('401 발생 시 refresh 성공 후 원래 요청을 재시도한다', async () => {
    // given
    setAccessToken(OLD_TOKEN, 60);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: NEW_TOKEN,
            tokenType: 'Bearer',
            expiresInSec: 3600,
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    // when
    const response = await request<{ ok: boolean }>('/articles');

    // then
    expect(response).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/articles');
    expect(fetchSpy.mock.calls[1]?.[0]).toBe('/api/auth/refresh');
    expect(fetchSpy.mock.calls[2]?.[0]).toBe('/api/articles');
    expect(getAccessToken()).toBe(NEW_TOKEN);
  });

  it('401 + refresh 실패 시 토큰을 제거하고 logout 이벤트를 발생시킨다', async () => {
    // given
    setAccessToken(OLD_TOKEN, 60);
    const onLogout = vi.fn();
    globalThis.addEventListener('auth:logout', onLogout);

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'refresh failed' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      );

    // when
    const requestPromise = request('/articles');

    // then
    await expect(requestPromise).rejects.toBeInstanceOf(ApiError);
    expect(getAccessToken()).toBeNull();
    expect(onLogout).toHaveBeenCalledTimes(1);

    globalThis.removeEventListener('auth:logout', onLogout);
  });
});
