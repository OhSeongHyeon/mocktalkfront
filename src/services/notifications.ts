import { request } from '../lib/api';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: unknown;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export type NotificationType =
  | 'ARTICLE_COMMENT'
  | 'COMMENT_REPLY'
  | 'BOARD_NOTICE'
  | 'SYSTEM'
  | 'REACTION'
  | 'MENTION';

export interface NotificationResponse {
  id: number;
  userId: number;
  senderId: number | null;
  senderName: string | null;
  senderHandle: string | null;
  notiType: NotificationType;
  redirectUrl: string | null;
  referenceType: string;
  referenceId: number;
  articleTitle: string | null;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getNotifications = async (page = 0, size = 10, read?: boolean) => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (typeof read === 'boolean') {
    params.set('read', String(read));
  }
  const response = await request<ApiEnvelope<PageResponse<NotificationResponse>>>(`/notifications?${params.toString()}`);
  return unwrap(response);
};

const markNotificationRead = async (id: number) => {
  const response = await request<ApiEnvelope<NotificationResponse>>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
  return unwrap(response);
};

const markAllNotificationsRead = async () => {
  const response = await request<ApiEnvelope<void>>('/notifications/read-all', {
    method: 'PATCH',
  });
  return unwrap(response);
};

const deleteNotification = async (id: number) => {
  const response = await request<ApiEnvelope<void>>(`/notifications/${id}`, {
    method: 'DELETE',
  });
  return unwrap(response);
};

const deleteAllNotifications = async () => {
  const response = await request<ApiEnvelope<void>>('/notifications', {
    method: 'DELETE',
  });
  return unwrap(response);
};

export {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
};
