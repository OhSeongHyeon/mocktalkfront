<script setup lang="ts">
import { computed } from 'vue';

import { formatKoreanDate } from '../../../shared/lib/date';
import type { ArticleRecentItemResponse } from '../api/articleApi';

const props = defineProps<{
  article: ArticleRecentItemResponse;
}>();

const articlePath = computed(() => `/b/${props.article.boardSlug}/articles/${props.article.id}`);

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = Date.now() - date.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `${minutes}분`;
  }
  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return `${hours}시간`;
  }
  if (diffMs < dayMs * 7) {
    const days = Math.max(1, Math.floor(diffMs / dayMs));
    return `${days}일`;
  }
  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
};
</script>

<template>
  <RouterLink :to="articlePath" class="bbs-row">
    <div class="bbs-cols-6 md:grid">
      <div class="min-w-0">
        <span class="bbs-tag">{{ article.boardName }}</span>
        <span class="bbs-row-title">{{ article.title }}</span>
        <span v-if="article.commentCount > 0" class="bbs-cmt">[{{ article.commentCount }}]</span>
      </div>
      <span class="bbs-cell-center hidden md:block">{{ article.authorName }}</span>
      <span class="bbs-cell-center hidden md:block">{{ formatKoreanDate(article.createdAt) }}</span>
      <span class="bbs-cell-center hidden md:block">{{ article.commentCount }}</span>
      <span class="bbs-cell-center hidden md:block">{{ article.hit }}</span>
      <span class="bbs-cell-center hidden md:block">{{ article.likeCount }}</span>
      <p class="bbs-meta mt-1 md:hidden">{{ article.authorName }} · {{ formatRelativeTime(article.createdAt) }} · 조회 {{ article.hit }}</p>
    </div>
  </RouterLink>
</template>
