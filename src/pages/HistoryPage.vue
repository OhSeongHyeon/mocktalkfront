<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import ConfirmModal from '../shared/ui/ConfirmModal.vue';
import { clearHistoryItems, getHistoryItems, removeHistoryItem } from '../shared/lib/history';
import type { HistoryItem } from '../shared/lib/history';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import { formatKoreanDateTime } from '../shared/lib/date';
import AppShell from '../widgets/layout/AppShell.vue';

const { t } = useI18n();
const router = useRouter();
const items = ref<HistoryItem[]>([]);
const searchKeyword = ref('');
const isClearModalOpen = ref(false);

const loadHistory = () => {
  items.value = getHistoryItems();
};

const filteredItems = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return items.value;
  }
  return items.value.filter((item) => {
    const title = item.title.toLowerCase();
    const boardName = (item.boardName ?? '').toLowerCase();
    const boardSlug = item.boardSlug.toLowerCase();
    return title.includes(keyword) || boardName.includes(keyword) || boardSlug.includes(keyword);
  });
});

const goArticle = async (item: HistoryItem) => {
  await router.push(`/b/${item.boardSlug}/articles/${item.articleId}`);
};

const handleRemove = (item: HistoryItem) => {
  removeHistoryItem(item.articleId);
  items.value = items.value.filter((value) => value.articleId !== item.articleId);
};

const handleClear = () => {
  if (!items.value.length) {
    return;
  }
  clearHistoryItems();
  items.value = [];
  isClearModalOpen.value = false;
};

const openClearModal = () => {
  if (!items.value.length) {
    return;
  }
  isClearModalOpen.value = true;
};

const closeClearModal = () => {
  isClearModalOpen.value = false;
};

onMounted(async () => {
  await nextTick();
  loadHistory();
});
</script>

<template>
  <AppShell>
    <PageContainer width="auto">
      <div class="space-y-6">
        <PageHeader :title="t('history.title')" :description="t('history.description')">
          <template #actions>
            <button type="button" class="ui-button-ghost h-9 px-4 text-xs" @click="openClearModal">{{ t('history.clearAll') }}</button>
          </template>
        </PageHeader>

        <div class="ui-panel p-4">
          <div class="flex flex-wrap items-center gap-3">
            <input v-model="searchKeyword" type="search" class="ui-input min-w-[200px] flex-1" :placeholder="t('history.searchPlaceholder')" />
            <span class="ui-badge ui-badge-muted">{{ t('history.totalCount', { count: filteredItems.length }) }}</span>
          </div>
        </div>

        <div v-if="filteredItems.length > 0" class="flex flex-col gap-2">
          <div v-for="item in filteredItems" :key="item.articleId" class="ui-list-row sm:flex-row sm:items-center sm:justify-between">
            <button type="button" class="flex min-w-0 flex-1 flex-col gap-1 text-left" @click="goArticle(item)">
              <p class="text-xs font-semibold text-subtle">
                {{ item.boardName ?? item.boardSlug }}
                <span class="ml-2 text-[11px] text-subtle">{{ item.boardSlug }}</span>
              </p>
              <p class="truncate text-sm font-semibold text-ink">
                {{ item.title }}
              </p>
              <p class="text-xs text-subtle">
                {{ t('history.visitedAt', { date: formatKoreanDateTime(item.visitedAt, item.visitedAt) }) }}
              </p>
            </button>
            <button type="button" class="ui-button-danger h-8 shrink-0 px-3 text-xs" @click="handleRemove(item)">{{ t('common.delete') }}</button>
          </div>
        </div>

        <div v-else class="ui-state ui-state-empty px-6 py-12">{{ t('history.empty') }}</div>
      </div>
    </PageContainer>

    <ConfirmModal
      :open="isClearModalOpen"
      :title="t('history.clearModal.title')"
      :description="t('history.clearModal.description')"
      :confirm-label="t('common.delete')"
      confirm-variant="danger"
      @close="closeClearModal"
      @confirm="handleClear"
    />
  </AppShell>
</template>
