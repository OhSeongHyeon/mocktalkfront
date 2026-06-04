<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { getBoardSubscribes, resolveBoardVisibilityLabel, type BoardSubscribeItemResponse } from '../../entities/board';
import { useAuthStore } from '../../stores/auth';
import { formatKoreanDate } from '../../shared/lib/date';
import { ApiError } from '../../shared/lib/http/api';
import SectionHeader from '../../shared/ui/SectionHeader.vue';

const { t } = useI18n();

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
    listError.value = error instanceof ApiError ? error.message : t('home.subscription.error');
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
    <SectionHeader :title="t('home.subscription.title')">
      <template #actions>
        <RouterLink to="/boards/subscribes" class="ui-button-ghost h-8 px-2.5 text-xs">{{ t('home.subscription.more') }}</RouterLink>
      </template>
    </SectionHeader>

    <div v-if="listError" class="ui-state ui-state-danger ui-section-message">{{ listError }}</div>
    <div v-else-if="isLoading" class="ui-section-loading">{{ t('common.loading') }}</div>
    <template v-else-if="subscribes.length > 0">
      <RouterLink v-for="board in subscribes" :key="board.id" :to="`/b/${board.slug}`" class="bbs-row">
        <span class="bbs-tag">{{ resolveBoardVisibilityLabel(board.visibility) }}</span>
        <span class="bbs-row-title">{{ board.boardName }}</span>
        <span class="bbs-meta ml-2">{{ formatKoreanDate(board.subscribedAt) }}</span>
      </RouterLink>
    </template>
    <div v-else-if="showEmptyState" class="ui-state ui-state-empty ui-section-message">{{ t('home.subscription.empty') }}</div>
  </section>
</template>
