<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { ApiError } from '../lib/api';
import { formatNotificationMessage } from '../lib/notifications';
import { applyTheme } from '../lib/theme';
import { logout } from '../services/auth';
import { removeNotificationPresence, updateNotificationPresence } from '../services/notificationPresence';
import {
  deleteAllNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsReadByRedirectUrl,
} from '../services/notifications';
import type { NotificationResponse } from '../services/notifications';
import { subscribeNotificationRealtime } from '../services/realtime';
import type { NotificationRealtimeSubscription } from '../services/realtime';
import { clearAccessToken, displayName, isAuthenticated, profileImageUrl, userPoint } from '../stores/auth';
import defaultAvatar from '../assets/default-avatar.svg';
import iconBell from '../assets/icons/icon-bell.svg';
import iconMoon from '../assets/icons/icon-moon.svg';
import iconSearch from '../assets/icons/icon-search.svg';
import iconStack from '../assets/icons/icon-stack.svg';
import iconSun from '../assets/icons/icon-sun.svg';

const emit = defineEmits<{
  (event: 'toggle-menu'): void;
}>();

const route = useRoute();
const router = useRouter();
const isDark = ref(false);
const isProfileMenuOpen = ref(false);
const isNotificationMenuOpen = ref(false);
const profileMenuRef = ref<HTMLDivElement | null>(null);
const profileButtonRef = ref<HTMLButtonElement | null>(null);
const notificationMenuRef = ref<HTMLDivElement | null>(null);
const notificationButtonRef = ref<HTMLButtonElement | null>(null);
const resolvedAvatar = computed(() => profileImageUrl.value ?? defaultAvatar);
const resolvedDisplayName = computed(() => displayName.value ?? '사용자');
const resolvedPoint = computed(() => userPoint.value.toLocaleString());
const notifications = ref<NotificationResponse[]>([]);
const notificationLoading = ref(false);
const notificationError = ref('');
const notificationUnreadCount = ref(0);
const notificationRealtimeSubscription = ref<NotificationRealtimeSubscription | null>(null);
const notificationListDirty = ref(false);
const notificationPresenceSessionId = ref<string | null>(null);
const notificationPresenceHeartbeatTimer = ref<number | null>(null);
const notificationPageSize = 5;
const hasUnreadNotifications = computed(() => notificationUnreadCount.value > 0);
const searchKeyword = ref('');
const NOTIFICATION_PRESENCE_SESSION_KEY = 'notification_presence_session_id';
const NOTIFICATION_PRESENCE_HEARTBEAT_MS = 15_000;

onMounted(() => {
  isDark.value = globalThis.document?.documentElement.classList.contains('dark') ?? false;
  if (!globalThis.document) {
    return;
  }
  globalThis.document.addEventListener('click', handleDocumentClick);
  globalThis.document.addEventListener('keydown', handleDocumentKeydown);
  globalThis.addEventListener('auth:logout', handleAuthLogout);
});

watch(
  () => route.query.q,
  (value) => {
    searchKeyword.value = typeof value === 'string' ? value : '';
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopNotificationRealtime();
  stopNotificationPresence(true);
  if (!globalThis.document) {
    return;
  }
  globalThis.document.removeEventListener('click', handleDocumentClick);
  globalThis.document.removeEventListener('keydown', handleDocumentKeydown);
  globalThis.removeEventListener('auth:logout', handleAuthLogout);
});

const openLogin = () => {
  closeNotificationMenu();
  closeProfileMenu();
  if (router.currentRoute.value.path !== '/login') {
    router.push('/login');
  }
};

const openSearch = async () => {
  closeNotificationMenu();
  closeProfileMenu();
  const trimmed = searchKeyword.value.trim();
  if (trimmed) {
    await router.push({ path: '/search', query: { q: trimmed, type: 'ALL', order: 'LATEST', page: '0' } });
    return;
  }
  await router.push('/search');
};

const openMyPage = async () => {
  closeProfileMenu();
  if (router.currentRoute.value.path !== '/mypage') {
    await router.push('/mypage');
  }
};

const openBoardCreate = async () => {
  closeProfileMenu();
  if (router.currentRoute.value.path !== '/boards/create') {
    await router.push('/boards/create');
  }
};

const toggleTheme = () => {
  isDark.value = !isDark.value;
  applyTheme(isDark.value ? 'dark' : 'light');
};

const toggleProfileMenu = () => {
  isNotificationMenuOpen.value = false;
  isProfileMenuOpen.value = !isProfileMenuOpen.value;
};

const closeProfileMenu = () => {
  isProfileMenuOpen.value = false;
};

const toggleNotificationMenu = async () => {
  if (isNotificationMenuOpen.value) {
    closeNotificationMenu();
    return;
  }
  closeProfileMenu();
  isNotificationMenuOpen.value = true;
  if (notificationListDirty.value || notifications.value.length === 0) {
    await loadNotifications();
  }
};

