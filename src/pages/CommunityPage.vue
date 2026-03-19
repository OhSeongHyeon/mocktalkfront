<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { getBoards } from '../entities/board';
import type { BoardResponse } from '../entities/board';
import FileImage from '../entities/file/ui/FileImage.vue';
import PageContainer from '../shared/ui/PageContainer.vue';
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

const resolveDescription = (description: string | null) => {
  const trimmed = description?.trim();
  return trimmed ? trimmed : '설명이 없습니다.';
};

const resolveVisibilityLabel = (visibility: string) => {
  if (visibility === 'PUBLIC') {
    return '공개';
  }
  if (visibility === 'GROUP') {
    return '구독형';
  }
  if (visibility === 'PRIVATE') {
    return '비공개';
  }
  if (visibility === 'UNLISTED') {
    return '운영자 전용';
  }
  return '기타';
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
        <PageHeader
          class="animate-rise"
          eyebrow="탐색"
          title="커뮤니티"
          description="공개된 커뮤니티를 리스트 중심 레이아웃으로 빠르게 탐색할 수 있습니다."
        >
          <template #meta>
            <span class="ui-badge ui-badge-success">게시판 {{ visibleBoardCount }}개</span>
            <span v-if="isLoading && visibleBoards.length > 0" class="ui-badge ui-badge-muted">추가 로딩 중</span>
          </template>
        </PageHeader>

        <div v-if="listError" class="ui-state ui-state-danger">
          {{ listError }}
        </div>

        <div v-if="visibleBoards.length > 0" class="space-y-3">
          <RouterLink v-for="board in visibleBoards" :key="board.id" :to="`/b/${board.slug}`" class="ui-list-row group">
            <div class="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center">
              <div class="h-24 overflow-hidden rounded-[1.1rem] bg-slate-100 dark:bg-slate-900">
                <FileImage
                  v-if="board.boardImage"
                  :file="board.boardImage"
                  variant="thumb"
                  :alt="board.boardName"
                  class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                  <img :src="boardPlaceholderIcon" alt="" aria-hidden="true" class="h-7 w-7" />
                  <span class="text-xs">대표 이미지 없음</span>
                </div>
              </div>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="ui-badge ui-badge-success">{{ resolveVisibilityLabel(board.visibility) }}</span>
                  <span class="ui-badge ui-badge-muted">{{
                    board.articleWritePolicy === 'ALL_AUTHENTICATED' ? '회원 글쓰기' : '운영 정책 적용'
                  }}</span>
                  <span class="text-xs text-slate-400 dark:text-slate-500">/{{ board.slug }}</span>
                </div>
                <h3
                  class="group-hover:text-brand-700 dark:group-hover:text-brand-300 mt-2 truncate text-base font-black tracking-tight text-slate-900 transition dark:text-slate-100"
                >
                  {{ board.boardName }}
                </h3>
                <p class="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {{ resolveDescription(board.description) }}
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                <span class="ui-badge ui-badge-muted">빠른 입장</span>
                <span class="text-xs text-slate-400 dark:text-slate-500">상세 보기</span>
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
