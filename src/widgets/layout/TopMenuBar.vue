<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { logout } from '../../features/auth';
import { useNotificationPresence } from '../../features/notification';
import type { NotificationResponse } from '../../features/notification';
import { formatNotificationMessage } from '../../shared/lib/notifications';
import { applyTheme, getThemeState, subscribeThemeChange } from '../../shared/lib/theme';
import type { ResolvedTheme } from '../../shared/lib/theme';
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
const { displayName, isAuthenticated, profileImageUrl, userPoint } = storeToRefs(authStore);
const { notificationError, notificationListDirty, notificationLoading, notificationUnreadCount, notifications } = storeToRefs(notificationStore);
const resolvedTheme = ref<ResolvedTheme>('light');
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
const currentThemeLabel = computed(() => (resolvedTheme.value === 'dark' ? '다크' : '화이트'));
const nextThemeLabel = computed(() => (resolvedTheme.value === 'dark' ? '화이트' : '다크'));
const themeToggleLabel = computed(() => `테마 전환, 현재 ${currentThemeLabel.value}, 클릭 시 ${nextThemeLabel.value}`);
const searchKeyword = ref('');
const menuPanelClass =
  'absolute right-0 top-full mt-2 overflow-hidden rounded-[0.7rem] border border-slate-200 bg-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-900';
const { stopNotificationPresence } = useNotificationPresence({
  isAuthenticated,
  isNotificationMenuOpen,
});
let stopThemeChangeSubscription: (() => void) | null = null;

onMounted(() => {
  const themeState = getThemeState();
  resolvedTheme.value = themeState.resolvedTheme;
  stopThemeChangeSubscription = subscribeThemeChange((nextThemeState) => {
    resolvedTheme.value = nextThemeState.resolvedTheme;
  });
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
  stopThemeChangeSubscription?.();
  stopThemeChangeSubscription = null;
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
  applyTheme(resolvedTheme.value === 'dark' ? 'light' : 'dark');
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
  if (trimmed) {
    await router.push({ path: '/search', query: { q: trimmed, type: 'ALL', order: 'LATEST', page: '0' } });
    return;
  }
  await router.push('/search');
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
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/92">
    <div class="flex w-full items-center justify-between gap-3 px-3 py-2.5 sm:px-4 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-4">
      <div class="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5">
        <button type="button" class="ui-icon-button" aria-label="사이드 메뉴 열기" @click="emit('toggle-menu')">
          <img :src="iconStack" alt="" aria-hidden="true" class="h-[1.125rem] w-[1.125rem]" />
        </button>

        <RouterLink to="/" class="min-w-0 shrink">
          <div class="flex items-center gap-2">
            <div class="bg-brand-600 hidden h-8 w-8 items-center justify-center rounded-[0.55rem] text-xs font-black text-white sm:flex">MT</div>
            <div class="min-w-0">
              <p class="text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Community</p>
              <p class="truncate text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">MockTalk</p>
            </div>
          </div>
        </RouterLink>
      </div>

      <form
        class="hidden w-full max-w-[720px] items-center gap-2 justify-self-center rounded-[0.6rem] border border-slate-200 bg-white px-2 py-1.5 md:flex dark:border-slate-800 dark:bg-slate-900"
        @submit.prevent="handleSearch"
      >
        <label class="sr-only" for="global-search">검색</label>
        <input
          id="global-search"
          v-model="searchKeyword"
          type="search"
          placeholder="게시판, 게시글, 댓글, 사용자"
          class="h-8 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          type="submit"
          data-testid="desktop-search-button"
          class="ui-icon-button h-8 w-8 shrink-0 border-0 bg-slate-100 p-0 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
          aria-label="검색 실행"
        >
          <img :src="iconSearch" alt="" aria-hidden="true" class="h-4 w-4" />
        </button>
      </form>

      <div class="flex shrink-0 items-center gap-2 justify-self-end">
        <button type="button" class="ui-icon-button md:hidden" data-testid="mobile-search-button" aria-label="검색 페이지 열기" @click="openSearch">
          <img :src="iconSearch" alt="" aria-hidden="true" class="h-[1.125rem] w-[1.125rem]" />
        </button>

        <button
          type="button"
          class="ui-icon-button"
          data-testid="theme-toggle-button"
          :aria-label="themeToggleLabel"
          :title="themeToggleLabel"
          @click="toggleTheme"
        >
          <img v-if="resolvedTheme === 'dark'" :src="iconSun" alt="" aria-hidden="true" class="h-[1.125rem] w-[1.125rem]" />
          <img v-else :src="iconMoon" alt="" aria-hidden="true" class="h-[1.125rem] w-[1.125rem]" />
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
            <img :src="iconBell" alt="" aria-hidden="true" class="h-[1.125rem] w-[1.125rem]" />
            <span
              v-if="notificationUnreadCount > 0"
              class="absolute -top-1 -right-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white"
              aria-hidden="true"
            >
              {{ notificationUnreadLabel }}
            </span>
          </button>

          <div v-if="isNotificationMenuOpen" ref="notificationMenuRef" :class="[menuPanelClass, 'w-[23rem]']" role="menu">
            <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div>
                <p class="text-sm font-bold text-slate-900 dark:text-slate-100">알림</p>
                <p class="text-[11px] text-slate-400 dark:text-slate-500">최근 상호작용을 빠르게 확인합니다.</p>
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
                        class="text-[11px] font-bold tracking-[0.14em] uppercase"
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

        <button v-if="!isAuthenticated" type="button" class="ui-button-ghost h-9 px-3.5 text-xs" aria-label="로그인" @click="openLogin">
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
            <div class="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 overflow-hidden rounded-[0.6rem] border border-slate-200 dark:border-slate-800">
                  <img :src="resolvedAvatar" alt="프로필 이미지" class="h-full w-full object-cover" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ resolvedDisplayName }}</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">포인트 {{ resolvedPoint }}P</p>
                </div>
              </div>
            </div>
            <div class="space-y-2 p-3">
              <button type="button" class="ui-list-row w-full cursor-pointer text-left" role="menuitem" @click="openMyPage">
                <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">마이페이지</span>
                <span class="text-xs text-slate-500 dark:text-slate-400">프로필과 활동 기록을 관리합니다.</span>
              </button>
              <button type="button" class="ui-list-row w-full cursor-pointer text-left" role="menuitem" @click="openBoardCreate">
                <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">커뮤니티 개설</span>
                <span class="text-xs text-slate-500 dark:text-slate-400">새 게시판을 만들고 운영을 시작합니다.</span>
              </button>
              <button
                type="button"
                class="ui-list-row w-full cursor-pointer border-rose-200 bg-rose-50 text-left dark:border-rose-900/40 dark:bg-rose-950/20"
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
  </header>
</template>
