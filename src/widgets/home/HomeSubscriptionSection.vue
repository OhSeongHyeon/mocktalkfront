<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';

import { getBoardSubscribes, type BoardSubscribeItemResponse } from '../../entities/board';
import FileImage from '../../entities/file/ui/FileImage.vue';
import { useAuthStore } from '../../stores/auth';
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

const resolveDescription = (description: string | null) => {
  const trimmed = description?.trim();
  return trimmed ? trimmed : '설명이 없습니다.';
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
  <section class="ui-panel px-5 py-5 sm:px-6">
    <SectionHeader title="내 구독 커뮤니티" description="자주 찾는 커뮤니티를 바로 열 수 있습니다.">
      <template #actions>
        <RouterLink
          to="/boards/subscribes"
          class="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          전체 보기
        </RouterLink>
      </template>
    </SectionHeader>

    <div v-if="listError" class="ui-state ui-state-danger mt-5">
      {{ listError }}
    </div>

    <div v-else-if="isLoading" class="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
      구독 목록을 불러오는 중입니다.
    </div>

    <div v-else-if="subscribes.length > 0" class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <RouterLink
        v-for="board in subscribes"
        :key="board.id"
        :to="`/b/${board.slug}`"
        class="ui-sub-panel group block overflow-hidden transition hover:-translate-y-0.5 hover:border-slate-300/80 hover:shadow-md dark:hover:border-slate-700"
      >
        <div class="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
          <FileImage
            v-if="board.boardImage"
            :file="board.boardImage"
            variant="thumb"
            :alt="board.boardName"
            class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
            <img :src="boardPlaceholderIcon" alt="" aria-hidden="true" class="h-7 w-7" />
            <span class="text-xs">대표 이미지 없음</span>
          </div>
        </div>
        <div class="flex flex-col gap-2 px-4 py-4">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{{ board.boardName }}</h3>
          <p class="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
            {{ resolveDescription(board.description) }}
          </p>
          <span class="text-xs font-semibold text-slate-400 dark:text-slate-500">구독일 {{ formatDate(board.subscribedAt) }}</span>
        </div>
      </RouterLink>
    </div>

    <div v-else-if="showEmptyState" class="ui-state ui-state-empty mt-5 px-5 py-8">
      아직 구독한 커뮤니티가 없습니다. 관심 있는 커뮤니티를 둘러보세요.
    </div>
  </section>
</template>
