<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { logout } from '../../features/auth';
import { useNotificationPresence } from '../../features/notification';
import type { NotificationResponse } from '../../features/notification';
import type { AppLocale } from '../../shared/i18n';
import { toIntlLocaleTag } from '../../shared/i18n';
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

const { t, locale } = useI18n();
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
const resolvedDisplayName = computed(() => displayName.value ?? t('common.user'));
const resolvedPoint = computed(() => userPoint.value.toLocaleString());
const hasUnreadNotifications = computed(() => notificationUnreadCount.value > 0);
const notificationUnreadLabel = computed(() => (notificationUnreadCount.value > 9 ? '9+' : String(notificationUnreadCount.value)));
const notificationButtonLabel = computed(() => {
  if (notificationUnreadCount.value <= 0) {
    return t('topMenu.notifications');
  }
  return t('topMenu.notificationsWithCount', { count: notificationUnreadCount.value });
});
const currentThemeLabel = computed(() => (resolvedTheme.value === 'dark' ? t('topMenu.themeDark') : t('topMenu.themeLight')));
const nextThemeLabel = computed(() => (resolvedTheme.value === 'dark' ? t('topMenu.themeLight') : t('topMenu.themeDark')));
const themeToggleLabel = computed(() => t('topMenu.themeToggle', { current: currentThemeLabel.value, next: nextThemeLabel.value }));
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
  return date.toLocaleDateString(toIntlLocaleTag(locale.value as AppLocale), {
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
        <button type="button" class="ui-icon-button h-10 w-10 shrink-0" :aria-label="t('topMenu.openSideMenu')" @click="emit('toggle-menu')">
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
        <label class="sr-only" for="global-search">{{ t('topMenu.searchLabel') }}</label>
        <input id="global-search" v-model="searchKeyword" type="search" :placeholder="t('topMenu.searchPlaceholder')" class="ui-search-input" />
        <button
          type="submit"
          data-testid="desktop-search-button"
          class="ui-icon-button h-8 w-8 shrink-0 border-0 bg-surface-soft p-0"
          :aria-label="t('topMenu.searchSubmit')"
        >
          <AppIcon :icon="Search" :size="16" />
        </button>
      </form>

      <div class="flex shrink-0 items-center gap-2 justify-self-end">
        <button
          type="button"
          class="ui-icon-button h-10 w-10 shrink-0 md:hidden"
          data-testid="mobile-search-button"
          :aria-label="t('topMenu.openSearchPage')"
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
                <p class="text-sm font-bold text-ink">{{ t('topMenu.notifications') }}</p>
                <p class="ui-caption">{{ t('topMenu.notificationsCaption') }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="notifications.length"
                  type="button"
                  class="text-xs font-semibold text-danger transition hover:opacity-80"
                  @click="handleDeleteAllNotifications"
                >
                  {{ t('topMenu.deleteAll') }}
                </button>
                <button
                  v-if="hasUnreadNotifications"
                  type="button"
                  class="text-xs font-semibold text-muted transition hover:text-ink"
                  @click="handleMarkAllRead"
                >
                  {{ t('topMenu.markAllRead') }}
                </button>
              </div>
            </div>

            <div class="ui-scrollbar max-h-88 overflow-y-auto p-3">
              <div v-if="notificationLoading" class="px-3 py-4 text-sm text-muted">{{ t('common.loading') }}</div>
              <div v-else-if="notificationError" class="ui-state ui-state-danger text-sm font-semibold">
                {{ notificationError }}
              </div>
              <div v-else-if="notifications.length === 0" class="ui-state ui-state-empty px-4 py-7">{{ t('topMenu.noNotifications') }}</div>
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
                        {{ notification.read ? t('topMenu.read') : t('topMenu.new') }}
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

        <button v-if="!isAuthenticated" type="button" class="ui-button-ghost h-10 px-3.5 text-xs" :aria-label="t('common.login')" @click="openLogin">
          {{ t('common.login') }}
        </button>

        <div v-else class="relative">
          <button
            ref="profileButtonRef"
            type="button"
            class="ui-icon-button grid h-10 w-10 shrink-0 place-items-center overflow-hidden p-0"
            :aria-label="t('topMenu.profile')"
            aria-haspopup="menu"
            :aria-expanded="isProfileMenuOpen"
            @click="toggleProfileMenu"
          >
            <img :src="resolvedAvatar" :alt="t('topMenu.profileImageAlt')" class="h-full w-full object-cover" />
          </button>
          <div v-if="isProfileMenuOpen" ref="profileMenuRef" :class="[menuPanelClass, 'w-52']" role="menu">
            <div class="border-b border-line px-3 py-2.5">
              <div class="flex items-center gap-2.5">
                <div class="h-8 w-8 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-line">
                  <img :src="resolvedAvatar" :alt="t('topMenu.profileImageAlt')" class="h-full w-full object-cover" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-xs font-bold text-ink">{{ resolvedDisplayName }}</p>
                  <p class="ui-caption">{{ t('topMenu.points', { point: resolvedPoint }) }}</p>
                </div>
              </div>
            </div>
            <div class="flex flex-col py-1">
              <button type="button" class="ui-menu-item" role="menuitem" @click="openMyPage">{{ t('topMenu.myPage') }}</button>
              <button type="button" class="ui-menu-item" role="menuitem" @click="openBoardCreate">{{ t('topMenu.createCommunity') }}</button>
              <button type="button" class="ui-menu-item ui-menu-item-danger" role="menuitem" @click="handleLogout">{{ t('common.logout') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
