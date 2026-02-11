import { API_BASE_URL } from '../lib/api';
import { getAccessToken, setAccessToken } from '../stores/auth';

export type RealtimeEventType = 'CONNECTED' | 'HEARTBEAT' | 'COMMENT_CHANGED' | 'REACTION_CHANGED';
export type NotificationRealtimeEventType = 'CONNECTED' | 'HEARTBEAT' | 'UNREAD_COUNT_CHANGED';

export interface RealtimeEventEnvelope<T = unknown> {
  eventId: string;
  boardId: number;
  type: RealtimeEventType;
  occurredAt: string;
  data: T;
}

export interface BoardRealtimeHandlers {
  onConnected?: (event: RealtimeEventEnvelope) => void;
  onHeartbeat?: (event: RealtimeEventEnvelope) => void;
  onCommentChanged?: (event: RealtimeEventEnvelope<Record<string, unknown>>) => void;
  onReactionChanged?: (event: RealtimeEventEnvelope<Record<string, unknown>>) => void;
  onError?: (event: Event) => void;
}

export interface BoardRealtimeSubscription {
  close: () => void;
}

export interface NotificationRealtimeEventEnvelope<T = unknown> {
  eventId: string;
  userId: number;
  type: NotificationRealtimeEventType;
  occurredAt: string;
  data: T;
}

export interface NotificationRealtimeHandlers {
  onConnected?: (event: NotificationRealtimeEventEnvelope) => void;
  onHeartbeat?: (event: NotificationRealtimeEventEnvelope) => void;
  onUnreadCountChanged?: (event: NotificationRealtimeEventEnvelope<{ unreadCount?: number }>) => void;
  onError?: (event: Event) => void;
}

export interface NotificationRealtimeSubscription {
  close: () => void;
}

const buildRealtimeUrl = (boardId: number) => {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${base}/realtime/boards/${boardId}/stream`;
};

const buildNotificationRealtimeUrl = (accessToken: string) => {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const params = new URLSearchParams({ accessToken });
  return `${base}/realtime/notifications/stream?${params.toString()}`;
};

const buildRefreshUrl = () => {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${base}/auth/refresh`;
};

const parseEnvelope = (raw: string) => {
  try {
    return JSON.parse(raw) as RealtimeEventEnvelope<Record<string, unknown>>;
  } catch {
    return null;
  }
};

const subscribeBoardRealtime = (boardId: number, handlers: BoardRealtimeHandlers = {}): BoardRealtimeSubscription => {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return { close: () => {} };
  }

  const source = new EventSource(buildRealtimeUrl(boardId), { withCredentials: true });

  source.addEventListener('connected', (event) => {
    const parsed = parseEnvelope((event as MessageEvent<string>).data);
    if (parsed) {
      handlers.onConnected?.(parsed);
    }
  });

  source.addEventListener('heartbeat', (event) => {
    const parsed = parseEnvelope((event as MessageEvent<string>).data);
    if (parsed) {
      handlers.onHeartbeat?.(parsed);
    }
  });

  source.addEventListener('comment_changed', (event) => {
    const parsed = parseEnvelope((event as MessageEvent<string>).data);
    if (parsed) {
      handlers.onCommentChanged?.(parsed);
    }
  });

  source.addEventListener('reaction_changed', (event) => {
    const parsed = parseEnvelope((event as MessageEvent<string>).data);
    if (parsed) {
      handlers.onReactionChanged?.(parsed);
    }
  });

  source.onerror = (event) => {
    handlers.onError?.(event);
  };

  return {
    close: () => {
      source.close();
    },
  };
};

const parseNotificationEnvelope = (raw: string) => {
  try {
    return JSON.parse(raw) as NotificationRealtimeEventEnvelope<Record<string, unknown>>;
  } catch {
    return null;
  }
};

const computeReconnectDelayMs = (attempt: number) => {
  const cappedAttempt = Math.min(attempt, 5);
  const baseDelay = 1000 * 2 ** cappedAttempt;
  const jitter = Math.floor(Math.random() * 500);
  return Math.min(baseDelay + jitter, 30_000);
};

const tryRefreshAccessTokenForRealtime = async () => {
  try {
    const response = await fetch(buildRefreshUrl(), {
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
    const data = (await response.json()) as { accessToken?: string; expiresInSec?: number };
    if (!data.accessToken || typeof data.expiresInSec !== 'number') {
      return false;
    }
    setAccessToken(data.accessToken, data.expiresInSec);
    return true;
  } catch {
    return false;
  }
};

const subscribeNotificationRealtime = (handlers: NotificationRealtimeHandlers = {}): NotificationRealtimeSubscription => {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return { close: () => {} };
  }

  let source: EventSource | null = null;
  let reconnectTimer: number | null = null;
  let reconnectAttempt = 0;
  let closed = false;

  const clearReconnectTimer = () => {
    if (reconnectTimer === null) {
      return;
    }
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const scheduleReconnect = (delayMs?: number) => {
    if (closed) {
      return;
    }
    clearReconnectTimer();
    const resolvedDelay = typeof delayMs === 'number' ? delayMs : computeReconnectDelayMs(reconnectAttempt);
    reconnectAttempt += 1;
    reconnectTimer = window.setTimeout(() => {
      connect();
    }, resolvedDelay);
  };

  const connect = () => {
    if (closed) {
      return;
    }

    const accessToken = getAccessToken();
    if (!accessToken) {
      scheduleReconnect();
      return;
    }

    source = new EventSource(buildNotificationRealtimeUrl(accessToken), {
      withCredentials: true,
    });

    source.addEventListener('connected', (event) => {
      reconnectAttempt = 0;
      const parsed = parseNotificationEnvelope((event as MessageEvent<string>).data);
      if (parsed) {
        handlers.onConnected?.(parsed);
      }
    });

    source.addEventListener('heartbeat', (event) => {
      const parsed = parseNotificationEnvelope((event as MessageEvent<string>).data);
      if (parsed) {
        handlers.onHeartbeat?.(parsed);
      }
    });

    source.addEventListener('unread_count_changed', (event) => {
      reconnectAttempt = 0;
      const parsed = parseNotificationEnvelope((event as MessageEvent<string>).data);
      if (parsed) {
        handlers.onUnreadCountChanged?.(parsed as NotificationRealtimeEventEnvelope<{ unreadCount?: number }>);
      }
    });

    source.onerror = async (event) => {
      handlers.onError?.(event);
      source?.close();
      source = null;

      const refreshed = await tryRefreshAccessTokenForRealtime();
      if (refreshed) {
        reconnectAttempt = 0;
        scheduleReconnect(300);
        return;
      }
      scheduleReconnect();
    };
  };

  connect();

  return {
    close: () => {
      closed = true;
      clearReconnectTimer();
      source?.close();
      source = null;
    },
  };
};

export { subscribeBoardRealtime, subscribeNotificationRealtime };
