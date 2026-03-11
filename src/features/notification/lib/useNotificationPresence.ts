import { ref, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';

import { removeNotificationPresence, updateNotificationPresence, type NotificationPresenceViewType } from '../api/notificationPresenceApi';

const NOTIFICATION_PRESENCE_SESSION_KEY = 'notification_presence_session_id';
const NOTIFICATION_PRESENCE_HEARTBEAT_MS = 15_000;

interface UseNotificationPresenceParams {
  isAuthenticated: Ref<boolean>;
  isNotificationMenuOpen: Ref<boolean>;
}

const buildPresenceSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `presence-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const useNotificationPresence = ({ isAuthenticated, isNotificationMenuOpen }: UseNotificationPresenceParams) => {
  const route = useRoute();
  const notificationPresenceSessionId = ref<string | null>(null);
  const notificationPresenceHeartbeatTimer = ref<number | null>(null);

  const ensurePresenceSessionId = () => {
    if (notificationPresenceSessionId.value) {
      return notificationPresenceSessionId.value;
    }
    if (typeof window === 'undefined') {
      const fallbackSessionId = buildPresenceSessionId();
      notificationPresenceSessionId.value = fallbackSessionId;
      return fallbackSessionId;
    }

    const savedSessionId = window.sessionStorage.getItem(NOTIFICATION_PRESENCE_SESSION_KEY);
    if (savedSessionId && savedSessionId.trim().length > 0) {
      notificationPresenceSessionId.value = savedSessionId;
      return savedSessionId;
    }

    const createdSessionId = buildPresenceSessionId();
    window.sessionStorage.setItem(NOTIFICATION_PRESENCE_SESSION_KEY, createdSessionId);
    notificationPresenceSessionId.value = createdSessionId;
    return createdSessionId;
  };

  const resolvePresenceViewType = (): NotificationPresenceViewType => {
    if (route.name === 'home') {
      return 'HOME';
    }
    if (route.name === 'article-detail') {
      return 'ARTICLE_DETAIL';
    }
    return 'OTHER';
  };

  const resolvePresenceArticleId = () => {
    if (route.name !== 'article-detail') {
      return null;
    }
    const rawArticleId = route.params.articleId;
    if (typeof rawArticleId !== 'string') {
      return null;
    }
    const parsedArticleId = Number(rawArticleId);
    if (!Number.isInteger(parsedArticleId) || parsedArticleId <= 0) {
      return null;
    }
    return parsedArticleId;
  };

  const syncNotificationPresence = async () => {
    if (!isAuthenticated.value) {
      return;
    }
    const sessionId = ensurePresenceSessionId();
    try {
      await updateNotificationPresence({
        sessionId,
        viewType: resolvePresenceViewType(),
        articleId: resolvePresenceArticleId(),
        notificationPanelOpen: isNotificationMenuOpen.value,
      });
    } catch {
      // presence 동기화 실패는 본 기능을 막지 않도록 무시한다.
    }
  };

  const clearNotificationPresenceHeartbeat = () => {
    if (notificationPresenceHeartbeatTimer.value === null) {
      return;
    }
    window.clearInterval(notificationPresenceHeartbeatTimer.value);
    notificationPresenceHeartbeatTimer.value = null;
  };

  const startNotificationPresence = () => {
    ensurePresenceSessionId();
    clearNotificationPresenceHeartbeat();
    void syncNotificationPresence();
    notificationPresenceHeartbeatTimer.value = window.setInterval(() => {
      void syncNotificationPresence();
    }, NOTIFICATION_PRESENCE_HEARTBEAT_MS);
  };

  const stopNotificationPresence = (removePresence: boolean) => {
    clearNotificationPresenceHeartbeat();
    if (!removePresence || !isAuthenticated.value) {
      return;
    }
    const sessionId = ensurePresenceSessionId();
    void removeNotificationPresence(sessionId).catch(() => {});
  };

  watch(
    isAuthenticated,
    (authenticated) => {
      if (!authenticated) {
        stopNotificationPresence(false);
        return;
      }
      startNotificationPresence();
    },
    { immediate: true },
  );

  watch([() => route.fullPath, isNotificationMenuOpen], () => {
    if (!isAuthenticated.value) {
      return;
    }
    void syncNotificationPresence();
  });

  return {
    stopNotificationPresence,
  };
};

export { useNotificationPresence };
