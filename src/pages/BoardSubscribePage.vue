<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { ApiError } from '../shared/lib/http/api';
import { getBoardSubscribes, resolveBoardSummaryDescription, resolveBoardVisibilityLabel } from '../entities/board';
import type { BoardSubscribeItemResponse } from '../entities/board';
import FileImage from '../entities/file/ui/FileImage.vue';
import boardPlaceholderIcon from '../assets/icons/icon-board-placeholder.svg';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import { formatKoreanDate } from '../shared/lib/date';
import AppShell from '../widgets/layout/AppShell.vue';

const isLoading = ref(false);
const listError = ref('');
const subscribes = ref<BoardSubscribeItemResponse[]>([]);
const page = ref(0);
const totalPages = ref(0);
const hasNext = ref(false);
const hasPrevious = ref(false);
const pageSize = 10;

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

        <div v-if="subscribes.length > 0" class="space-y-2">
          <div
            class="hidden grid-cols-[3.5rem_minmax(0,1fr)_7rem_7rem] gap-3 rounded-[0.55rem] border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold text-slate-500 md:grid dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
          >
            <span>이미지</span>
            <span>게시판</span>
            <span class="text-center">공개 범위</span>
            <span class="text-center">구독일</span>
          </div>
          <RouterLink v-for="board in subscribes" :key="board.id" :to="`/b/${board.slug}`" class="ui-list-row group">
            <div class="grid gap-3 md:grid-cols-[3.5rem_minmax(0,1fr)_7rem_7rem] md:items-center">
              <div class="h-14 overflow-hidden rounded-[0.55rem] border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
                <FileImage
                  v-if="board.boardImage"
                  :file="board.boardImage"
                  variant="thumb"
                  :alt="board.boardName"
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                  <img :src="boardPlaceholderIcon" alt="" aria-hidden="true" class="h-5 w-5" />
                </div>
              </div>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="ui-badge ui-badge-accent">구독중</span>
                  <span class="text-xs text-slate-400 dark:text-slate-500">/{{ board.slug }}</span>
                </div>
                <h2
                  class="group-hover:text-brand-700 dark:group-hover:text-brand-300 mt-1 truncate text-sm font-black tracking-tight text-slate-900 transition dark:text-slate-100"
                >
                  {{ board.boardName }}
                </h2>
                <p class="mt-1 line-clamp-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {{ resolveBoardSummaryDescription(board.description) }}
                </p>
              </div>

              <div class="hidden justify-center md:flex">
                <span class="ui-badge ui-badge-muted">{{ resolveBoardVisibilityLabel(board.visibility) }}</span>
              </div>

              <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 md:block md:text-center dark:text-slate-400">
                <span class="ui-badge ui-badge-success md:hidden">구독일 {{ formatKoreanDate(board.subscribedAt) }}</span>
                <span class="hidden md:inline">{{ formatKoreanDate(board.subscribedAt) }}</span>
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
