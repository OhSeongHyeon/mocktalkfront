<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

import { applyTheme } from '../lib/theme';
import { logout } from '../services/auth';
import { clearAccessToken, displayName, isAuthenticated, profileImageUrl, userPoint } from '../stores/auth';
import defaultAvatar from '../assets/default-avatar.svg';

const emit = defineEmits<{
  (event: 'toggle-menu'): void;
}>();

const router = useRouter();
const isDark = ref(false);
const isProfileMenuOpen = ref(false);
const profileMenuRef = ref<HTMLDivElement | null>(null);
const profileButtonRef = ref<HTMLButtonElement | null>(null);
const resolvedAvatar = computed(() => profileImageUrl.value ?? defaultAvatar);
const resolvedDisplayName = computed(() => displayName.value ?? '사용자');
const resolvedPoint = computed(() => userPoint.value.toLocaleString());

onMounted(() => {
  isDark.value = globalThis.document?.documentElement.classList.contains('dark') ?? false;
  if (!globalThis.document) {
    return;
  }
  globalThis.document.addEventListener('click', handleDocumentClick);
  globalThis.document.addEventListener('keydown', handleDocumentKeydown);
});

onBeforeUnmount(() => {
  if (!globalThis.document) {
    return;
  }
  globalThis.document.removeEventListener('click', handleDocumentClick);
  globalThis.document.removeEventListener('keydown', handleDocumentKeydown);
});

const openLogin = () => {
  if (router.currentRoute.value.path !== '/login') {
    router.push('/login');
  }
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
  isProfileMenuOpen.value = !isProfileMenuOpen.value;
};

const closeProfileMenu = () => {
  isProfileMenuOpen.value = false;
};

const handleLogout = async () => {
  try {
    await logout();
  } finally {
    clearAccessToken();
    closeProfileMenu();
    await router.push('/');
  }
};

const handleDocumentClick = (event: MouseEvent) => {
  if (!isProfileMenuOpen.value) {
    return;
  }
  const target = event.target as Node | null;
  const menuEl = profileMenuRef.value;
  const buttonEl = profileButtonRef.value;
  if (menuEl?.contains(target) || buttonEl?.contains(target)) {
    return;
  }
  closeProfileMenu();
};

const handleDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeProfileMenu();
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
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>

        <RouterLink to="/" class="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          <!-- <span
            class="grid h-9 w-9 place-items-center rounded-2xl shadow-sm"
            style="background-color: var(--accent-strong)"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="white" class="h-4 w-4">
              <path d="M9 7l8 5-8 5V7z" />
            </svg>
          </span> -->
          <span class="hidden sm:inline">MockTalk</span>
        </RouterLink>
      </div>

      <div class="flex flex-1 items-center justify-center">
        <div class="hidden w-full max-w-2xl items-center sm:flex">
          <label class="sr-only" for="global-search">검색</label>
          <input
            id="global-search"
            type="search"
            placeholder="검색"
            class="h-11 w-full rounded-l-full border border-slate-200/80 bg-white px-5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
          />
          <button
            type="button"
            class="flex h-11 w-14 items-center justify-center rounded-r-full border border-l-0 border-slate-200/80 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="검색"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white sm:hidden"
          aria-label="검색"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </button>

        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="다크/화이트 모드 전환"
          @click="toggleTheme"
        >
          <svg
            v-if="isDark"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M12 4V2" />
            <path d="M12 22v-2" />
            <path d="M4.9 4.9l1.4 1.4" />
            <path d="M17.7 17.7l1.4 1.4" />
            <path d="M2 12h2" />
            <path d="M22 12h-2" />
            <path d="M4.9 19.1l1.4-1.4" />
            <path d="M17.7 6.3l1.4-1.4" />
            <circle cx="12" cy="12" r="4" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M21 12.8A9 9 0 0 1 11.2 3a7 7 0 1 0 9.8 9.8z" />
          </svg>
        </button>

        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="알림"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
            <path d="M10 19a2 2 0 0 0 4 0" />
          </svg>
        </button>

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
