<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { logout } from '../../features/auth';
import { useNotificationPresence } from '../../features/notification';
import type { NotificationResponse } from '../../features/notification';
import { formatNotificationMessage } from '../../shared/lib/notifications';
import { applyTheme } from '../../shared/lib/theme';
import { useAuthStore } from '../../stores/auth';
import { useNotificationStore } from '../../stores/notification';
import defaultAvatar from '../../assets/default-avatar.svg';
import iconBell from '../../assets/icons/icon-bell.svg';
import iconMoon from '../../assets/icons/icon-moon.svg';
import iconSearch from '../../assets/icons/icon-search.svg';
import iconStack from '../../assets/icons/icon-stack.svg';
import iconSun from '../../assets/icons/icon-sun.svg';

const emit = defineEmits<{
  (event: 'toggle-menu'): void;
}>();

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const { displayName, isAuthenticated, isManagerOrAdmin, profileImageUrl, userPoint } = storeToRefs(authStore);
const { notificationError, notificationListDirty, notificationLoading, notificationUnreadCount, notifications } = storeToRefs(notificationStore);
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
const hasUnreadNotifications = computed(() => notificationUnreadCount.value > 0);
const notificationUnreadLabel = computed(() => (notificationUnreadCount.value > 9 ? '9+' : String(notificationUnreadCount.value)));
const notificationButtonLabel = computed(() => {
  if (notificationUnreadCount.value <= 0) {
    return '알림';
  }
  return `알림 ${notificationUnreadCount.value}개`;
});
const quickLinks = computed(() => {
  const items = [
    { label: '홈', to: '/' },
    { label: '커뮤니티', to: '/boards' },
    { label: '콘텐츠', to: '/contents' },
    { label: '보관함', to: '/bookmarks' },
  ];

  if (isManagerOrAdmin.value) {
    items.push({ label: '백오피스', to: '/admin' });
  }

  return items;
});
const searchKeyword = ref('');
const menuPanelClass =
  'absolute right-0 top-full mt-3 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-950/95';
const { stopNotificationPresence } = useNotificationPresence({
  isAuthenticated,
  isNotificationMenuOpen,
});

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
  notificationStore.stopNotificationRealtime();
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
    await notificationStore.loadNotifications();
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
    authStore.clearAccessToken();
    closeNotificationMenu();
    closeProfileMenu();
    globalThis.dispatchEvent(new CustomEvent('auth:logout'));
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

const handleSearch = async () => {
  const trimmed = searchKeyword.value.trim();
  if (!trimmed) {
    return;
  }
  await router.push({ path: '/search', query: { q: trimmed, type: 'ALL', order: 'LATEST', page: '0' } });
};

watch(
  isAuthenticated,
  (authenticated) => {
    if (!authenticated) {
      notificationStore.stopNotificationRealtime();
      notificationStore.resetNotificationState();
      return;
    }
    notificationStore.startNotificationRealtime();
    void notificationStore.refreshUnreadCount();
  },
  { immediate: true },
);

watch([isNotificationMenuOpen, notificationListDirty], ([menuOpen, listDirty]) => {
  if (!menuOpen || !listDirty) {
    return;
  }
  void notificationStore.loadNotifications();
});

const handleAuthLogout = () => {
  notificationStore.stopNotificationRealtime();
  stopNotificationPresence(false);
  notificationStore.resetNotificationState();
  closeNotificationMenu();
  closeProfileMenu();
};

