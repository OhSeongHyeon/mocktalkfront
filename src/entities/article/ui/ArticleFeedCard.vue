<script setup lang="ts">
import { computed } from 'vue';

import type { ArticleRecentItemResponse } from '../api/articleApi';

const props = defineProps<{
  article: ArticleRecentItemResponse;
}>();

const articlePath = computed(() => `/b/${props.article.boardSlug}/articles/${props.article.id}`);

const previewText = computed(() => {
  const trimmed = props.article.previewText.trim();
  return trimmed.length > 0 ? trimmed : '본문 미리보기가 없습니다.';
});

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
    return `${minutes}분 전`;
  }
  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return `${hours}시간 전`;
  }
  if (diffMs < dayMs * 7) {
    const days = Math.max(1, Math.floor(diffMs / dayMs));
    return `${days}일 전`;
  }
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
};
</script>

<template>
  <RouterLink :to="articlePath" class="ui-list-row group">
    <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="ui-badge ui-badge-accent">{{ article.boardName }}</span>
          <span class="ui-badge ui-badge-muted">{{ formatRelativeTime(article.createdAt) }}</span>
        </div>
        <h3
          class="group-hover:text-brand-700 dark:group-hover:text-brand-300 mt-2 line-clamp-1 text-base font-black tracking-tight text-slate-900 transition dark:text-slate-100"
        >
          {{ article.title }}
        </h3>
        <p class="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {{ previewText }}
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>{{ article.authorName }}</span>
          <span>최근 등록</span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 md:justify-end">
        <span class="ui-badge ui-badge-muted">댓글 {{ article.commentCount }}</span>
        <span class="ui-badge ui-badge-muted">추천 {{ article.likeCount }}</span>
        <span class="ui-badge ui-badge-muted">조회 {{ article.hit }}</span>
      </div>
    </div>
  </RouterLink>
</template>
