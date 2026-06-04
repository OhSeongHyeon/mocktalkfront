<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import ConfirmModal from '../shared/ui/ConfirmModal.vue';
import { clearHistoryItems, getHistoryItems, removeHistoryItem } from '../shared/lib/history';
import type { HistoryItem } from '../shared/lib/history';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import { formatKoreanDateTime } from '../shared/lib/date';
import AppShell from '../widgets/layout/AppShell.vue';

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
        <PageHeader title="기록" description="최근 열람한 게시글을 확인할 수 있습니다. 이 기록은 브라우저에만 저장됩니다.">
          <template #actions>
            <button type="button" class="ui-button-ghost h-9 px-4 text-xs" @click="openClearModal">전체 삭제</button>
          </template>
        </PageHeader>

        <div class="ui-panel p-4">
          <div class="flex flex-wrap items-center gap-3">
            <input v-model="searchKeyword" type="search" class="ui-input min-w-[200px] flex-1" placeholder="제목, 게시판명, 슬러그 검색" />
            <span class="ui-badge ui-badge-muted">총 {{ filteredItems.length }}건</span>
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
              <p class="text-xs text-subtle">방문 {{ formatKoreanDateTime(item.visitedAt, item.visitedAt) }}</p>
            </button>
            <button type="button" class="ui-button-danger h-8 shrink-0 px-3 text-xs" @click="handleRemove(item)">삭제</button>
          </div>
        </div>

        <div v-else class="ui-state ui-state-empty px-6 py-12">기록이 없습니다.</div>
      </div>
    </PageContainer>

    <ConfirmModal
      :open="isClearModalOpen"
      title="기록 전체 삭제"
      description="기록을 모두 삭제할까요? 삭제한 기록은 복구할 수 없습니다."
      confirm-label="삭제"
      confirm-variant="danger"
      @close="closeClearModal"
      @confirm="handleClear"
    />
  </AppShell>
</template>
