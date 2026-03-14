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
    class="ui-sub-panel group flex h-full flex-col gap-4 border-cyan-200/70 bg-gradient-to-br from-white via-cyan-50/70 to-sky-50/80 px-5 py-5 transition hover:-translate-y-0.5 hover:border-cyan-300/80 hover:shadow-md dark:border-cyan-900/30 dark:from-slate-950 dark:via-cyan-950/20 dark:to-sky-950/20 dark:hover:border-cyan-800/60"
  >
    <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
      <span
        class="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-950/40 dark:text-cyan-200"
      >
        추천
      </span>
      <span class="rounded-full border px-2.5 py-1 text-[11px]" :class="recommendationToneClass">
        {{ recommendationLabel }}
      </span>
      <span
        class="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
      >
        {{ boardLabel }}
      </span>
      <span>{{ formatRelativeTime(article.createdAt) }}</span>
    </div>

    <div class="space-y-2">
      <h3
        class="line-clamp-2 text-lg font-semibold text-slate-900 transition group-hover:text-cyan-700 dark:text-slate-100 dark:group-hover:text-cyan-300"
      >
        {{ article.title }}
      </h3>
      <p class="line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {{ article.recommendationReason }}
      </p>
    </div>

    <div class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
      <span>{{ article.authorName }}</span>
      <span>댓글 {{ article.commentCount }}</span>
      <span>좋아요 {{ article.likeCount }}</span>
      <span>조회 {{ article.hit }}</span>
    </div>
  </RouterLink>
</template>
