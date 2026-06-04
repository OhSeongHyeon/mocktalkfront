<script setup lang="ts">
import { computed } from 'vue';

import type { ArticleBookmarkItemResponse } from '../../entities/article';
import { formatKoreanDate } from '../../shared/lib/date';

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
</script>

<template>
  <section class="mt-6">
    <div class="ui-toolbar gap-3 text-xs text-muted">
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-line text-emerald-600 focus:ring-emerald-200"
          :checked="allSelected"
          :disabled="items.length === 0"
          @change="handleToggleAll"
        />
        <span>전체 선택</span>
      </label>
      <span>선택 {{ selectedIds.length }}개</span>
    </div>

    <div v-if="items.length === 0" class="ui-state ui-state-empty mt-4 px-6 py-10">북마크한 게시글이 없습니다.</div>

    <div v-else class="mt-4 space-y-2">
      <article v-for="item in items" :key="item.id" class="ui-list-row gap-3">
        <div class="flex items-start gap-3">
          <input
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-line text-emerald-600 focus:ring-emerald-200"
            :checked="selectedSet.has(item.id)"
            @change="handleToggle(item.id)"
          />
          <div class="min-w-0 flex-1">
            <button type="button" class="text-left text-sm font-semibold text-ink hover:text-ink dark:hover:text-ink" @click="handleSelect(item.id)">
              {{ item.title }}
            </button>
            <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
              <span>{{ item.authorName }}</span>
              <span>{{ formatKoreanDate(item.createdAt) }}</span>
              <span>댓글 {{ item.commentCount }}</span>
              <span>좋아요 {{ item.likeCount }}</span>
              <span>싫어요 {{ item.dislikeCount }}</span>
              <span>조회 {{ item.hit }}</span>
            </div>
          </div>
        </div>
      </article>
    </div>

    <div v-if="showPagination" class="ui-toolbar mt-4 justify-between gap-3 text-xs text-muted">
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="ui-button-ghost h-8 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
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
            class="h-8 rounded-[0.55rem] border px-3 text-xs font-semibold transition"
            :class="
              pageIndex === currentPage
                ? 'border-[color:var(--line-strong)] bg-surface text-ink'
                : 'border-line text-muted hover:bg-surface-soft dark:border-line dark:text-subtle'
            "
            :disabled="isLoading"
            @click="handlePageChange(pageIndex)"
          >
            {{ pageIndex + 1 }}
          </button>
        </div>
        <button
          type="button"
          class="ui-button-ghost h-8 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
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
