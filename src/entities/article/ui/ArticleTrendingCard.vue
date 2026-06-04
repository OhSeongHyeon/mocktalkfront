<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { formatKoreanDate } from '../../../shared/lib/date';
import { toIntlLocaleTag } from '../../../shared/i18n';
import type { ArticleTrendingItemResponse } from '../api/articleApi';

const props = defineProps<{
  article: ArticleTrendingItemResponse;
}>();

const { t, locale } = useI18n();

const articlePath = computed(() => `/b/${props.article.boardSlug}/articles/${props.article.articleId}`);

const trendScoreLabel = computed(() =>
  new Intl.NumberFormat(toIntlLocaleTag(locale.value), { maximumFractionDigits: 1 }).format(props.article.trendScore),
);
</script>

<template>
  <RouterLink :to="articlePath" class="bbs-row">
    <div class="bbs-cols-6 md:grid">
      <div class="min-w-0">
        <span class="bbs-tag bbs-tag-notice">{{ t('article.trendingCard.badge') }}</span>
        <span class="bbs-row-title">{{ article.title }}</span>
        <span v-if="article.commentCount > 0" class="bbs-cmt">[{{ article.commentCount }}]</span>
      </div>
      <span class="bbs-cell-center hidden md:block">{{ article.authorName }}</span>
      <span class="bbs-cell-center hidden md:block">{{ formatKoreanDate(article.createdAt) }}</span>
      <span class="bbs-cell-center hidden md:block">{{ article.commentCount }}</span>
      <span class="bbs-cell-center hidden md:block">{{ article.hit }}</span>
      <span class="bbs-cell-center hidden md:block">{{ trendScoreLabel }}</span>
    </div>
  </RouterLink>
</template>
