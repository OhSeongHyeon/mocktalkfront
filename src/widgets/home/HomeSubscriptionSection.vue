<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';

import { getBoardSubscribes, resolveBoardVisibilityLabel, type BoardSubscribeItemResponse } from '../../entities/board';
import { useAuthStore } from '../../stores/auth';
import { formatKoreanDate } from '../../shared/lib/date';
import { ApiError } from '../../shared/lib/http/api';
import SectionHeader from '../../shared/ui/SectionHeader.vue';

const isLoading = ref(false);
const listError = ref('');
const subscribes = ref<BoardSubscribeItemResponse[]>([]);
const pageSize = 6;
const authStore = useAuthStore();
const { isAuthenticated } = storeToRefs(authStore);

const showEmptyState = computed(() => !isLoading.value && !listError.value && subscribes.value.length === 0);

const loadSubscribes = async () => {
  if (!isAuthenticated.value || isLoading.value) {
    return;
  }
  listError.value = '';
  isLoading.value = true;
  try {
    const data = await getBoardSubscribes(0, pageSize);
    subscribes.value = data.items;
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '구독 목록을 불러오지 못했습니다.';
    subscribes.value = [];
  } finally {
    isLoading.value = false;
  }
};

watch(
  isAuthenticated,
  async (authenticated) => {
    if (!authenticated) {
      listError.value = '';
      subscribes.value = [];
      return;
    }
    await loadSubscribes();
  },
  { immediate: true },
);
</script>

<template>
  <section class="bbs-box">
    <SectionHeader title="구독 게시판">
      <template #actions>
        <RouterLink to="/boards/subscribes" class="ui-button-ghost h-8 px-2.5 text-xs">전체</RouterLink>
      </template>
    </SectionHeader>

    <div v-if="listError" class="ui-state ui-state-danger m-3">{{ listError }}</div>
    <div v-else-if="isLoading" class="px-3 py-5 text-sm text-muted">불러오는 중...</div>
    <template v-else-if="subscribes.length > 0">
      <RouterLink v-for="board in subscribes" :key="board.id" :to="`/b/${board.slug}`" class="bbs-row">
        <span class="bbs-tag">{{ resolveBoardVisibilityLabel(board.visibility) }}</span>
        <span class="bbs-row-title">{{ board.boardName }}</span>
        <span class="bbs-meta ml-2">{{ formatKoreanDate(board.subscribedAt) }}</span>
      </RouterLink>
    </template>
    <div v-else-if="showEmptyState" class="ui-state ui-state-empty m-3">구독한 게시판이 없습니다.</div>
  </section>
</template>
