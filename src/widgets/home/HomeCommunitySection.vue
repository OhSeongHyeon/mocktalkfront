<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { getBoards, type BoardResponse } from '../../entities/board';
import FileImage from '../../entities/file/ui/FileImage.vue';
import { ApiError } from '../../shared/lib/http/api';
import SectionHeader from '../../shared/ui/SectionHeader.vue';
import boardPlaceholderIcon from '../../assets/icons/icon-board-placeholder.svg';

const boards = ref<BoardResponse[]>([]);
const isLoading = ref(false);
const listError = ref('');
const targetCount = 15;
const pageSize = 15;
const excludedSlugs = new Set(['notice', 'inquiry']);

const resolveDescription = (description: string | null) => {
  const trimmed = description?.trim();
  return trimmed ? trimmed : '설명이 없습니다.';
};

const resolveWritePolicyLabel = (writePolicy: string) => {
  if (writePolicy === 'ALL_AUTHENTICATED') {
    return '회원 글쓰기';
  }
  if (writePolicy === 'MEMBER') {
    return '멤버 전용';
  }
  if (writePolicy === 'MODERATOR') {
    return '운영진 전용';
  }
  if (writePolicy === 'OWNER') {
    return '개설자 전용';
  }
  return '정책 미정';
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
  });
};

const loadPublicBoards = async () => {
  if (isLoading.value) {
    return;
  }

  isLoading.value = true;
  listError.value = '';

  try {
    const collected: BoardResponse[] = [];
    const seenBoardIds = new Set<number>();
    let page = 0;
    let hasNext = true;

    while (hasNext && collected.length < targetCount) {
      const data = await getBoards(page, pageSize);
      data.items
        .filter((board) => board.visibility === 'PUBLIC' && !excludedSlugs.has(board.slug) && !seenBoardIds.has(board.id))
        .forEach((board) => {
          seenBoardIds.add(board.id);
          collected.push(board);
        });
      hasNext = data.hasNext;
      page = data.page + 1;
    }

    boards.value = collected.slice(0, targetCount);
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '공개 커뮤니티를 불러오지 못했습니다.';
    boards.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadPublicBoards();
});
</script>

<template>
  <section class="ui-panel overflow-hidden">
    <div class="px-5 py-5 sm:px-6">
      <SectionHeader title="공개 커뮤니티" description="홈에는 누구나 둘러볼 수 있는 공개 커뮤니티만 표시됩니다.">
        <template #actions>
          <RouterLink to="/boards" class="ui-button-ghost h-10 px-4 text-xs">더보기</RouterLink>
        </template>
      </SectionHeader>

      <div v-if="listError" class="ui-state ui-state-danger mt-5">
        {{ listError }}
      </div>

      <div v-else-if="isLoading" class="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
        공개 커뮤니티를 불러오는 중입니다.
      </div>

      <div v-else-if="boards.length > 0" class="mt-5 grid gap-3 xl:grid-cols-2">
        <RouterLink v-for="board in boards" :key="board.id" :to="`/b/${board.slug}`" class="ui-list-row group">
          <div class="grid gap-3 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto] sm:items-center">
            <div class="h-24 overflow-hidden rounded-[1.1rem] bg-slate-100 dark:bg-slate-900">
              <FileImage
                v-if="board.boardImage"
                :file="board.boardImage"
                variant="thumb"
                :alt="board.boardName"
                class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                <img :src="boardPlaceholderIcon" alt="" aria-hidden="true" class="h-8 w-8" />
              </div>
            </div>

            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="ui-badge ui-badge-success">공개</span>
                <span class="ui-badge ui-badge-muted">{{ resolveWritePolicyLabel(board.articleWritePolicy) }}</span>
                <span class="text-xs text-slate-400 dark:text-slate-500">/{{ board.slug }}</span>
              </div>
              <h3
                class="group-hover:text-brand-700 dark:group-hover:text-brand-300 mt-2 truncate text-base font-black tracking-tight text-slate-900 transition dark:text-slate-100"
              >
                {{ board.boardName }}
              </h3>
              <p class="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {{ resolveDescription(board.description) }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              <span class="ui-badge ui-badge-muted">바로 입장</span>
              <span class="text-xs text-slate-400 dark:text-slate-500">개설 {{ formatDate(board.createdAt) }}</span>
            </div>
          </div>
        </RouterLink>
      </div>

      <div v-else class="ui-state ui-state-empty mt-5 px-5 py-8">아직 공개 커뮤니티가 없습니다.</div>
    </div>
  </section>
</template>
