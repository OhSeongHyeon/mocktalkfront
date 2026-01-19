<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { resolveFileUrl } from '../lib/files';
import { getBoardSubscribes } from '../services/boards';
import type { BoardSubscribeItemResponse } from '../services/boards';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

const isMobileMenuOpen = ref(false);
const isLoading = ref(false);
const listError = ref('');
const subscribes = ref<BoardSubscribeItemResponse[]>([]);
const page = ref(0);
const totalPages = ref(0);
const hasNext = ref(false);
const hasPrevious = ref(false);
const pageSize = 10;

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

const resolveBoardImage = (board: BoardSubscribeItemResponse) => resolveFileUrl(board.boardImage?.storageKey ?? null);

const resolveDescription = (description: string | null) => {
  const trimmed = description?.trim();
  return trimmed ? trimmed : '설명이 없습니다.';
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const isInitialLoading = computed(() => isLoading.value && subscribes.value.length === 0);
const showPagination = computed(() => totalPages.value > 1);
const pageNumbers = computed(() => Array.from({ length: totalPages.value }, (_, index) => index));

const loadPage = async (pageIndex: number) => {
  if (isLoading.value) {
    return;
  }
  listError.value = '';
  isLoading.value = true;
  try {
    const data = await getBoardSubscribes(pageIndex, pageSize);
    subscribes.value = data.items;
    page.value = data.page;
    totalPages.value = data.totalPages;
    hasNext.value = data.hasNext;
    hasPrevious.value = data.hasPrevious;
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '구독 목록을 불러오지 못했습니다.';
  } finally {
    isLoading.value = false;
  }
};

const handlePageChange = (pageIndex: number) => {
  if (pageIndex < 0 || pageIndex >= totalPages.value) {
    return;
  }
  loadPage(pageIndex);
};

onMounted(() => {
  loadPage(0);
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-6xl">
          <div class="flex flex-col gap-2">
            <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">구독 목록</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400">구독 중인 커뮤니티를 한눈에 확인할 수 있습니다.</p>
          </div>

          <div
            v-if="listError"
            class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ listError }}
          </div>

          <div v-if="subscribes.length > 0" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <RouterLink
              v-for="board in subscribes"
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
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="h-7 w-7"
                    aria-hidden="true"
                  >
                    <path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" />
                    <path d="M3 8l9 5 9-5" />
                    <path d="M12 13v8" />
                  </svg>
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
                <span class="text-xs font-semibold text-slate-400 dark:text-slate-500">구독일 {{ formatDate(board.subscribedAt) }}</span>
              </div>
            </RouterLink>
          </div>

          <div
            v-else-if="!isInitialLoading && !listError"
            class="mt-10 rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
          >
            아직 구독 중인 커뮤니티가 없습니다.
          </div>

          <div v-if="isInitialLoading" class="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
            구독 목록을 불러오는 중입니다.
          </div>

          <div v-if="showPagination" class="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                :disabled="!hasPrevious || isLoading"
                @click="handlePageChange(page - 1)"
              >
                이전
              </button>
              <div class="flex flex-wrap items-center gap-1">
                <button
                  v-for="pageIndex in pageNumbers"
                  :key="pageIndex"
                  type="button"
                  class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                  :class="
                    pageIndex === page
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                  "
                  :disabled="isLoading"
                  @click="handlePageChange(pageIndex)"
                >
                  {{ pageIndex + 1 }}
                </button>
              </div>
              <button
                type="button"
                class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                :disabled="!hasNext || isLoading"
                @click="handlePageChange(page + 1)"
              >
                다음
              </button>
            </div>
            <span>페이지 {{ page + 1 }} / {{ totalPages }}</span>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
