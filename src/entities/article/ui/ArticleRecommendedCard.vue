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
  <RouterLink
    :to="articlePath"
    class="ui-list-row group border-cyan-200/80 bg-gradient-to-r from-white via-cyan-50/70 to-sky-50/70 dark:border-cyan-900/40 dark:from-slate-950 dark:via-cyan-950/20 dark:to-sky-950/20"
  >
    <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="ui-badge ui-badge-accent">추천</span>
          <span class="ui-badge" :class="recommendationToneClass">{{ recommendationLabel }}</span>
          <span class="ui-badge ui-badge-muted">{{ boardLabel }}</span>
          <span class="ui-badge ui-badge-muted">{{ formatRelativeTime(article.createdAt) }}</span>
        </div>
        <h3
          class="mt-2 line-clamp-1 text-base font-black tracking-tight text-slate-900 transition group-hover:text-cyan-700 dark:text-slate-100 dark:group-hover:text-cyan-300"
        >
          {{ article.title }}
        </h3>
        <p class="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {{ article.recommendationReason }}
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>{{ article.authorName }}</span>
          <span>{{ props.article.personalized ? '개인화 반영' : '발견 추천' }}</span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 md:justify-end">
        <span class="ui-badge ui-badge-muted">댓글 {{ article.commentCount }}</span>
        <span class="ui-badge ui-badge-accent">추천 {{ article.likeCount }}</span>
        <span class="ui-badge ui-badge-muted">조회 {{ article.hit }}</span>
      </div>
    </div>
  </RouterLink>
</template>
