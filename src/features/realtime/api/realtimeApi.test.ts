import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../../stores/auth';

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly url: string;
  readonly withCredentials: boolean;
  readonly listeners = new Map<string, EventListener>();
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn();

  constructor(url: string | URL, init?: EventSourceInit) {
    this.url = String(url);
    this.withCredentials = init?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
    if (typeof listener === 'function') {
      this.listeners.set(type, listener as EventListener);
    }
  }

  removeEventListener(type: string) {
    this.listeners.delete(type);
  }
}

describe('features/realtime realtimeApi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    setActivePinia(createPinia());
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
    Object.defineProperty(window, 'EventSource', {
      value: MockEventSource,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('알림 realtime 구독은 ticket을 발급받은 뒤 ticket query로 stream을 연다', async () => {
    // given
    const authStore = useAuthStore();
    authStore.setAccessToken('access-token', 60);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            ticket: 'ticket-123',
            expiresInSec: 30,
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { subscribeNotificationRealtime } = await import('./realtimeApi');

    // when
    const subscription = subscribeNotificationRealtime();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(0);
    await flushPromises();

    // then
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/realtime/notifications/ticket');
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0]?.url).toContain('/realtime/notifications/stream?ticket=ticket-123');
    expect(MockEventSource.instances[0]?.url).not.toContain('accessToken=');
    expect(MockEventSource.instances[0]?.withCredentials).toBe(true);

    subscription.close();
  });

  it('stream 에러가 발생하면 새 ticket을 발급받아 재연결한다', async () => {
    // given
    const authStore = useAuthStore();
    authStore.setAccessToken('access-token', 60);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              ticket: 'ticket-1',
              expiresInSec: 30,
            },
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              ticket: 'ticket-2',
              expiresInSec: 30,
            },
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const { subscribeNotificationRealtime } = await import('./realtimeApi');

    // when
    const subscription = subscribeNotificationRealtime();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(0);
    await flushPromises();
    MockEventSource.instances[0]?.onerror?.(new Event('error'));
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();

    // then
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[0]?.url).toContain('ticket=ticket-1');
    expect(MockEventSource.instances[1]?.url).toContain('ticket=ticket-2');

    subscription.close();
    await flushPromises();
  });
});
