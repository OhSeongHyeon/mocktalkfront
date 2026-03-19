<script setup lang="ts">
import { computed } from 'vue';

import type { ArticleTrendingItemResponse } from '../api/articleApi';

const props = defineProps<{
  article: ArticleTrendingItemResponse;
}>();

const articlePath = computed(() => `/b/${props.article.boardSlug}/articles/${props.article.articleId}`);

const trendScoreLabel = computed(() =>
  new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(props.article.trendScore),
);

const boardLabel = computed(() => {
  const normalized = props.article.boardSlug.trim();
  return normalized.length > 0 ? normalized : 'board';
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
    class="ui-list-row group border-amber-200/80 bg-gradient-to-r from-white via-amber-50/70 to-orange-50/70 dark:border-amber-900/40 dark:from-slate-950 dark:via-amber-950/20 dark:to-orange-950/20"
  >
    <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="ui-badge ui-badge-warning">트렌딩</span>
          <span class="ui-badge ui-badge-muted">/{{ boardLabel }}</span>
          <span class="ui-badge ui-badge-muted">{{ formatRelativeTime(article.createdAt) }}</span>
        </div>
        <h3
          class="mt-2 line-clamp-1 text-base font-black tracking-tight text-slate-900 transition group-hover:text-amber-700 dark:text-slate-100 dark:group-hover:text-amber-300"
        >
          {{ article.title }}
        </h3>
        <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">최근 조회, 댓글, 반응이 집중된 공개 글입니다.</p>
        <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>{{ article.authorName }}</span>
          <span>점수 {{ trendScoreLabel }}</span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 md:justify-end">
        <span class="ui-badge ui-badge-warning">댓글 {{ article.commentCount }}</span>
        <span class="ui-badge ui-badge-warning">추천 {{ article.likeCount }}</span>
        <span class="ui-badge ui-badge-muted">조회 {{ article.hit }}</span>
      </div>
    </div>
  </RouterLink>
</template>
