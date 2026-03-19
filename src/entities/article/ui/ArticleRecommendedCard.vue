<script setup lang="ts">
import { computed } from 'vue';

import type { ArticleRecommendedItemResponse } from '../api/articleApi';

const props = defineProps<{
  article: ArticleRecommendedItemResponse;
}>();

const articlePath = computed(() => `/b/${props.article.boardSlug}/articles/${props.article.articleId}`);

const recommendationToneClass = computed(() =>
  props.article.personalized
    ? 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-950/40 dark:text-cyan-200'
    : 'border-slate-200 bg-white/80 text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300',
);

const recommendationLabel = computed(() => (props.article.personalized ? '맞춤 추천' : '발견 추천'));

const boardLabel = computed(() => {
  const trimmed = props.article.boardName.trim();
  return trimmed.length > 0 ? trimmed : props.article.boardSlug;
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
  <RouterLink :to="articlePath" class="ui-list-row group border-cyan-200 bg-cyan-50/70 dark:border-cyan-900/40 dark:bg-cyan-950/20">
    <div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_7rem_4.5rem_4.5rem_4.5rem] md:items-center">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="ui-badge ui-badge-accent">추천</span>
          <span class="ui-badge" :class="recommendationToneClass">{{ recommendationLabel }}</span>
          <span class="ui-badge ui-badge-muted">{{ boardLabel }}</span>
          <span class="text-[11px] text-slate-400 dark:text-slate-500">{{ formatRelativeTime(article.createdAt) }}</span>
        </div>
        <h3
          class="mt-1 truncate text-sm font-black tracking-tight text-slate-900 transition group-hover:text-cyan-700 dark:text-slate-100 dark:group-hover:text-cyan-300"
        >
          {{ article.title }}
        </h3>
        <p class="mt-1 line-clamp-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {{ article.recommendationReason }}
        </p>
        <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 md:hidden dark:text-slate-400">
          <span>{{ article.authorName }}</span>
          <span>조회 {{ article.hit }}</span>
          <span>추천 {{ article.likeCount }}</span>
        </div>
      </div>

      <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">{{ article.authorName }}</div>
      <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">{{ article.commentCount }}</div>
      <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">{{ article.hit }}</div>
      <div class="hidden text-center text-xs text-cyan-700 md:block dark:text-cyan-300">{{ article.likeCount }}</div>
    </div>
  </RouterLink>
</template>
