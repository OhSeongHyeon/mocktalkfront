<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';

import {
  getBoardSubscribes,
  resolveBoardSummaryDescription,
  resolveBoardVisibilityLabel,
  type BoardSubscribeItemResponse,
} from '../../entities/board';
import FileImage from '../../entities/file/ui/FileImage.vue';
import { useAuthStore } from '../../stores/auth';
import { formatKoreanDate } from '../../shared/lib/date';
import { ApiError } from '../../shared/lib/http/api';
import SectionHeader from '../../shared/ui/SectionHeader.vue';
import boardPlaceholderIcon from '../../assets/icons/icon-board-placeholder.svg';

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
  <section class="ui-panel overflow-hidden">
    <div class="px-4 py-4 sm:px-5">
      <SectionHeader eyebrow="Subscriptions" title="내 구독 커뮤니티" description="자주 찾는 게시판만 먼저 모아봅니다.">
        <template #actions>
          <RouterLink to="/boards/subscribes" class="ui-button-ghost h-9 px-3.5 text-xs">전체 보기</RouterLink>
        </template>
      </SectionHeader>

      <div v-if="listError" class="ui-state ui-state-danger mt-5">
        {{ listError }}
      </div>

      <div v-else-if="isLoading" class="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
        구독 목록을 불러오는 중입니다.
      </div>

      <div v-else-if="subscribes.length > 0" class="mt-4 space-y-2">
        <RouterLink v-for="board in subscribes" :key="board.id" :to="`/b/${board.slug}`" class="ui-list-row group">
          <div class="grid gap-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-center">
            <div class="h-14 overflow-hidden rounded-[0.55rem] border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
              <FileImage v-if="board.boardImage" :file="board.boardImage" variant="thumb" :alt="board.boardName" class="h-full w-full object-cover" />
              <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                <img :src="boardPlaceholderIcon" alt="" aria-hidden="true" class="h-5 w-5" />
              </div>
            </div>

            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="ui-badge ui-badge-accent">구독</span>
                <span class="ui-badge ui-badge-muted">{{ resolveBoardVisibilityLabel(board.visibility) }}</span>
                <span class="text-xs text-slate-400 dark:text-slate-500">/{{ board.slug }}</span>
              </div>
              <h3
                class="group-hover:text-brand-700 dark:group-hover:text-brand-300 mt-1 truncate text-sm font-black tracking-tight text-slate-900 transition dark:text-slate-100"
              >
                {{ board.boardName }}
              </h3>
              <p class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {{ resolveBoardSummaryDescription(board.description) }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              <span class="ui-badge ui-badge-success">구독일 {{ formatKoreanDate(board.subscribedAt) }}</span>
              <span class="text-xs text-slate-400 dark:text-slate-500">바로 이동</span>
            </div>
          </div>
        </RouterLink>
      </div>

      <div v-else-if="showEmptyState" class="ui-state ui-state-empty mt-5 px-5 py-8">
        아직 구독한 커뮤니티가 없습니다. 관심 있는 커뮤니티를 둘러보세요.
      </div>
    </div>
  </section>
</template>
