<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

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

const { t } = useI18n();
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
        <span>{{ t('article.bookmarkPage.selectAll') }}</span>
      </label>
      <span>{{ t('article.bookmarkPage.selectedCount', { count: selectedIds.length }) }}</span>
    </div>

    <div v-if="items.length === 0" class="ui-state ui-state-empty mt-4 px-6 py-10">{{ t('article.bookmarkPage.listEmpty') }}</div>

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
              <span>{{ t('article.bookmarkPage.stats.comments', { count: item.commentCount }) }}</span>
              <span>{{ t('article.bookmarkPage.stats.likes', { count: item.likeCount }) }}</span>
              <span>{{ t('article.bookmarkPage.stats.dislikes', { count: item.dislikeCount }) }}</span>
              <span>{{ t('article.bookmarkPage.stats.views', { count: item.hit }) }}</span>
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
          {{ t('common.previous') }}
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
          {{ t('common.next') }}
        </button>
      </div>
      <span>{{ t('common.pageOf', { current: currentPage + 1, total: totalPages }) }}</span>
    </div>
  </section>
</template>
