<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { resolveFileUrl } from '../lib/files';
import { getBoards } from '../services/boards';
import type { BoardResponse } from '../services/boards';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';
import boardPlaceholderIcon from '../assets/icons/icon-board-placeholder.svg';

const route = useRoute();
const isMobileMenuOpen = ref(false);
const scrollAreaRef = ref<HTMLElement | null>(null);
const sentinelRef = ref<HTMLDivElement | null>(null);

const boards = ref<BoardResponse[]>([]);
const isLoading = ref(false);
const listError = ref('');
const hasNext = ref(true);
const nextPage = ref(0);
const pageSize = 50;

let observer: IntersectionObserver | null = null;

const isMobileView = () => (typeof window !== 'undefined' ? window.innerWidth < 768 : false);

const toggleMenu = () => {
  if (isMobileView()) {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
    return;
  }
  setMenuCollapsed(!menuCollapsed.value);
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

const isInitialLoading = computed(() => isLoading.value && boards.value.length === 0);
const isCommunityList = computed(() => route.path === '/boards');
const visibleBoards = computed(() => {
  if (!isCommunityList.value) {
    return boards.value;
  }
  return boards.value.filter((board) => !['notice', 'inquiry'].includes(board.slug));
});

const resolveBoardImage = (board: BoardResponse) => resolveFileUrl(board.boardImage?.storageKey ?? null);

const resolveDescription = (description: string | null) => {
  const trimmed = description?.trim();
  return trimmed ? trimmed : '설명이 없습니다.';
};

const loadNextPage = async () => {
  if (isLoading.value || !hasNext.value) {
    return;
  }
  listError.value = '';
  isLoading.value = true;
  try {
    const data = await getBoards(nextPage.value, pageSize);
    if (nextPage.value === 0) {
      boards.value = data.items;
    } else {
      boards.value = [...boards.value, ...data.items];
    }
    hasNext.value = data.hasNext;
    nextPage.value = data.page + 1;
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '게시판 목록을 불러오지 못했습니다.';
    hasNext.value = false;
  } finally {
    isLoading.value = false;
  }
};

const handleIntersect = (entries: IntersectionObserverEntry[]) => {
  if (!entries.some((entry) => entry.isIntersecting)) {
    return;
  }
  loadNextPage();
};

const setupObserver = () => {
  if (!sentinelRef.value) {
    return;
  }
  observer?.disconnect();
  observer = new IntersectionObserver(handleIntersect, {
    root: scrollAreaRef.value,
    rootMargin: '200px 0px',
    threshold: 0,
  });
  observer.observe(sentinelRef.value);
};

onMounted(async () => {
  await nextTick();
  setupObserver();
  await loadNextPage();
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main ref="scrollAreaRef" class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-6xl">
          <div class="flex flex-col gap-2">
            <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">커뮤니티</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400">관심 있는 게시판을 찾아보고 바로 참여해보세요.</p>
          </div>

          <div
            v-if="listError"
            class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ listError }}
          </div>

          <div v-if="visibleBoards.length > 0" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <RouterLink
              v-for="board in visibleBoards"
              :key="board.id"
              :to="`/b/${board.slug}`"
              class="group block overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300/80 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
            >
              <div class="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                <img
                  v-if="resolveBoardImage(board)"
                  :src="resolveBoardImage(board) ?? undefined"
                  :alt="board.boardName"
                  class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                  <img :src="boardPlaceholderIcon" alt="" aria-hidden="true" class="h-7 w-7" />
                  <span class="text-xs">대표 이미지 없음</span>
                </div>
              </div>
              <div class="flex flex-col gap-2 px-4 py-4">
                <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {{ board.boardName }}
                </h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">
                  {{ resolveDescription(board.description) }}
                </p>
              </div>
            </RouterLink>
          </div>

          <div
            v-else-if="!isInitialLoading && !listError"
            class="mt-10 rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
          >
            아직 게시판이 없습니다.
          </div>

          <div v-if="isInitialLoading" class="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
            게시판을 불러오는 중입니다.
          </div>

          <div v-if="isLoading && visibleBoards.length > 0" class="mt-6 text-sm text-slate-500">더 불러오는 중...</div>

          <div ref="sentinelRef" class="h-8 w-full"></div>
        </div>
      </main>
    </div>
  </div>
</template>