const closeNotificationMenu = () => {
  isNotificationMenuOpen.value = false;
};

const handleLogout = async () => {
  try {
    stopNotificationPresence(true);
    await logout();
  } finally {
    clearAccessToken();
    closeNotificationMenu();
    closeProfileMenu();
    await router.push('/');
  }
};

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node | null;
  const menuEl = profileMenuRef.value;
  const buttonEl = profileButtonRef.value;
  const notificationMenuEl = notificationMenuRef.value;
  const notificationButtonEl = notificationButtonRef.value;

  const clickedProfile = menuEl?.contains(target) || buttonEl?.contains(target);
  const clickedNotification = notificationMenuEl?.contains(target) || notificationButtonEl?.contains(target);

  if (!clickedProfile) {
    closeProfileMenu();
  }
  if (!clickedNotification) {
    closeNotificationMenu();
  }
};

const handleDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeProfileMenu();
    closeNotificationMenu();
  }
};

const formatNotificationDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
  });
};

const loadNotifications = async () => {
  if (!isAuthenticated.value) {
    notifications.value = [];
    notificationError.value = '';
    notificationUnreadCount.value = 0;
    notificationListDirty.value = false;
    return;
  }
  notificationError.value = '';
  notificationLoading.value = true;
  try {
    const data = await getNotifications(0, notificationPageSize);
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

const handleSearch = async () => {
  const trimmed = searchKeyword.value.trim();
  if (!trimmed) {
    return;
  }
  await router.push({ path: '/search', query: { q: trimmed, type: 'ALL', order: 'LATEST', page: '0' } });
};

const loadUnreadCount = async () => {
  if (!isAuthenticated.value) {
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

const buildPresenceSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `presence-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

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

const resolvePresenceViewType = () => {
  if (route.name === 'home') {
    return 'HOME' as const;
  }
  if (route.name === 'article-detail') {
    return 'ARTICLE_DETAIL' as const;
  }
  return 'OTHER' as const;
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
  if (!removePresence) {
    return;
  }
  if (!isAuthenticated.value) {
    return;
  }
  const sessionId = ensurePresenceSessionId();
  void removeNotificationPresence(sessionId).catch(() => {});
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

      if (isNotificationMenuOpen.value) {
        await loadNotifications();
        return;
      }
      notificationListDirty.value = true;
    },
  });
};

const stopNotificationRealtime = () => {
  notificationRealtimeSubscription.value?.close();
  notificationRealtimeSubscription.value = null;
};

watch(
  isAuthenticated,
  (authenticated) => {
    if (!authenticated) {
      stopNotificationRealtime();
      stopNotificationPresence(false);
      notificationUnreadCount.value = 0;
      notificationListDirty.value = false;
      return;
    }
    startNotificationRealtime();
    startNotificationPresence();
    void loadUnreadCount();
  },
  { immediate: true },
);

watch([() => route.fullPath, isNotificationMenuOpen], () => {
  if (!isAuthenticated.value) {
    return;
  }
  void syncNotificationPresence();
});

const handleAuthLogout = () => {
  stopNotificationRealtime();
  stopNotificationPresence(false);
  notificationUnreadCount.value = 0;
  notificationListDirty.value = false;
  notifications.value = [];
  notificationError.value = '';
  closeNotificationMenu();
  closeProfileMenu();
};

const handleNotificationClick = async (notification: NotificationResponse) => {
  if (!notification.read) {
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
  }
  closeNotificationMenu();
  if (!notification.redirectUrl) {
    return;
  }
  if (notification.redirectUrl.startsWith('http')) {
    globalThis.location.href = notification.redirectUrl;
    return;
  }
  await router.push(notification.redirectUrl);
};

const handleMarkAllRead = async () => {
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

const handleDeleteAllNotifications = async () => {
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
</script>

<template>
  <header
    class="sticky top-0 z-40 h-16 border-b border-slate-200/80 bg-white/95 text-slate-900 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/95 dark:text-slate-100"
  >
    <div class="flex h-full w-full items-center gap-4 px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="사이드 메뉴 열기"
          @click="emit('toggle-menu')"
        >
          <img :src="iconStack" alt="" aria-hidden="true" class="h-5 w-5" />
        </button>

        <RouterLink to="/" class="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          <span class="hidden sm:inline">MockTalk</span>
        </RouterLink>
      </div>

      <div class="flex flex-1 items-center justify-center">
        <div class="hidden w-full max-w-2xl items-center sm:flex">
          <label class="sr-only" for="global-search">검색</label>
          <input
            id="global-search"
            v-model="searchKeyword"
            type="search"
            placeholder="검색"
            class="h-11 w-full rounded-l-full border border-slate-200/80 bg-white px-5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
            @keydown.enter.prevent="handleSearch"
          />
          <button
            type="button"
            class="flex h-11 w-14 items-center justify-center rounded-r-full border border-l-0 border-slate-200/80 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="검색"
            @click="handleSearch"
          >
            <img :src="iconSearch" alt="" aria-hidden="true" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white sm:hidden"
          aria-label="검색"
          @click="openSearch"
        >
          <img :src="iconSearch" alt="" aria-hidden="true" class="h-5 w-5" />
        </button>

        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="다크/화이트 모드 전환"
          @click="toggleTheme"
        >
          <img v-if="isDark" :src="iconSun" alt="" aria-hidden="true" class="h-5 w-5" />
          <img v-else :src="iconMoon" alt="" aria-hidden="true" class="h-5 w-5" />
        </button>

        <div class="relative">
          <button
            ref="notificationButtonRef"
            type="button"
            class="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="알림"
            aria-haspopup="menu"
            :aria-expanded="isNotificationMenuOpen"
            @click="toggleNotificationMenu"
          >
            <img :src="iconBell" alt="" aria-hidden="true" class="h-5 w-5" />
            <span
              v-if="notificationUnreadCount > 0"
              class="absolute right-1 top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white"
              aria-hidden="true"
            >
              {{ notificationUnreadCount > 9 ? '9+' : notificationUnreadCount }}
            </span>
          </button>

          <div
            v-if="isNotificationMenuOpen"
            ref="notificationMenuRef"
            class="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950"
            role="menu"
          >
            <div class="flex items-center justify-between px-4 py-3">
              <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">알림</p>
              <div class="flex items-center gap-2">
                <button
                  v-if="notifications.length"
                  type="button"
                  class="text-xs font-semibold text-red-500 transition hover:text-red-600 dark:text-red-300 dark:hover:text-red-200"
                  @click="handleDeleteAllNotifications"
                >
                  전체 삭제
                </button>
                <button
                  v-if="hasUnreadNotifications"
                  type="button"
                  class="text-xs font-semibold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  @click="handleMarkAllRead"
                >
                  모두 읽음
                </button>
              </div>
            </div>
            <div class="h-px bg-slate-200/70 dark:bg-slate-800" role="presentation"></div>

            <div v-if="!isAuthenticated" class="p-4 text-sm text-slate-500 dark:text-slate-400">
              <p>로그인이 필요합니다.</p>
              <button
                type="button"
                class="mt-3 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                @click="openLogin"
              >
                로그인하기
              </button>
            </div>
            <div v-else class="max-h-80 overflow-y-auto">
              <div v-if="notificationLoading" class="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">불러오는 중...</div>
              <div v-else-if="notificationError" class="px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-300">
                {{ notificationError }}
              </div>
              <div v-else-if="notifications.length === 0" class="px-4 py-6 text-center text-sm text-slate-400">새 알림이 없습니다.</div>
              <div v-else>
                <button
                  v-for="notification in notifications"
                  :key="notification.id"
                  type="button"
                  class="flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
                  @click="handleNotificationClick(notification)"
                >
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span v-if="!notification.read" class="inline-flex h-2 w-2 rounded-full bg-rose-400" aria-hidden="true"></span>
                      <span
                        class="text-xs font-semibold"
                        :class="notification.read ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'"
                      >
                        {{ notification.read ? '읽음' : '새 알림' }}
                      </span>
                    </div>
                    <span class="text-xs text-slate-400">{{ formatNotificationDate(notification.createdAt) }}</span>
                  </div>
                  <p class="text-sm" :class="notification.read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200'">
                    {{ formatNotificationMessage(notification) }}
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          v-if="!isAuthenticated"
          type="button"
          class="inline-flex h-10 items-center justify-center rounded-full border border-slate-200/80 bg-slate-100 px-4 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          aria-label="로그인"
          @click="openLogin"
        >
          로그인
        </button>
        <div v-else class="relative">
          <button
            ref="profileButtonRef"
            type="button"
            class="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-slate-200/80 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
            aria-label="프로필"
            aria-haspopup="menu"
            :aria-expanded="isProfileMenuOpen"
            @click="toggleProfileMenu"
          >
            <img :src="resolvedAvatar" alt="프로필 이미지" class="h-full w-full object-cover" />
          </button>
          <div
            v-if="isProfileMenuOpen"
            ref="profileMenuRef"
            class="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950"
            role="menu"
          >
            <div class="px-4 py-3">
              <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {{ resolvedDisplayName }}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">포인트 {{ resolvedPoint }}P</p>
            </div>
            <div class="h-px bg-slate-200/70 dark:bg-slate-800" role="presentation"></div>
            <button
              type="button"
              class="flex w-full items-center px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
              role="menuitem"
              @click="openMyPage"
            >
              마이페이지
            </button>
            <button
              type="button"
              class="flex w-full items-center px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
              role="menuitem"
              @click="openBoardCreate"
            >
              커뮤니티 개설
            </button>
            <button
              type="button"
              class="flex w-full items-center px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
              role="menuitem"
              @click="handleLogout"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
