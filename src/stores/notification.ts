import { defineStore } from 'pinia';
import { ref } from 'vue';

import { ApiError } from '../shared/lib/http/api';
import {
  deleteAllNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsReadByRedirectUrl,
} from '../features/notification';
import type { NotificationResponse } from '../features/notification';
import { subscribeNotificationRealtime } from '../features/realtime';
import type { NotificationRealtimeSubscription } from '../features/realtime';
import { useAuthStore } from './auth';

const DEFAULT_NOTIFICATION_PAGE_SIZE = 5;

const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<NotificationResponse[]>([]);
  const notificationLoading = ref(false);
  const notificationError = ref('');
  const notificationUnreadCount = ref(0);
  const notificationListDirty = ref(false);
  const notificationRealtimeSubscription = ref<NotificationRealtimeSubscription | null>(null);

  const authStore = useAuthStore();

  const resetNotificationState = () => {
    notifications.value = [];
    notificationLoading.value = false;
    notificationError.value = '';
    notificationUnreadCount.value = 0;
    notificationListDirty.value = false;
  };

  const loadUnreadCount = async () => {
    if (!authStore.isAuthenticated) {
      notificationUnreadCount.value = 0;
      return;
    }
    try {
      const data = await getNotifications(0, 1, false);
      notificationUnreadCount.value = data.totalElements;
    } catch {
      notificationUnreadCount.value = 0;
    }
  };

  const refreshUnreadCount = async () => {
    await loadUnreadCount();
  };

  const loadNotifications = async (pageSize = DEFAULT_NOTIFICATION_PAGE_SIZE) => {
    if (!authStore.isAuthenticated) {
      resetNotificationState();
      return;
    }
    notificationError.value = '';
    notificationLoading.value = true;
    try {
      const data = await getNotifications(0, pageSize);
      notifications.value = data.items;
      await loadUnreadCount();
      notificationListDirty.value = false;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        notificationError.value = '로그인이 필요합니다.';
        notifications.value = [];
        notificationUnreadCount.value = 0;
        return;
      }
      notificationError.value = error instanceof ApiError ? error.message : '알림을 불러오지 못했습니다.';
    } finally {
      notificationLoading.value = false;
    }
  };

  const markAsRead = async (notification: NotificationResponse) => {
    notificationError.value = '';
    try {
      if (notification.redirectUrl && notification.redirectUrl.trim().length > 0) {
        await markNotificationsReadByRedirectUrl(notification.redirectUrl);
        notifications.value = notifications.value.map((item) => {
          if (item.redirectUrl === notification.redirectUrl) {
            return {
              ...item,
              read: true,
            };
          }
          return item;
        });
      } else {
        const updated = await markNotificationRead(notification.id);
        const index = notifications.value.findIndex((item) => item.id === notification.id);
        if (index >= 0) {
          notifications.value[index] = updated;
        }
      }
      await refreshUnreadCount();
      notificationListDirty.value = false;
    } catch (error) {
      notificationError.value = error instanceof ApiError ? error.message : '알림 읽음 처리에 실패했습니다.';
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
      notifications.value = notifications.value.map((item) => ({
        ...item,
        read: true,
      }));
      await refreshUnreadCount();
      notificationListDirty.value = false;
    } catch (error) {
      notificationError.value = error instanceof ApiError ? error.message : '알림 읽음 처리에 실패했습니다.';
    }
  };

  const deleteAll = async () => {
    notificationError.value = '';
    try {
      await deleteAllNotifications();
      notifications.value = [];
      notificationUnreadCount.value = 0;
      notificationListDirty.value = false;
    } catch (error) {
      notificationError.value = error instanceof ApiError ? error.message : '알림 삭제에 실패했습니다.';
    }
  };

  const startNotificationRealtime = () => {
    stopNotificationRealtime();
    notificationRealtimeSubscription.value = subscribeNotificationRealtime({
      onUnreadCountChanged: async (event) => {
        const unreadCount = event.data?.unreadCount;
        if (typeof unreadCount === 'number' && Number.isInteger(unreadCount) && unreadCount >= 0) {
          notificationUnreadCount.value = unreadCount;
        } else {
          await loadUnreadCount();
        }
        notificationListDirty.value = true;
      },
    });
  };

  const stopNotificationRealtime = () => {
    notificationRealtimeSubscription.value?.close();
    notificationRealtimeSubscription.value = null;
  };

  return {
    deleteAll,
    loadNotifications,
    loadUnreadCount,
    markAllAsRead,
    markAsRead,
    notificationError,
    notificationListDirty,
    notificationLoading,
    notificationUnreadCount,
    notifications,
    refreshUnreadCount,
    resetNotificationState,
    startNotificationRealtime,
    stopNotificationRealtime,
  };
});

export { useNotificationStore };
