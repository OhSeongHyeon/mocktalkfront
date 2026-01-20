<script setup lang="ts">
import { computed } from 'vue';

import type { ArticleSummaryResponse } from '../services/boards';

interface ArticleListProps {
  pinned?: ArticleSummaryResponse[];
  articles: ArticleSummaryResponse[];
  isLoading?: boolean;
  emptyMessage?: string;
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
  (event: 'update:pageSize', pageSize: number): void;
  (event: 'update:page', page: number): void;
}>();

const pinnedList = computed(() => props.pinned ?? []);
const showPinned = computed(() => pinnedList.value.length > 0);
const showEmpty = computed(() => !props.isLoading && pinnedList.value.length === 0 && props.articles.length === 0);
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
const pageNumbers = computed(() => Array.from({ length: totalPages.value }, (_, index) => index));

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
</script>

<template>
  <section v-if="showPinned" class="mt-8">
    <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">공지</h2>
    <div class="mt-3 space-y-3">
      <article
        v-for="article in pinnedList"
        :key="article.id"
        class="flex flex-col gap-2 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-5 py-4 transition hover:-translate-y-0.5 dark:border-amber-900/40 dark:bg-amber-950/30"
      >
        <div class="flex items-center gap-2">
          <span class="inline-flex rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white"> 공지 </span>
          <button
            type="button"
            class="text-left text-sm font-semibold text-slate-900 hover:text-slate-700 dark:text-slate-100 dark:hover:text-white"
            @click="handleSelect(article.id)"
          >
            {{ article.title }}
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>{{ article.authorName }}</span>
          <span>{{ formatDate(article.createdAt) }}</span>
          <span>댓글 {{ article.commentCount }}</span>
          <span>좋아요 {{ article.likeCount }}</span>
          <span>싫어요 {{ article.dislikeCount }}</span>
          <span>조회 {{ article.hit }}</span>
        </div>
      </article>
    </div>
  </section>

  <section class="mt-8">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">게시글</h2>
      <div v-if="showPageSizeControl" class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <label for="article-page-size" class="font-semibold text-slate-600 dark:text-slate-300">표시</label>
        <select
          id="article-page-size"
          class="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-emerald-500/20"
          :value="pageSize"
          @change="handlePageSizeChange"
        >
          <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ option }}개</option>
        </select>
      </div>
    </div>

    <div v-if="showEmpty" class="mt-4">
      <div class="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {{ emptyMessage }}
      </div>
    </div>

    <div v-else class="mt-4 space-y-3">
      <article
        v-for="article in articles"
        :key="article.id"
        class="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 transition hover:-translate-y-0.5 hover:border-slate-300/80 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950"
      >
        <button
          type="button"
          class="text-left text-sm font-semibold text-slate-900 hover:text-slate-700 dark:text-slate-100 dark:hover:text-white"
          @click="handleSelect(article.id)"
        >
          {{ article.title }}
        </button>
        <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>{{ article.authorName }}</span>
          <span>{{ formatDate(article.createdAt) }}</span>
          <span>댓글 {{ article.commentCount }}</span>
          <span>좋아요 {{ article.likeCount }}</span>
          <span>싫어요 {{ article.dislikeCount }}</span>
          <span>조회 {{ article.hit }}</span>
        </div>
      </article>
    </div>

    <div v-if="showPagination" class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          :disabled="!canGoPrevious || isLoading"
          @click="handlePageChange(currentPage - 1)"
        >
          이전
        </button>
        <div v-if="showPageNumbers" class="flex flex-wrap items-center gap-1">
          <button
            v-for="pageIndex in pageNumbers"
            :key="pageIndex"
            type="button"
            class="rounded-full border px-3 py-1 text-xs font-semibold transition"
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
        </div>
        <button
          type="button"
          class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          :disabled="!canGoNext || isLoading"
          @click="handlePageChange(currentPage + 1)"
        >
          다음
        </button>
      </div>
      <span v-if="totalPages > 0">페이지 {{ currentPage + 1 }} / {{ totalPages }}</span>
      <span v-else>페이지 {{ currentPage + 1 }}</span>
    </div>
  </section>
</template>
