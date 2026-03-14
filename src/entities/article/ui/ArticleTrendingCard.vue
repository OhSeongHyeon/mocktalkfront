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
    class="ui-sub-panel group flex h-full flex-col gap-4 border-amber-200/70 bg-gradient-to-br from-white via-amber-50/70 to-orange-50/80 px-5 py-5 transition hover:-translate-y-0.5 hover:border-amber-300/80 hover:shadow-md dark:border-amber-900/30 dark:from-slate-950 dark:via-amber-950/20 dark:to-orange-950/20 dark:hover:border-amber-800/60"
  >
    <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
      <span
        class="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200"
      >
        트렌딩
      </span>
      <span
        class="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
      >
        /{{ boardLabel }}
      </span>
      <span>{{ formatRelativeTime(article.createdAt) }}</span>
    </div>

    <div class="space-y-2">
      <h3
        class="line-clamp-2 text-lg font-semibold text-slate-900 transition group-hover:text-amber-700 dark:text-slate-100 dark:group-hover:text-amber-300"
      >
        {{ article.title }}
      </h3>
      <p class="line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">최근 조회, 댓글, 반응이 집중된 공개 글입니다.</p>
    </div>

    <div class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
      <span>{{ article.authorName }}</span>
      <span>점수 {{ trendScoreLabel }}</span>
      <span>댓글 {{ article.commentCount }}</span>
      <span>좋아요 {{ article.likeCount }}</span>
      <span>조회 {{ article.hit }}</span>
    </div>
  </RouterLink>
</template>
