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
  <RouterLink
    :to="articlePath"
    class="ui-sub-panel group flex h-full flex-col gap-4 px-5 py-5 transition hover:-translate-y-0.5 hover:border-slate-300/80 hover:shadow-md dark:hover:border-slate-700"
  >
    <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
      <span
        class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        {{ article.boardName }}
      </span>
      <span>{{ formatRelativeTime(article.createdAt) }}</span>
    </div>

    <div class="space-y-2">
      <h3
        class="line-clamp-2 text-lg font-semibold text-slate-900 transition group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-300"
      >
        {{ article.title }}
      </h3>
      <p class="line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {{ previewText }}
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
