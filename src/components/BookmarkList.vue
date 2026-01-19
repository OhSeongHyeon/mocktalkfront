<script setup lang="ts">
import { computed } from 'vue';

import type { ArticleBookmarkItemResponse } from '../services/articles';

interface BookmarkListProps {
  items: ArticleBookmarkItemResponse[];
  selectedIds: number[];
  isLoading?: boolean;
  page?: number;
  totalPages?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const props = defineProps<BookmarkListProps>();
const emit = defineEmits<{
  (event: 'toggle', articleId: number): void;
  (event: 'toggleAll', checked: boolean): void;
  (event: 'select', articleId: number): void;
  (event: 'update:page', page: number): void;
}>();

const currentPage = computed(() => props.page ?? 0);
const totalPages = computed(() => props.totalPages ?? 0);
const canGoPrevious = computed(() => (props.hasPrevious !== undefined ? props.hasPrevious : currentPage.value > 0));
const canGoNext = computed(() => {
  if (props.hasNext !== undefined) {
    return props.hasNext;
  }
  return currentPage.value + 1 < totalPages.value;
});
const showPagination = computed(() => totalPages.value > 1);
const pageNumbers = computed(() => Array.from({ length: totalPages.value }, (_, index) => index));

const selectedSet = computed(() => new Set(props.selectedIds));
const allSelected = computed(() => props.items.length > 0 && props.items.every((item) => selectedSet.value.has(item.id)));

const handleToggleAll = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  if (!target) {
    return;
  }
  emit('toggleAll', target.checked);
};

const handleToggle = (articleId: number) => {
  emit('toggle', articleId);
};

const handleSelect = (articleId: number) => {
  emit('select', articleId);
};

const handlePageChange = (page: number) => {
  if (page < 0 || page >= totalPages.value) {
    return;
  }
  emit('update:page', page);
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
</script>

<template>
  <section class="mt-6">
    <div class="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200 dark:border-slate-700"
          :checked="allSelected"
          :disabled="items.length === 0"
          @change="handleToggleAll"
        />
        <span>전체 선택</span>
      </label>
      <span>선택 {{ selectedIds.length }}개</span>
    </div>

    <div v-if="items.length === 0" class="mt-4 rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
      북마크한 게시글이 없습니다.
    </div>

    <div v-else class="mt-4 space-y-3">
      <article
        v-for="item in items"
        :key="item.id"
        class="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 transition hover:-translate-y-0.5 hover:border-slate-300/80 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950"
      >
        <div class="flex items-start gap-3">
          <input
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200 dark:border-slate-700"
            :checked="selectedSet.has(item.id)"
            @change="handleToggle(item.id)"
          />
          <div class="flex-1">
            <button
              type="button"
              class="text-left text-sm font-semibold text-slate-900 hover:text-slate-700 dark:text-slate-100 dark:hover:text-white"
              @click="handleSelect(item.id)"
            >
              {{ item.title }}
            </button>
            <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>{{ item.authorName }}</span>
              <span>{{ formatDate(item.createdAt) }}</span>
              <span>댓글 {{ item.commentCount }}</span>
              <span>좋아요 {{ item.likeCount }}</span>
              <span>싫어요 {{ item.dislikeCount }}</span>
              <span>조회 {{ item.hit }}</span>
            </div>
          </div>
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
        <div class="flex flex-wrap items-center gap-1">
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
      <span>페이지 {{ currentPage + 1 }} / {{ totalPages }}</span>
    </div>
  </section>
</template>
