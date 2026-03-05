<script setup lang="ts">
import { computed } from 'vue';

import type { ArticleSummaryResponse } from '../entities/board';

type ArticleListOrder = 'LATEST' | 'OLDEST';

interface ArticleListProps {
  pinned?: ArticleSummaryResponse[];
  articles: ArticleSummaryResponse[];
  isLoading?: boolean;
  emptyMessage?: string;
  order?: ArticleListOrder;
  orderOptions?: readonly ArticleListOrder[];
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  page?: number;
  totalPages?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const props = defineProps<ArticleListProps>();
const emit = defineEmits<{
  (event: 'select', articleId: number): void;
  (event: 'update:order', order: ArticleListOrder): void;
  (event: 'update:pageSize', pageSize: number): void;
  (event: 'update:page', page: number): void;
}>();

const pinnedList = computed(() => props.pinned ?? []);
const showPinned = computed(() => pinnedList.value.length > 0);
const showEmpty = computed(() => !props.isLoading && pinnedList.value.length === 0 && props.articles.length === 0);
const orderOptions = computed(() => props.orderOptions ?? []);
const showOrderControl = computed(() => orderOptions.value.length > 0 && props.order !== undefined);
const pageSizeOptions = computed(() => props.pageSizeOptions ?? []);
const showPageSizeControl = computed(() => pageSizeOptions.value.length > 0 && props.pageSize !== undefined);
const emptyMessage = computed(() => props.emptyMessage ?? '게시글이 없습니다.');
const currentPage = computed(() => props.page ?? 0);
const totalPages = computed(() => props.totalPages ?? 0);
const canGoPrevious = computed(() => {
  if (props.hasPrevious !== undefined) {
    return props.hasPrevious;
  }
  return currentPage.value > 0;
});
const canGoNext = computed(() => {
  if (props.hasNext !== undefined) {
    return props.hasNext;
  }
  return currentPage.value + 1 < totalPages.value;
});
const showPagination = computed(() => {
  if (totalPages.value > 1) {
    return true;
  }
  return Boolean(props.hasNext || props.hasPrevious);
});
const showPageNumbers = computed(() => totalPages.value > 1);
const PAGE_NUMBER_WINDOW_SIZE = 10;
const pageWindowStart = computed(() => Math.floor(currentPage.value / PAGE_NUMBER_WINDOW_SIZE) * PAGE_NUMBER_WINDOW_SIZE);
const pageWindowEnd = computed(() => Math.min(pageWindowStart.value + PAGE_NUMBER_WINDOW_SIZE, totalPages.value));
const pageNumbers = computed(() =>
  Array.from({ length: Math.max(pageWindowEnd.value - pageWindowStart.value, 0) }, (_, index) => pageWindowStart.value + index),
);
const hasPreviousPageWindow = computed(() => pageWindowStart.value > 0);
const hasNextPageWindow = computed(() => pageWindowEnd.value < totalPages.value);

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

const handleSelect = (articleId: number) => {
  emit('select', articleId);
};

const handleOrderChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null;
  if (!target) {
    return;
  }
  const value = target.value;
  if (value !== 'LATEST' && value !== 'OLDEST') {
    return;
  }
  emit('update:order', value);
};

const handlePageSizeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null;
  if (!target) {
    return;
  }
  const value = Number(target.value);
  if (Number.isNaN(value)) {
    return;
  }
  emit('update:pageSize', value);
};

const handlePageChange = (page: number) => {
  if (page < 0) {
    return;
  }
  if (totalPages.value > 0 && page >= totalPages.value) {
    return;
  }
  if (page > currentPage.value && !canGoNext.value) {
    return;
  }
  if (page < currentPage.value && !canGoPrevious.value) {
    return;
  }
  emit('update:page', page);
};

const handlePreviousPageWindow = () => {
  if (!hasPreviousPageWindow.value) {
    return;
  }
  handlePageChange(Math.max(pageWindowStart.value - 1, 0));
};

const handleNextPageWindow = () => {
  if (!hasNextPageWindow.value) {
    return;
  }
  handlePageChange(pageWindowEnd.value);
};
</script>