const handleNotificationClick = async (notification: NotificationResponse) => {
  if (!notification.read) {
    await notificationStore.markAsRead(notification);
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
  await notificationStore.markAllAsRead();
};

const handleDeleteAllNotifications = async () => {
  await notificationStore.deleteAll();
};

const isQuickLinkActive = (path: string) => {
  if (path === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(path);
};
</script>

<template>
  <header class="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4 lg:px-5">
    <div
      class="mx-auto flex w-full max-w-[1680px] flex-col gap-3 rounded-[1.6rem] border border-slate-200/80 bg-white/82 px-3 py-3 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/82"
    >
      <div class="flex items-center gap-3">
        <div class="flex shrink-0 items-center gap-3">
          <button type="button" class="ui-icon-button" aria-label="사이드 메뉴 열기" @click="emit('toggle-menu')">
            <img :src="iconStack" alt="" aria-hidden="true" class="h-5 w-5" />
          </button>

          <RouterLink to="/" class="min-w-0">
            <div class="flex items-center gap-3">
              <div class="bg-brand-600 hidden h-10 w-10 items-center justify-center rounded-2xl text-sm font-black text-white sm:flex">MT</div>
              <div class="min-w-0">
                <p class="text-[11px] font-bold tracking-[0.22em] text-slate-400 uppercase dark:text-slate-500">Community</p>
                <p class="truncate text-base font-black tracking-tight text-slate-900 sm:text-lg dark:text-slate-100">MockTalk</p>
              </div>
            </div>
          </RouterLink>
        </div>

        <div class="hidden min-w-0 flex-1 md:block">
          <div
            class="flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/90 px-2 py-2 dark:border-slate-800/80 dark:bg-slate-900/80"
          >
            <label class="sr-only" for="global-search">검색</label>
            <input
              id="global-search"
              v-model="searchKeyword"
              type="search"
              placeholder="게시판, 게시글, 댓글, 사용자 검색"
              class="h-10 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
              @keydown.enter.prevent="handleSearch"
            />
            <button type="button" class="ui-button-primary h-10 px-4" aria-label="검색" @click="handleSearch">
              <img :src="iconSearch" alt="" aria-hidden="true" class="h-4 w-4" />
              <span>검색</span>
            </button>
          </div>
        </div>

        <div class="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <button type="button" class="ui-icon-button sm:hidden" aria-label="검색" @click="openSearch">
            <img :src="iconSearch" alt="" aria-hidden="true" class="h-5 w-5" />
          </button>

          <button type="button" class="ui-icon-button" aria-label="다크/화이트 모드 전환" @click="toggleTheme">
            <img v-if="isDark" :src="iconSun" alt="" aria-hidden="true" class="h-5 w-5" />
            <img v-else :src="iconMoon" alt="" aria-hidden="true" class="h-5 w-5" />
          </button>

          <div v-if="isAuthenticated" class="relative">
            <button
              ref="notificationButtonRef"
              type="button"
              class="ui-icon-button relative"
              :aria-label="notificationButtonLabel"
              aria-haspopup="menu"
              :aria-expanded="isNotificationMenuOpen"
              @click="toggleNotificationMenu"
            >
              <img :src="iconBell" alt="" aria-hidden="true" class="h-5 w-5" />
              <span
                v-if="notificationUnreadCount > 0"
                class="absolute top-1 right-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white"
                aria-hidden="true"
              >
                {{ notificationUnreadLabel }}
              </span>
            </button>

            <div v-if="isNotificationMenuOpen" ref="notificationMenuRef" :class="[menuPanelClass, 'w-[22rem]']" role="menu">
              <div class="flex items-center justify-between border-b border-slate-200/80 px-4 py-3.5 dark:border-slate-800/80">
                <div>
                  <p class="text-sm font-bold text-slate-900 dark:text-slate-100">알림</p>
                  <p class="text-[11px] text-slate-400 dark:text-slate-500">최근 활동과 상호작용을 빠르게 확인합니다.</p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    v-if="notifications.length"
                    type="button"
                    class="text-xs font-semibold text-rose-500 transition hover:text-rose-600 dark:text-rose-300 dark:hover:text-rose-200"
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

              <div class="ui-scrollbar max-h-88 overflow-y-auto p-3">
                <div v-if="notificationLoading" class="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">불러오는 중...</div>
                <div v-else-if="notificationError" class="ui-state ui-state-danger text-sm font-semibold">
                  {{ notificationError }}
                </div>
                <div v-else-if="notifications.length === 0" class="ui-state ui-state-empty px-4 py-7">새 알림이 없습니다.</div>
                <div v-else class="space-y-2">
                  <button
                    v-for="notification in notifications"
                    :key="notification.id"
                    type="button"
                    class="ui-list-row w-full cursor-pointer text-left"
                    @click="handleNotificationClick(notification)"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <span v-if="!notification.read" class="inline-flex h-2 w-2 rounded-full bg-rose-400" aria-hidden="true"></span>
                        <span
                          class="text-[11px] font-bold tracking-[0.16em] uppercase"
                          :class="notification.read ? 'text-slate-400 dark:text-slate-500' : 'text-brand-700 dark:text-brand-300'"
                        >
                          {{ notification.read ? '읽음' : '새 알림' }}
                        </span>
                      </div>
                      <span class="text-xs text-slate-400">{{ formatNotificationDate(notification.createdAt) }}</span>
                    </div>
                    <p
                      class="text-sm leading-6"
                      :class="notification.read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200'"
                    >
                      {{ formatNotificationMessage(notification) }}
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button v-if="!isAuthenticated" type="button" class="ui-button-ghost h-10 px-4 text-sm" aria-label="로그인" @click="openLogin">
            로그인
          </button>

          <div v-else class="relative">
            <button
              ref="profileButtonRef"
              type="button"
              class="ui-icon-button grid place-items-center overflow-hidden p-0"
              aria-label="프로필"
              aria-haspopup="menu"
              :aria-expanded="isProfileMenuOpen"
              @click="toggleProfileMenu"
            >
              <img :src="resolvedAvatar" alt="프로필 이미지" class="h-full w-full object-cover" />
            </button>
            <div v-if="isProfileMenuOpen" ref="profileMenuRef" :class="[menuPanelClass, 'w-64']" role="menu">
              <div class="border-b border-slate-200/80 px-4 py-4 dark:border-slate-800/80">
                <div class="flex items-center gap-3">
                  <div class="h-11 w-11 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                    <img :src="resolvedAvatar" alt="프로필 이미지" class="h-full w-full object-cover" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ resolvedDisplayName }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">포인트 {{ resolvedPoint }}P</p>
                  </div>
                </div>
              </div>
              <div class="p-3">
                <div class="space-y-2">
                  <button type="button" class="ui-list-row w-full cursor-pointer px-4 py-3 text-left" role="menuitem" @click="openMyPage">
                    <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">마이페이지</span>
                    <span class="text-xs text-slate-500 dark:text-slate-400">프로필과 활동 내역을 관리합니다.</span>
                  </button>
                  <button type="button" class="ui-list-row w-full cursor-pointer px-4 py-3 text-left" role="menuitem" @click="openBoardCreate">
                    <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">커뮤니티 개설</span>
                    <span class="text-xs text-slate-500 dark:text-slate-400">새 게시판을 만들고 운영을 시작합니다.</span>
                  </button>
                  <button
                    type="button"
                    class="ui-list-row w-full cursor-pointer border-rose-200/70 bg-rose-50/70 px-4 py-3 text-left dark:border-rose-900/40 dark:bg-rose-950/20"
                    role="menuitem"
                    @click="handleLogout"
                  >
                    <span class="text-sm font-semibold text-rose-600 dark:text-rose-200">로그아웃</span>
                    <span class="text-xs text-rose-500/90 dark:text-rose-300/80">현재 세션을 종료합니다.</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="hidden items-center justify-between gap-3 border-t border-slate-200/80 pt-3 xl:flex dark:border-slate-800/80">
        <nav class="ui-tab-list" aria-label="빠른 이동">
          <RouterLink
            v-for="item in quickLinks"
            :key="item.to"
            :to="item.to"
            class="ui-tab-button"
            :class="isQuickLinkActive(item.to) ? 'ui-tab-button-active' : ''"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div v-if="isAuthenticated" class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span class="ui-badge ui-badge-muted">로그인 중</span>
          <span>{{ resolvedDisplayName }}</span>
          <span>포인트 {{ resolvedPoint }}P</span>
        </div>
      </div>
    </div>
  </header>
</template>
