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
    <div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_7rem_4.5rem_4.5rem_4.5rem] md:items-center">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="ui-badge ui-badge-accent">{{ article.boardName }}</span>
          <span class="text-[11px] text-slate-400 dark:text-slate-500">{{ formatRelativeTime(article.createdAt) }}</span>
        </div>
        <div class="mt-1 flex min-w-0 items-center gap-2">
          <h3
            class="group-hover:text-brand-700 dark:group-hover:text-brand-300 truncate text-sm font-black tracking-tight text-slate-900 transition dark:text-slate-100"
          >
            {{ article.title }}
          </h3>
          <span v-if="article.commentCount > 0" class="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
            [{{ article.commentCount }}]
          </span>
        </div>
        <p class="mt-1 line-clamp-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {{ previewText }}
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
      <div class="hidden text-center text-xs text-slate-500 md:block dark:text-slate-400">{{ article.likeCount }}</div>
    </div>
  </RouterLink>
</template>
