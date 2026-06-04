<script setup lang="ts">
import { computed } from 'vue';

import type { ArticleRecommendedItemResponse } from '../api/articleApi';

const props = defineProps<{
  article: ArticleRecommendedItemResponse;
}>();

const articlePath = computed(() => `/b/${props.article.boardSlug}/articles/${props.article.articleId}`);

const boardLabel = computed(() => {
  const trimmed = props.article.boardName.trim();
  return trimmed.length > 0 ? trimmed : props.article.boardSlug;
});
</script>

<template>
  <RouterLink :to="articlePath" class="bbs-row">
    <div class="bbs-cols-5 md:grid">
      <div class="min-w-0">
        <span class="bbs-tag">{{ boardLabel }}</span>
        <span v-if="article.personalized" class="bbs-tag bbs-tag-cat">맞춤</span>
        <span class="bbs-row-title">{{ article.title }}</span>
        <span v-if="article.commentCount > 0" class="bbs-cmt">[{{ article.commentCount }}]</span>
      </div>
      <span class="bbs-cell-center hidden md:block">{{ article.authorName }}</span>
      <span class="bbs-cell-center hidden md:block">{{ article.commentCount }}</span>
      <span class="bbs-cell-center hidden md:block">{{ article.hit }}</span>
      <span class="bbs-cell-center hidden md:block">{{ article.likeCount }}</span>
    </div>
  </RouterLink>
</template>
