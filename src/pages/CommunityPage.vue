<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { getBoards, resolveBoardSummaryDescription, resolveBoardVisibilityLabel } from '../entities/board';
import type { BoardResponse } from '../entities/board';
import FileImage from '../entities/file/ui/FileImage.vue';
import PageContainer from '../shared/ui/PageContainer.vue';
import { formatKoreanDate } from '../shared/lib/date';
import PageHeader from '../shared/ui/PageHeader.vue';
import { ApiError } from '../shared/lib/http/api';
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
      <div class="space-y-4">
        <PageHeader class="animate-rise" eyebrow="Boards" title="커뮤니티" description="공개된 커뮤니티를 게시판형 목록으로 빠르게 훑을 수 있습니다.">
          <template #meta>
            <span class="ui-badge ui-badge-success">게시판 {{ visibleBoardCount }}개</span>
            <span v-if="isLoading && visibleBoards.length > 0" class="ui-badge ui-badge-muted">추가 로딩 중</span>
          </template>
        </PageHeader>

        <div v-if="listError" class="ui-state ui-state-danger">
          {{ listError }}
        </div>

        <div v-if="visibleBoards.length > 0" class="space-y-2">
          <div
            class="hidden grid-cols-[3.5rem_minmax(0,1fr)_6rem_6.5rem] gap-3 rounded-[0.55rem] border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold text-slate-500 md:grid dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
          >
            <span>이미지</span>
            <span>게시판</span>
            <span class="text-center">공개 범위</span>
            <span class="text-center">개설일</span>
          </div>
          <RouterLink v-for="board in visibleBoards" :key="board.id" :to="`/b/${board.slug}`" class="ui-list-row group">
            <div class="grid gap-3 md:grid-cols-[3.5rem_minmax(0,1fr)_6rem_6.5rem] md:items-center">
              <div class="h-14 overflow-hidden rounded-[0.55rem] border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
                <FileImage
                  v-if="board.boardImage"
                  :file="board.boardImage"
                  variant="thumb"
                  :alt="board.boardName"
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                  <img :src="boardPlaceholderIcon" alt="" aria-hidden="true" class="h-5 w-5" />
                </div>
              </div>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="ui-badge ui-badge-muted">{{
                    board.articleWritePolicy === 'ALL_AUTHENTICATED' ? '회원 글쓰기' : '운영 정책 적용'
                  }}</span>
                  <span class="text-xs text-slate-400 dark:text-slate-500">/{{ board.slug }}</span>
                </div>
                <h3
                  class="group-hover:text-brand-700 dark:group-hover:text-brand-300 mt-1 truncate text-sm font-black tracking-tight text-slate-900 transition dark:text-slate-100"
                >
                  {{ board.boardName }}
                </h3>
                <p class="mt-1 line-clamp-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {{ resolveBoardSummaryDescription(board.description) }}
                </p>
              </div>

              <div class="hidden justify-center md:flex">
                <span class="ui-badge ui-badge-success">{{ resolveBoardVisibilityLabel(board.visibility) }}</span>
              </div>

              <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">
                {{ formatKoreanDate(board.createdAt, { month: '2-digit', day: '2-digit' }) }}
              </div>
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
