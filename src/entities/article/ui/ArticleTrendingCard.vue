<script setup lang="ts">
import { computed } from 'vue';

import type { ArticleTrendingItemResponse } from '../api/articleApi';

const props = defineProps<{
  article: ArticleTrendingItemResponse;
}>();

const articlePath = computed(() => `/b/${props.article.boardSlug}/articles/${props.article.articleId}`);

const trendScoreLabel = computed(() => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(props.article.trendScore));
</script>

<template>
  <RouterLink :to="articlePath" class="bbs-row">
    <div class="bbs-cols-5 md:grid">
      <div class="min-w-0">
        <span class="bbs-tag bbs-tag-notice">트렌딩</span>
        <span class="bbs-row-title">{{ article.title }}</span>
        <span v-if="article.commentCount > 0" class="bbs-cmt">[{{ article.commentCount }}]</span>
      </div>
      <span class="bbs-cell-center hidden md:block">{{ article.authorName }}</span>
      <span class="bbs-cell-center hidden md:block">{{ article.commentCount }}</span>
      <span class="bbs-cell-center hidden md:block">{{ article.hit }}</span>
      <span class="bbs-cell-center hidden md:block">{{ trendScoreLabel }}</span>
    </div>
  </RouterLink>
</template>
