<script setup lang="ts">
import { onMounted, ref } from 'vue';

import ArticleFeedCard from '../../entities/article/ui/ArticleFeedCard.vue';
import { getRecentArticles, type ArticleRecentItemResponse } from '../../entities/article';
import { ApiError } from '../../shared/lib/http/api';

const RECENT_ARTICLE_BATCH_SIZE = 15;

const articles = ref<ArticleRecentItemResponse[]>([]);
const isInitialLoading = ref(false);
const isLoadingMore = ref(false);
const hasNextPage = ref(false);
const nextPage = ref(0);
const listError = ref('');
const loadMoreError = ref('');

const resolveErrorMessage = (error: unknown) => (error instanceof ApiError ? error.message : '공개 최신글을 불러오지 못했습니다.');

const loadRecentArticles = async (page: number, append: boolean) => {
  if (isInitialLoading.value || isLoadingMore.value) {
    return;
  }

  if (append) {
    isLoadingMore.value = true;
    loadMoreError.value = '';
  } else {
    isInitialLoading.value = true;
    listError.value = '';
  }

  try {
    const data = await getRecentArticles(page, RECENT_ARTICLE_BATCH_SIZE);
    articles.value = append ? [...articles.value, ...data.items] : data.items;
    nextPage.value = data.page + 1;
    hasNextPage.value = data.hasNext;
  } catch (error) {
    const errorMessage = resolveErrorMessage(error);
    if (append) {
      loadMoreError.value = errorMessage;
      return;
    }
    listError.value = errorMessage;
    articles.value = [];
    hasNextPage.value = false;
    nextPage.value = 0;
  } finally {
    if (append) {
      isLoadingMore.value = false;
    } else {
      isInitialLoading.value = false;
    }
  }
};

const loadMoreArticles = async () => {
  if (!hasNextPage.value) {
    return;
  }
  await loadRecentArticles(nextPage.value, true);
};

onMounted(() => {
  void loadRecentArticles(0, false);
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

    <div v-else-if="isInitialLoading" class="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
      공개 최신글을 불러오는 중입니다.
    </div>

    <div v-else-if="articles.length > 0" class="mt-5 space-y-5">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ArticleFeedCard v-for="article in articles" :key="article.id" :article="article" />
      </div>

      <div class="space-y-3">
        <div v-if="loadMoreError" class="ui-state ui-state-danger">
          {{ loadMoreError }}
        </div>

        <div v-if="hasNextPage" class="flex justify-center">
          <button
            type="button"
            class="ui-chip-button min-w-32 border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-900/50"
            :disabled="isLoadingMore"
            @click="loadMoreArticles"
          >
            {{ isLoadingMore ? '불러오는 중...' : '더보기' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="ui-state ui-state-empty mt-5 px-5 py-8">아직 작성된 공개 글이 없습니다.</div>
  </section>
</template>
