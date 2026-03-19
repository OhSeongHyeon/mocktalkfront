<script setup lang="ts">
import { computed } from 'vue';

import type { ArticleSummaryResponse } from '../../entities/board';

type ArticleListOrder = 'LATEST' | 'OLDEST';

interface ArticleListProps {
  pinned?: ArticleSummaryResponse[];
  articles: ArticleSummaryResponse[];
  isLoading?: boolean;
  emptyMessage?: string;
  resolveHref?: (article: ArticleSummaryResponse) => string;
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
const pageSummaryText = computed(() => {
  if (totalPages.value > 0) {
    return `페이지 ${currentPage.value + 1} / ${totalPages.value}`;
  }
  return `페이지 ${currentPage.value + 1}`;
});

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

const resolveCategoryName = (article: ArticleSummaryResponse) => {
  const trimmed = article.categoryName?.trim();
  return trimmed ? trimmed : null;
};

const resolveHref = (article: ArticleSummaryResponse) => props.resolveHref?.(article) ?? '#';

const handleSelect = (articleId: number) => {
  emit('select', articleId);
};

const handleArticleClick = (event: MouseEvent, articleId: number) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  event.preventDefault();
  handleSelect(articleId);
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
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <span class="ui-badge ui-badge-warning">공지</span>
        <h2 class="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">상단 고정 글</h2>
      </div>
      <span class="text-xs text-slate-400 dark:text-slate-500">{{ pinnedList.length }}건</span>
    </div>
    <div class="mt-3 space-y-2">
      <div
        class="hidden grid-cols-[minmax(0,1fr)_7rem_5.5rem_4.5rem_4.5rem_4.5rem] gap-2 rounded-[0.55rem] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 md:grid dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"
      >
        <span>제목</span>
        <span class="text-center">작성자</span>
        <span class="text-center">작성일</span>
        <span class="text-center">댓글</span>
        <span class="text-center">추천</span>
        <span class="text-center">조회</span>
      </div>
      <a
        v-for="article in pinnedList"
        :key="article.id"
        :href="resolveHref(article)"
        class="ui-list-row border-amber-200/80 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20"
        @click="handleArticleClick($event, article.id)"
      >
        <div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_7rem_5.5rem_4.5rem_4.5rem_4.5rem] md:items-center">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="ui-badge ui-badge-warning">공지</span>
              <span v-if="resolveCategoryName(article)" class="ui-badge ui-badge-success">
                {{ resolveCategoryName(article) }}
              </span>
            </div>
            <h3 class="mt-1 truncate text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">{{ article.title }}</h3>
            <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 md:hidden dark:text-slate-400">
              <span>{{ article.authorName }}</span>
              <span>{{ formatDate(article.createdAt) }}</span>
              <span>댓글 {{ article.commentCount }}</span>
              <span>추천 {{ article.likeCount }}</span>
              <span>조회 {{ article.hit }}</span>
            </div>
          </div>

          <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">{{ article.authorName }}</div>
          <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">{{ formatDate(article.createdAt) }}</div>
          <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">{{ article.commentCount }}</div>
          <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">{{ article.likeCount }}</div>
          <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">{{ article.hit }}</div>
        </div>
      </a>
    </div>
  </section>

  <section class="mt-8">
    <div class="ui-toolbar justify-between">
      <div>
        <p class="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">Article Feed</p>
        <h2 class="mt-1 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">게시글</h2>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div v-if="showOrderControl" class="flex items-center gap-2">
          <span class="font-semibold tracking-[0.12em] text-slate-600 uppercase dark:text-slate-300">정렬</span>
          <select aria-label="정렬" class="ui-input h-9 px-3 text-xs font-semibold" :value="order" @change="handleOrderChange">
            <option v-for="option in orderOptions" :key="option" :value="option">
              {{ option === 'LATEST' ? '최신순' : '과거순' }}
            </option>
          </select>
        </div>
        <div v-if="showPageSizeControl" class="flex items-center gap-2">
          <span class="font-semibold text-slate-600 dark:text-slate-300">표시</span>
          <select aria-label="표시 개수" class="ui-input h-9 px-3 text-xs font-semibold" :value="pageSize" @change="handlePageSizeChange">
            <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ option }}개</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="showEmpty" class="mt-4">
      <div class="ui-state ui-state-empty px-6 py-10">
        {{ emptyMessage }}
      </div>
    </div>

    <div v-else class="mt-4 space-y-2">
      <div
        class="hidden grid-cols-[minmax(0,1fr)_7rem_5.5rem_4.5rem_4.5rem_4.5rem] gap-2 rounded-[0.55rem] border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 md:grid dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
      >
        <span>제목</span>
        <span class="text-center">작성자</span>
        <span class="text-center">작성일</span>
        <span class="text-center">댓글</span>
        <span class="text-center">추천</span>
        <span class="text-center">조회</span>
      </div>
      <a
        v-for="article in articles"
        :key="article.id"
        :href="resolveHref(article)"
        class="ui-list-row group"
        @click="handleArticleClick($event, article.id)"
      >
        <div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_7rem_5.5rem_4.5rem_4.5rem_4.5rem] md:items-center">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span v-if="resolveCategoryName(article)" class="ui-badge ui-badge-success">
                {{ resolveCategoryName(article) }}
              </span>
              <span v-if="article.notice" class="ui-badge ui-badge-warning">공지</span>
            </div>
            <div class="mt-1 flex min-w-0 items-center gap-2">
              <h3
                class="group-hover:text-brand-700 dark:group-hover:text-brand-300 truncate text-sm font-black tracking-tight text-slate-900 transition dark:text-slate-100"
              >
                {{ article.title }}
              </h3>
              <span v-if="article.commentCount > 0" class="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                [{{ article.commentCount }}]
              </span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 md:hidden dark:text-slate-400">
              <span>{{ article.authorName }}</span>
              <span>{{ formatDate(article.createdAt) }}</span>
              <span>추천 {{ article.likeCount }}</span>
              <span>조회 {{ article.hit }}</span>
            </div>
          </div>

          <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">{{ article.authorName }}</div>
          <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">{{ formatDate(article.createdAt) }}</div>
          <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">{{ article.commentCount }}</div>
          <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">{{ article.likeCount }}</div>
          <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">{{ article.hit }}</div>
        </div>
      </a>
    </div>

    <div v-if="showPagination" class="ui-toolbar mt-4 justify-between text-xs text-slate-500 dark:text-slate-400">
      <span>{{ pageSummaryText }}</span>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!canGoPrevious || isLoading"
          @click="handlePageChange(currentPage - 1)"
        >
          이전
        </button>
        <div v-if="showPageNumbers" class="flex flex-wrap items-center gap-1">
          <button
            type="button"
            class="ui-button-ghost h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
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
            class="h-9 px-4 text-xs"
            :class="pageIndex === currentPage ? 'ui-button-primary' : 'ui-button-ghost'"
            :disabled="isLoading"
            @click="handlePageChange(pageIndex)"
          >
            {{ pageIndex + 1 }}
          </button>
          <button
            type="button"
            class="ui-button-ghost h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!hasNextPageWindow || isLoading"
            aria-label="다음 페이지 묶음"
            @click="handleNextPageWindow"
          >
            &raquo;
          </button>
        </div>
        <button
          type="button"
          class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!canGoNext || isLoading"
          @click="handlePageChange(currentPage + 1)"
        >
          다음
        </button>
      </div>
    </div>
  </section>
</template>
