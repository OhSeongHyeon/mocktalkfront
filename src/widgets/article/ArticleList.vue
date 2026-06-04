<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ArticleSummaryResponse } from '../../entities/board';
import { toIntlLocaleTag } from '../../shared/i18n';

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
const { t, locale } = useI18n();
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
const emptyMessage = computed(() => props.emptyMessage ?? t('article.list.empty'));
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
    return t('article.list.pageSummary', { current: currentPage.value + 1, total: totalPages.value });
  }
  return t('article.list.pageSummarySingle', { current: currentPage.value + 1 });
});

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(toIntlLocaleTag(locale.value), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const resolveOrderLabel = (order: ArticleListOrder) => (order === 'LATEST' ? t('article.list.sortLatest') : t('article.list.sortOldest'));

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
  <section v-if="showPinned" class="bbs-box mt-3">
    <div class="bbs-toolbar">
      <span class="bbs-toolbar-title">{{ t('article.list.notice') }}</span>
      <span class="bbs-meta">{{ pinnedList.length }}</span>
    </div>
    <a
      v-for="article in pinnedList"
      :key="article.id"
      :href="resolveHref(article)"
      class="bbs-row bbs-row-notice"
      @click="handleArticleClick($event, article.id)"
    >
      <div class="bbs-cols-6 md:grid">
        <div class="min-w-0">
          <span class="bbs-tag bbs-tag-notice">{{ t('article.list.notice') }}</span>
          <span v-if="resolveCategoryName(article)" class="bbs-tag bbs-tag-cat">{{ resolveCategoryName(article) }}</span>
          <span class="bbs-row-title">{{ article.title }}</span>
          <span v-if="article.commentCount > 0" class="bbs-cmt">[{{ article.commentCount }}]</span>
        </div>
        <span class="bbs-cell-center hidden md:block">{{ article.authorName }}</span>
        <span class="bbs-cell-center hidden md:block">{{ formatDate(article.createdAt) }}</span>
        <span class="bbs-cell-center hidden md:block">{{ article.commentCount }}</span>
        <span class="bbs-cell-center hidden md:block">{{ article.likeCount }}</span>
        <span class="bbs-cell-center hidden md:block">{{ article.hit }}</span>
      </div>
    </a>
  </section>

  <section class="bbs-box mt-3">
    <div class="bbs-toolbar">
      <span class="bbs-toolbar-title">{{ t('article.list.posts') }}</span>
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-if="showOrderControl"
          :aria-label="t('article.list.sortAriaLabel')"
          class="ui-input h-8 px-2 text-xs"
          :value="order"
          @change="handleOrderChange"
        >
          <option v-for="option in orderOptions" :key="option" :value="option">
            {{ resolveOrderLabel(option) }}
          </option>
        </select>
        <select
          v-if="showPageSizeControl"
          :aria-label="t('article.list.pageSizeAriaLabel')"
          class="ui-input h-8 px-2 text-xs"
          :value="pageSize"
          @change="handlePageSizeChange"
        >
          <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ t('article.list.pageSizeSuffix', { count: option }) }}</option>
        </select>
      </div>
    </div>

    <div v-if="showEmpty" class="ui-state ui-state-empty m-3">{{ emptyMessage }}</div>

    <template v-else>
      <div class="bbs-table-head bbs-cols-6">
        <span>{{ t('article.list.columnTitle') }}</span>
        <span class="text-center">{{ t('article.list.columnAuthor') }}</span>
        <span class="text-center">{{ t('article.list.columnDate') }}</span>
        <span class="text-center">{{ t('article.list.columnComments') }}</span>
        <span class="text-center">{{ t('article.list.columnLikes') }}</span>
        <span class="text-center">{{ t('article.list.columnViews') }}</span>
      </div>
      <a v-for="article in articles" :key="article.id" :href="resolveHref(article)" class="bbs-row" @click="handleArticleClick($event, article.id)">
        <div class="bbs-cols-6 md:grid">
          <div class="min-w-0">
            <span v-if="article.notice" class="bbs-tag bbs-tag-notice">{{ t('article.list.notice') }}</span>
            <span v-if="resolveCategoryName(article)" class="bbs-tag bbs-tag-cat">{{ resolveCategoryName(article) }}</span>
            <span class="bbs-row-title">{{ article.title }}</span>
            <span v-if="article.commentCount > 0" class="bbs-cmt">[{{ article.commentCount }}]</span>
          </div>
          <span class="bbs-cell-center hidden md:block">{{ article.authorName }}</span>
          <span class="bbs-cell-center hidden md:block">{{ formatDate(article.createdAt) }}</span>
          <span class="bbs-cell-center hidden md:block">{{ article.commentCount }}</span>
          <span class="bbs-cell-center hidden md:block">{{ article.likeCount }}</span>
          <span class="bbs-cell-center hidden md:block">{{ article.hit }}</span>
        </div>
      </a>
    </template>

    <div v-if="showPagination" class="bbs-toolbar border-t border-line text-xs text-muted">
      <span>{{ pageSummaryText }}</span>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          class="ui-button-ghost h-8 px-3 text-xs"
          :disabled="!canGoPrevious || isLoading"
          @click="handlePageChange(currentPage - 1)"
        >
          {{ t('article.list.previous') }}
        </button>
        <div v-if="showPageNumbers" class="flex flex-wrap items-center gap-1">
          <button
            type="button"
            class="ui-button-ghost h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!hasPreviousPageWindow || isLoading"
            :aria-label="t('article.list.previousPageWindow')"
            @click="handlePreviousPageWindow"
          >
            &laquo;
          </button>
          <button
            v-for="pageIndex in pageNumbers"
            :key="`bottom-${pageIndex}`"
            type="button"
            class="h-8 min-w-8 px-2 text-xs"
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
            :aria-label="t('article.list.nextPageWindow')"
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
          {{ t('article.list.next') }}
        </button>
      </div>
    </div>
  </section>
</template>
