import { request } from '../lib/api';

export type NotificationPresenceViewType = 'HOME' | 'ARTICLE_DETAIL' | 'OTHER';

export interface NotificationPresenceUpdateRequest {
  sessionId: string;
  viewType: NotificationPresenceViewType;
  articleId: number | null;
  notificationPanelOpen: boolean;
}

const updateNotificationPresence = async (payload: NotificationPresenceUpdateRequest) => {
  await request('/realtime/notifications/presence', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};

const removeNotificationPresence = async (sessionId: string) => {
  await request(`/realtime/notifications/presence/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
};

export { removeNotificationPresence, updateNotificationPresence };
