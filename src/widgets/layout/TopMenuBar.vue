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
import { Bell, Menu, Moon, Search, Sun } from '@lucide/vue';

import defaultAvatar from '../../assets/default-avatar.svg';
import AppIcon from '../../shared/ui/AppIcon.vue';

const emit = defineEmits<{
  (event: 'toggle-menu'): void;
}>();
const props = withDefaults(
  defineProps<{
    hiddenByScroll?: boolean;
  }>(),
  {
    hiddenByScroll: false,
  },
);

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
const brandMarkSrc = '/mocktalk_favicon_color.svg';
const menuPanelClass = 'ui-menu-dropdown absolute right-0 top-full mt-2';
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
  <header
    data-testid="top-menu-bar"
    class="app-header relative z-50 h-[3.75rem] transition-transform duration-200"
    :class="props.hiddenByScroll ? '-translate-y-full' : 'translate-y-0'"
  >
    <div class="flex h-full w-full items-center justify-between gap-3 px-3 sm:px-4 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-4">
      <div class="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5">
        <button type="button" class="ui-icon-button h-10 w-10 shrink-0" aria-label="사이드 메뉴 열기" @click="emit('toggle-menu')">
          <AppIcon :icon="Menu" :size="18" />
        </button>

        <RouterLink to="/" class="min-w-0 shrink">
          <div class="flex items-center gap-2">
            <img :src="brandMarkSrc" alt="" aria-hidden="true" class="app-brand-mark h-8 w-8 shrink-0" />
            <p class="app-brand-title truncate">MockTalk</p>
          </div>
        </RouterLink>
      </div>

      <form class="ui-search-field hidden w-full max-w-[720px] justify-self-center md:flex" @submit.prevent="handleSearch">
        <label class="sr-only" for="global-search">검색</label>
        <input id="global-search" v-model="searchKeyword" type="search" placeholder="검색" class="ui-search-input" />
        <button
          type="submit"
          data-testid="desktop-search-button"
          class="ui-icon-button bg-surface-soft h-8 w-8 shrink-0 border-0 p-0"
          aria-label="검색 실행"
        >
          <AppIcon :icon="Search" :size="16" />
        </button>
      </form>

      <div class="flex shrink-0 items-center gap-2 justify-self-end">
        <button
          type="button"
          class="ui-icon-button h-10 w-10 shrink-0 md:hidden"
          data-testid="mobile-search-button"
          aria-label="검색 페이지 열기"
          @click="openSearch"
        >
          <AppIcon :icon="Search" :size="18" />
        </button>

        <button
          type="button"
          class="ui-icon-button h-10 w-10 shrink-0"
          data-testid="theme-toggle-button"
          :aria-label="themeToggleLabel"
          :title="themeToggleLabel"
          @click="toggleTheme"
        >
          <AppIcon v-if="resolvedTheme === 'dark'" :icon="Sun" :size="18" />
          <AppIcon v-else :icon="Moon" :size="18" />
        </button>

        <div v-if="isAuthenticated" class="relative">
          <button
            ref="notificationButtonRef"
            type="button"
            class="ui-icon-button relative h-10 w-10 shrink-0"
            :aria-label="notificationButtonLabel"
            aria-haspopup="menu"
            :aria-expanded="isNotificationMenuOpen"
            @click="toggleNotificationMenu"
          >
            <AppIcon :icon="Bell" :size="18" />
            <span
              v-if="notificationUnreadCount > 0"
              class="absolute -top-1 -right-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white"
              aria-hidden="true"
            >
              {{ notificationUnreadLabel }}
            </span>
          </button>

          <div v-if="isNotificationMenuOpen" ref="notificationMenuRef" :class="[menuPanelClass, 'w-[23rem]']" role="menu">
            <div class="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p class="text-sm font-bold text-ink">알림</p>
                <p class="ui-caption">최근 상호작용을 빠르게 확인합니다.</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="notifications.length"
                  type="button"
                  class="text-xs font-semibold text-rose-500 transition hover:text-rose-600 dark:text-rose-200 dark:hover:text-rose-100"
                  @click="handleDeleteAllNotifications"
                >
                  전체 삭제
                </button>
                <button
                  v-if="hasUnreadNotifications"
                  type="button"
                  class="text-xs font-semibold text-muted transition hover:text-ink"
                  @click="handleMarkAllRead"
                >
                  모두 읽음
                </button>
              </div>
            </div>

            <div class="ui-scrollbar max-h-88 overflow-y-auto p-3">
              <div v-if="notificationLoading" class="px-3 py-4 text-sm text-muted">불러오는 중...</div>
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
                        :class="notification.read ? 'text-subtle' : 'text-brand-700 dark:text-brand-300'"
                      >
                        {{ notification.read ? '읽음' : '새 알림' }}
                      </span>
                    </div>
                    <span class="ui-caption">{{ formatNotificationDate(notification.createdAt) }}</span>
                  </div>
                  <p class="text-sm leading-6" :class="notification.read ? 'text-muted' : 'text-ink'">
                    {{ formatNotificationMessage(notification) }}
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>

        <button v-if="!isAuthenticated" type="button" class="ui-button-ghost h-10 px-3.5 text-xs" aria-label="로그인" @click="openLogin">
          로그인
        </button>

        <div v-else class="relative">
          <button
            ref="profileButtonRef"
            type="button"
            class="ui-icon-button grid h-10 w-10 shrink-0 place-items-center overflow-hidden p-0"
            aria-label="프로필"
            aria-haspopup="menu"
            :aria-expanded="isProfileMenuOpen"
            @click="toggleProfileMenu"
          >
            <img :src="resolvedAvatar" alt="프로필 이미지" class="h-full w-full object-cover" />
          </button>
          <div v-if="isProfileMenuOpen" ref="profileMenuRef" :class="[menuPanelClass, 'w-64']" role="menu">
            <div class="border-b border-line px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 overflow-hidden rounded-[var(--radius-md)] border border-line">
                  <img :src="resolvedAvatar" alt="프로필 이미지" class="h-full w-full object-cover" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold text-ink">{{ resolvedDisplayName }}</p>
                  <p class="ui-caption">포인트 {{ resolvedPoint }}P</p>
                </div>
              </div>
            </div>
            <div class="space-y-2 p-3">
              <button type="button" class="ui-list-row w-full cursor-pointer text-left" role="menuitem" @click="openMyPage">
                <span class="text-sm font-semibold text-ink">마이페이지</span>
                <span class="ui-caption">프로필과 활동 기록을 관리합니다.</span>
              </button>
              <button type="button" class="ui-list-row w-full cursor-pointer text-left" role="menuitem" @click="openBoardCreate">
                <span class="text-sm font-semibold text-ink">커뮤니티 개설</span>
                <span class="ui-caption">새 게시판을 만들고 운영을 시작합니다.</span>
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
