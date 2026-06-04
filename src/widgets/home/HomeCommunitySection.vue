<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { getBoards, resolveBoardWritePolicyLabel, type BoardResponse } from '../../entities/board';
import { ApiError } from '../../shared/lib/http/api';
import SectionHeader from '../../shared/ui/SectionHeader.vue';

const boards = ref<BoardResponse[]>([]);
const isLoading = ref(false);
const listError = ref('');
const targetCount = 15;
const pageSize = 15;
const excludedSlugs = new Set(['notice', 'inquiry']);

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
  <section class="bbs-box">
    <SectionHeader title="공개 게시판">
      <template #actions>
        <RouterLink to="/boards" class="ui-button-ghost h-8 px-2.5 text-xs">더보기</RouterLink>
      </template>
    </SectionHeader>

    <div v-if="listError" class="ui-state ui-state-danger ui-section-message">{{ listError }}</div>
    <div v-else-if="isLoading" class="ui-section-loading">불러오는 중...</div>
    <template v-else-if="boards.length > 0">
      <RouterLink v-for="board in boards" :key="board.id" :to="`/b/${board.slug}`" class="bbs-row">
        <span class="bbs-tag">{{ resolveBoardWritePolicyLabel(board.articleWritePolicy) }}</span>
        <span class="bbs-row-title">{{ board.boardName }}</span>
        <span class="bbs-meta ml-2">/{{ board.slug }}</span>
      </RouterLink>
    </template>
    <div v-else class="ui-state ui-state-empty ui-section-message">게시판이 없습니다.</div>
  </section>
</template>
