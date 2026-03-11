<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { getBoards } from '../entities/board';
import type { BoardResponse } from '../entities/board';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import { ApiError } from '../shared/lib/http/api';
import { resolveImageUrl } from '../shared/lib/files';
import AppShell from '../widgets/layout/AppShell.vue';
import boardPlaceholderIcon from '../assets/icons/icon-board-placeholder.svg';

type AppShellExposed = {
  getMainElement: () => HTMLElement | null;
};

const appShellRef = ref<AppShellExposed | null>(null);
const scrollAreaRef = ref<HTMLElement | null>(null);
const sentinelRef = ref<HTMLDivElement | null>(null);

const boards = ref<BoardResponse[]>([]);
const isLoading = ref(false);
const listError = ref('');
const hasNext = ref(true);
const nextPage = ref(0);
const pageSize = 50;

let observer: IntersectionObserver | null = null;

const isInitialLoading = computed(() => isLoading.value && boards.value.length === 0);
const visibleBoards = computed(() => boards.value.filter((board) => !['notice', 'inquiry'].includes(board.slug)));
const visibleBoardCount = computed(() => visibleBoards.value.length);

const resolveBoardImage = (board: BoardResponse) => resolveImageUrl(board.boardImage ?? null, 'thumb');

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
  scrollAreaRef.value = appShellRef.value?.getMainElement() ?? null;
  setupObserver();
  await loadNextPage();
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<template>
  <AppShell ref="appShellRef">
    <PageContainer width="auto">
      <div class="space-y-6">
        <PageHeader class="animate-rise" eyebrow="탐색" title="공개 커뮤니티" description="관심 주제의 게시판을 찾고 지금 바로 대화에 참여해보세요.">
          <template #meta>
            <span
              class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
            >
              게시판 {{ visibleBoardCount }}개
            </span>
          </template>
        </PageHeader>

        <div v-if="listError" class="ui-state ui-state-danger">
          {{ listError }}
        </div>

        <div v-if="visibleBoards.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RouterLink
            v-for="board in visibleBoards"
            :key="board.id"
            :to="`/b/${board.slug}`"
            class="ui-sub-panel group block overflow-hidden transition hover:-translate-y-0.5 hover:border-slate-300/80 hover:shadow-md dark:hover:border-slate-700"
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
              <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
                {{ board.boardName }}
              </h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                {{ resolveDescription(board.description) }}
              </p>
            </div>
          </RouterLink>
        </div>

        <div v-else-if="!isInitialLoading && !listError" class="ui-state ui-state-empty px-6 py-12">아직 게시판이 없습니다.</div>

        <div v-if="isInitialLoading" class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
          게시판을 불러오는 중입니다.
        </div>

        <div v-if="isLoading && visibleBoards.length > 0" class="text-sm text-slate-500">더 불러오는 중...</div>

        <div ref="sentinelRef" class="h-8 w-full"></div>
      </div>
    </PageContainer>
  </AppShell>
</template>
