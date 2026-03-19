<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { ApiError } from '../shared/lib/http/api';
import { getBoardSubscribes } from '../entities/board';
import type { BoardSubscribeItemResponse } from '../entities/board';
import FileImage from '../entities/file/ui/FileImage.vue';
import boardPlaceholderIcon from '../assets/icons/icon-board-placeholder.svg';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const isLoading = ref(false);
const listError = ref('');
const subscribes = ref<BoardSubscribeItemResponse[]>([]);
const page = ref(0);
const totalPages = ref(0);
const hasNext = ref(false);
const hasPrevious = ref(false);
const pageSize = 10;

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
  <AppShell>
    <PageContainer width="auto">
      <div class="space-y-6">
        <PageHeader title="구독 목록" description="구독 중인 커뮤니티를 목록형 레이아웃으로 빠르게 확인할 수 있습니다.">
          <template #meta>
            <span class="ui-badge ui-badge-success">현재 페이지 {{ page + 1 }}</span>
            <span v-if="totalPages > 0" class="ui-badge ui-badge-muted">총 {{ totalPages }}페이지</span>
          </template>
        </PageHeader>

        <div v-if="listError" class="ui-state ui-state-danger">
          {{ listError }}
        </div>

        <div v-if="subscribes.length > 0" class="space-y-3">
          <RouterLink v-for="board in subscribes" :key="board.id" :to="`/b/${board.slug}`" class="ui-list-row group">
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
                  <span class="ui-badge ui-badge-success">구독중</span>
                  <span class="ui-badge ui-badge-muted">{{ resolveVisibilityLabel(board.visibility) }}</span>
                  <span class="text-xs text-slate-400 dark:text-slate-500">/{{ board.slug }}</span>
                </div>
                <h2
                  class="group-hover:text-brand-700 dark:group-hover:text-brand-300 mt-2 truncate text-base font-black tracking-tight text-slate-900 transition dark:text-slate-100"
                >
                  {{ board.boardName }}
                </h2>
                <p class="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {{ resolveDescription(board.description) }}
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                <span class="ui-badge ui-badge-success">구독일 {{ formatDate(board.subscribedAt) }}</span>
                <span class="text-xs text-slate-400 dark:text-slate-500">상세 보기</span>
              </div>
            </div>
          </RouterLink>
        </div>

        <div v-else-if="!isInitialLoading && !listError" class="ui-state ui-state-empty px-6 py-12">아직 구독 중인 커뮤니티가 없습니다.</div>

        <div v-if="isInitialLoading" class="flex items-center gap-2 text-sm text-slate-500">
          <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
          구독 목록을 불러오는 중입니다.
        </div>

        <div v-if="showPagination" class="ui-toolbar justify-between text-xs text-slate-500 dark:text-slate-400">
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
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
                class="ui-button-ghost h-9 px-4 text-xs"
                :class="pageIndex === page ? 'ui-button-primary' : ''"
                :disabled="isLoading"
                @click="handlePageChange(pageIndex)"
              >
                {{ pageIndex + 1 }}
              </button>
            </div>
            <button
              type="button"
              class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="!hasNext || isLoading"
              @click="handlePageChange(page + 1)"
            >
              다음
            </button>
          </div>
          <span>페이지 {{ page + 1 }} / {{ totalPages }}</span>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>
