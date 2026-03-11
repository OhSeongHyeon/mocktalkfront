<script setup lang="ts">
import { onMounted, ref } from 'vue';

import ArticleFeedCard from '../../entities/article/ui/ArticleFeedCard.vue';
import { getRecentArticles, type ArticleRecentItemResponse } from '../../entities/article';
import { ApiError } from '../../shared/lib/http/api';

const articles = ref<ArticleRecentItemResponse[]>([]);
const isLoading = ref(false);
const listError = ref('');
const pageSize = 6;

const loadRecentArticles = async () => {
  if (isLoading.value) {
    return;
  }
  isLoading.value = true;
  listError.value = '';
  try {
    const data = await getRecentArticles(0, pageSize);
    articles.value = data.items;
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '공개 최신글을 불러오지 못했습니다.';
    articles.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadRecentArticles();
});
</script>

<template>
  <section class="ui-panel px-5 py-5 sm:px-6">
    <div class="space-y-1">
      <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">공개 최신글</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400">최근 올라온 공개 글만 빠르게 살펴볼 수 있습니다.</p>
    </div>

    <div v-if="listError" class="ui-state ui-state-danger mt-5">
      {{ listError }}
    </div>

    <div v-else-if="isLoading" class="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
      공개 최신글을 불러오는 중입니다.
    </div>

    <div v-else-if="articles.length > 0" class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ArticleFeedCard v-for="article in articles" :key="article.id" :article="article" />
    </div>

    <div v-else class="ui-state ui-state-empty mt-5 px-5 py-8">아직 작성된 공개 글이 없습니다.</div>
  </section>
</template>
