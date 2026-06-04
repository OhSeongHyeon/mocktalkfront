<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { ApiError } from '../shared/lib/http/api';
import { getBoardSubscribes, resolveBoardSummaryDescription, resolveBoardVisibilityLabel } from '../entities/board';
import type { BoardSubscribeItemResponse } from '../entities/board';
import FileImage from '../entities/file/ui/FileImage.vue';
import { LayoutGrid } from '@lucide/vue';

import AppIcon from '../shared/ui/AppIcon.vue';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import { formatKoreanDate } from '../shared/lib/date';
import AppShell from '../widgets/layout/AppShell.vue';

const { t } = useI18n();

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
    listError.value = error instanceof ApiError ? error.message : t('board.errors.loadSubscribesFailed');
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
        <PageHeader :title="t('board.subscribePage.title')" :description="t('board.subscribePage.description')">
          <template #meta>
            <span class="ui-badge ui-badge-success">{{ t('board.subscribePage.currentPage', { page: page + 1 }) }}</span>
            <span v-if="totalPages > 0" class="ui-badge ui-badge-muted">{{ t('board.subscribePage.totalPages', { count: totalPages }) }}</span>
          </template>
        </PageHeader>

        <div v-if="listError" class="ui-state ui-state-danger">
          {{ listError }}
        </div>

        <div v-if="subscribes.length > 0" class="bbs-box overflow-hidden">
          <div
            class="hidden grid-cols-[3.5rem_minmax(0,1fr)_7rem_7rem] gap-3 border-b border-line bg-surface-1 px-3 py-2 text-xs font-semibold text-subtle md:grid"
          >
            <span>{{ t('board.subscribePage.columnImage') }}</span>
            <span>{{ t('board.subscribePage.columnBoard') }}</span>
            <span class="text-center">{{ t('board.subscribePage.columnVisibility') }}</span>
            <span class="text-center">{{ t('board.subscribePage.columnSubscribedAt') }}</span>
          </div>
          <RouterLink v-for="board in subscribes" :key="board.id" :to="`/b/${board.slug}`" class="bbs-row group block">
            <div class="grid gap-3 md:grid-cols-[3.5rem_minmax(0,1fr)_7rem_7rem] md:items-center">
              <div class="h-14 overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface-soft">
                <FileImage
                  v-if="board.boardImage"
                  :file="board.boardImage"
                  variant="thumb"
                  :alt="board.boardName"
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-subtle">
                  <AppIcon :icon="LayoutGrid" :size="20" icon-class="text-muted" />
                </div>
              </div>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="ui-badge ui-badge-accent">{{ t('board.subscribe.subscribedBadge') }}</span>
                  <span class="bbs-meta">/{{ board.slug }}</span>
                </div>
                <h2 class="bbs-row-title mt-1 truncate transition group-hover:text-link">
                  {{ board.boardName }}
                </h2>
                <p class="ui-caption mt-1 line-clamp-1 leading-5">
                  {{ resolveBoardSummaryDescription(board.description) }}
                </p>
              </div>

              <div class="hidden justify-center md:flex">
                <span class="ui-badge ui-badge-muted">{{ resolveBoardVisibilityLabel(board.visibility) }}</span>
              </div>

              <div class="bbs-meta flex flex-wrap items-center gap-2 md:block md:text-center">
                <span class="ui-badge ui-badge-success md:hidden">{{
                  t('board.subscribe.subscribedDate', { date: formatKoreanDate(board.subscribedAt) })
                }}</span>
                <span class="hidden md:inline">{{ formatKoreanDate(board.subscribedAt) }}</span>
              </div>
            </div>
          </RouterLink>
        </div>

        <div v-else-if="!isInitialLoading && !listError" class="ui-state ui-state-empty px-6 py-12">{{ t('board.subscribePage.empty') }}</div>

        <div v-if="isInitialLoading" class="flex items-center gap-2 text-sm text-muted">
          <span class="h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)]"></span>
          {{ t('board.subscribePage.loading') }}
        </div>

        <div v-if="showPagination" class="ui-toolbar justify-between text-xs text-muted">
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="!hasPrevious || isLoading"
              @click="handlePageChange(page - 1)"
            >
              {{ t('common.previous') }}
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
              {{ t('common.next') }}
            </button>
          </div>
          <span>{{ t('board.subscribePage.pageSummary', { current: page + 1, total: totalPages }) }}</span>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>