<template>
  <section v-if="showPinned" class="mt-8">
    <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">공지</h2>
    <div class="mt-3 space-y-3">
      <button
        v-for="article in pinnedList"
        :key="article.id"
        type="button"
        class="flex w-full flex-col gap-2 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-5 py-4 text-left transition hover:-translate-y-0.5 dark:border-amber-900/40 dark:bg-amber-950/30"
        @click="handleSelect(article.id)"
      >
        <div class="flex items-center gap-2">
          <span class="inline-flex rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white"> 공지 </span>
          <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {{ article.title }}
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>{{ article.authorName }}</span>
          <span>{{ formatDate(article.createdAt) }}</span>
          <span>댓글 {{ article.commentCount }}</span>
          <span>좋아요 {{ article.likeCount }}</span>
          <span>싫어요 {{ article.dislikeCount }}</span>
          <span>조회 {{ article.hit }}</span>
        </div>
      </button>
    </div>
  </section>

  <section class="mt-8">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">게시글</h2>
    </div>

    <div v-if="showPagination" class="mt-3 grid items-center gap-3 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-[1fr_auto_1fr]">
      <div class="flex flex-wrap items-center gap-3 justify-self-center sm:justify-self-start">
        <div v-if="showOrderControl" class="flex items-center gap-2">
          <span class="font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">정렬</span>
          <select aria-label="정렬" class="ui-input h-8 rounded-full px-3 py-1 text-xs font-semibold" :value="order" @change="handleOrderChange">
            <option v-for="option in orderOptions" :key="option" :value="option">
              {{ option === 'LATEST' ? '최신순' : '과거순' }}
            </option>
          </select>
        </div>
        <div v-if="showPageSizeControl" class="flex items-center gap-2">
          <span class="font-semibold text-slate-600 dark:text-slate-300">표시</span>
          <select
            aria-label="표시 개수"
            class="ui-input h-8 rounded-full px-3 py-1 text-xs font-semibold"
            :value="pageSize"
            @change="handlePageSizeChange"
          >
            <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ option }}개</option>
          </select>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          class="ui-chip-button ui-chip-button-muted px-3 py-1 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!canGoPrevious || isLoading"
          @click="handlePageChange(currentPage - 1)"
        >
          이전
        </button>
        <div v-if="showPageNumbers" class="flex flex-wrap items-center gap-1">
          <button
            type="button"
            class="ui-chip-button ui-chip-button-muted px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!hasPreviousPageWindow || isLoading"
            aria-label="이전 페이지 묶음"
            @click="handlePreviousPageWindow"
          >
            &laquo;
          </button>
          <button
            v-for="pageIndex in pageNumbers"
            :key="`top-${pageIndex}`"
            type="button"
            class="ui-chip-button px-3 py-1"
            :class="
              pageIndex === currentPage
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
            "
            :disabled="isLoading"
            @click="handlePageChange(pageIndex)"
          >
            {{ pageIndex + 1 }}
          </button>
          <button
            type="button"
            class="ui-chip-button ui-chip-button-muted px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!hasNextPageWindow || isLoading"
            aria-label="다음 페이지 묶음"
            @click="handleNextPageWindow"
          >
            &raquo;
          </button>
        </div>
        <button
          type="button"
          class="ui-chip-button ui-chip-button-muted px-3 py-1 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!canGoNext || isLoading"
          @click="handlePageChange(currentPage + 1)"
        >
          다음
        </button>
      </div>
      <span v-if="totalPages > 0" class="justify-self-center sm:justify-self-end">페이지 {{ currentPage + 1 }} / {{ totalPages }}</span>
      <span v-else class="justify-self-center sm:justify-self-end">페이지 {{ currentPage + 1 }}</span>
    </div>
    <div
      v-else-if="!showEmpty"
      class="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400 sm:justify-start"
    >
      <div v-if="showOrderControl" class="flex items-center gap-2">
        <span class="font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">정렬</span>
        <select aria-label="정렬" class="ui-input h-8 rounded-full px-3 py-1 text-xs font-semibold" :value="order" @change="handleOrderChange">
          <option v-for="option in orderOptions" :key="option" :value="option">
            {{ option === 'LATEST' ? '최신순' : '과거순' }}
          </option>
        </select>
      </div>
      <div v-if="showPageSizeControl" class="flex items-center gap-2">
        <span class="font-semibold text-slate-600 dark:text-slate-300">표시</span>
        <select
          aria-label="표시 개수"
          class="ui-input h-8 rounded-full px-3 py-1 text-xs font-semibold"
          :value="pageSize"
          @change="handlePageSizeChange"
        >
          <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ option }}개</option>
        </select>
      </div>
    </div>

    <div v-if="showEmpty" class="mt-4">
      <div class="ui-state ui-state-empty px-6 py-10">
        {{ emptyMessage }}
      </div>
    </div>

    <div v-else class="mt-4 space-y-3">
      <button
        v-for="article in articles"
        :key="article.id"
        type="button"
        class="ui-sub-panel flex w-full cursor-pointer flex-col gap-2 px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300/80 hover:shadow-sm dark:hover:border-slate-700"
        @click="handleSelect(article.id)"
      >
        <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {{ article.title }}
        </span>
        <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>{{ article.authorName }}</span>
          <span>{{ formatDate(article.createdAt) }}</span>
          <span>댓글 {{ article.commentCount }}</span>
          <span>좋아요 {{ article.likeCount }}</span>
          <span>싫어요 {{ article.dislikeCount }}</span>
          <span>조회 {{ article.hit }}</span>
        </div>
      </button>
    </div>

    <div v-if="showPagination" class="mt-4 grid items-center gap-3 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-[1fr_auto_1fr]">
      <div class="flex flex-wrap items-center gap-3 justify-self-center sm:justify-self-start">
        <div v-if="showOrderControl" class="flex items-center gap-2">
          <span class="font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">정렬</span>
          <select aria-label="정렬" class="ui-input h-8 rounded-full px-3 py-1 text-xs font-semibold" :value="order" @change="handleOrderChange">
            <option v-for="option in orderOptions" :key="option" :value="option">
              {{ option === 'LATEST' ? '최신순' : '과거순' }}
            </option>
          </select>
        </div>
        <div v-if="showPageSizeControl" class="flex items-center gap-2">
          <span class="font-semibold text-slate-600 dark:text-slate-300">표시</span>
          <select
            aria-label="표시 개수"
            class="ui-input h-8 rounded-full px-3 py-1 text-xs font-semibold"
            :value="pageSize"
            @change="handlePageSizeChange"
          >
            <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ option }}개</option>
          </select>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          class="ui-chip-button ui-chip-button-muted px-3 py-1 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!canGoPrevious || isLoading"
          @click="handlePageChange(currentPage - 1)"
        >
          이전
        </button>
        <div v-if="showPageNumbers" class="flex flex-wrap items-center gap-1">
          <button
            type="button"
            class="ui-chip-button ui-chip-button-muted px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!hasPreviousPageWindow || isLoading"
            aria-label="이전 페이지 묶음"
            @click="handlePreviousPageWindow"
          >
            &laquo;
          </button>
          <button
            v-for="pageIndex in pageNumbers"
            :key="`bottom-${pageIndex}`"
            type="button"
            class="ui-chip-button px-3 py-1"
            :class="
              pageIndex === currentPage
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
            "
            :disabled="isLoading"
            @click="handlePageChange(pageIndex)"
          >
            {{ pageIndex + 1 }}
          </button>
          <button
            type="button"
            class="ui-chip-button ui-chip-button-muted px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!hasNextPageWindow || isLoading"
            aria-label="다음 페이지 묶음"
            @click="handleNextPageWindow"
          >
            &raquo;
          </button>
        </div>
        <button
          type="button"
          class="ui-chip-button ui-chip-button-muted px-3 py-1 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!canGoNext || isLoading"
          @click="handlePageChange(currentPage + 1)"
        >
          다음
        </button>
      </div>
      <span v-if="totalPages > 0" class="justify-self-center sm:justify-self-end">페이지 {{ currentPage + 1 }} / {{ totalPages }}</span>
      <span v-else class="justify-self-center sm:justify-self-end">페이지 {{ currentPage + 1 }}</span>
    </div>
    <div
      v-else-if="!showEmpty"
      class="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400 sm:justify-start"
    >
      <div v-if="showOrderControl" class="flex items-center gap-2">
        <span class="font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">정렬</span>
        <select aria-label="정렬" class="ui-input h-8 rounded-full px-3 py-1 text-xs font-semibold" :value="order" @change="handleOrderChange">
          <option v-for="option in orderOptions" :key="option" :value="option">
            {{ option === 'LATEST' ? '최신순' : '과거순' }}
          </option>
        </select>
      </div>
      <div v-if="showPageSizeControl" class="flex items-center gap-2">
        <span class="font-semibold text-slate-600 dark:text-slate-300">표시</span>
        <select
          aria-label="표시 개수"
          class="ui-input h-8 rounded-full px-3 py-1 text-xs font-semibold"
          :value="pageSize"
          @change="handlePageSizeChange"
        >
          <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ option }}개</option>
        </select>
      </div>
    </div>
  </section>
</template>
