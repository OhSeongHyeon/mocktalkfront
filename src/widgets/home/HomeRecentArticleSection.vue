<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import ArticleFeedCard from '../../entities/article/ui/ArticleFeedCard.vue';
import ArticleTrendingCard from '../../entities/article/ui/ArticleTrendingCard.vue';
import { getRecentArticles, getTrendingArticles, type ArticleRecentItemResponse, type ArticleTrendingItemResponse } from '../../entities/article';
import { ApiError } from '../../shared/lib/http/api';
import SectionHeader from '../../shared/ui/SectionHeader.vue';

const RECENT_ARTICLE_BATCH_SIZE = 15;
const TRENDING_ARTICLE_LIMIT = 9;

type HomeArticleTab = 'recent' | 'trending';

const articles = ref<ArticleRecentItemResponse[]>([]);
const trendingArticles = ref<ArticleTrendingItemResponse[]>([]);
const activeTab = ref<HomeArticleTab>('recent');
const isInitialLoading = ref(false);
const isLoadingMore = ref(false);
const isTrendingLoading = ref(false);
const hasNextPage = ref(false);
const nextPage = ref(0);
const hasLoadedTrending = ref(false);
const listError = ref('');
const loadMoreError = ref('');
const trendingError = ref('');

const resolveErrorMessage = (error: unknown) => (error instanceof ApiError ? error.message : '공개 최신글을 불러오지 못했습니다.');
const resolveTrendingErrorMessage = (error: unknown) => (error instanceof ApiError ? error.message : '트렌딩 글을 불러오지 못했습니다.');

const sectionTitle = computed(() => '공개 글 둘러보기');

const sectionDescription = computed(() =>
  activeTab.value === 'recent' ? '최근 올라온 공개 글만 빠르게 살펴볼 수 있습니다.' : '최근 반응이 집중된 공개 글을 모아 확인할 수 있습니다.',
);

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

const loadTrendingArticles = async (force = false) => {
  if (isTrendingLoading.value) {
    return;
  }
  if (hasLoadedTrending.value && !force) {
    return;
  }

  isTrendingLoading.value = true;
  trendingError.value = '';

  try {
    trendingArticles.value = await getTrendingArticles('DAY', TRENDING_ARTICLE_LIMIT);
    hasLoadedTrending.value = true;
  } catch (error) {
    trendingError.value = resolveTrendingErrorMessage(error);
    trendingArticles.value = [];
  } finally {
    isTrendingLoading.value = false;
  }
};

const loadMoreArticles = async () => {
  if (!hasNextPage.value) {
    return;
  }
  await loadRecentArticles(nextPage.value, true);
};

const changeTab = (tab: HomeArticleTab) => {
  activeTab.value = tab;

  if (tab === 'trending') {
    void loadTrendingArticles();
  }
};

onMounted(() => {
  void loadRecentArticles(0, false);
});
</script>

<template>
  <section class="ui-panel px-5 py-5 sm:px-6">
    <SectionHeader :title="sectionTitle" :description="sectionDescription">
      <template #actions>
        <div
          class="inline-flex rounded-full border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/80"
          role="tablist"
          aria-label="홈 게시글 목록 전환"
        >
          <button
            type="button"
            role="tab"
            data-testid="home-article-tab-recent"
            class="ui-chip-button px-4 py-2 text-sm"
            :class="
              activeTab === 'recent'
                ? 'border-emerald-200 bg-white text-emerald-700 shadow-sm dark:border-emerald-900/50 dark:bg-slate-950 dark:text-emerald-200'
                : 'ui-chip-button-muted border-transparent text-slate-600 dark:text-slate-300'
            "
            :aria-selected="activeTab === 'recent'"
            @click="changeTab('recent')"
          >
            최신글
          </button>
          <button
            type="button"
            role="tab"
            data-testid="home-article-tab-trending"
            class="ui-chip-button px-4 py-2 text-sm"
            :class="
              activeTab === 'trending'
                ? 'border-amber-200 bg-white text-amber-700 shadow-sm dark:border-amber-900/50 dark:bg-slate-950 dark:text-amber-200'
                : 'ui-chip-button-muted border-transparent text-slate-600 dark:text-slate-300'
            "
            :aria-selected="activeTab === 'trending'"
            @click="changeTab('trending')"
          >
            트렌딩
          </button>
        </div>
      </template>
    </SectionHeader>

    <div v-if="activeTab === 'recent'">
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
              data-testid="home-recent-load-more"
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
    </div>

    <div v-else>
      <div v-if="trendingError" class="ui-state ui-state-danger mt-5 space-y-3">
        <p>{{ trendingError }}</p>
        <button
          type="button"
          class="ui-chip-button border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
          @click="loadTrendingArticles(true)"
        >
          다시 시도
        </button>
      </div>

      <div v-else-if="isTrendingLoading" class="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span class="h-2 w-2 animate-pulse rounded-full bg-amber-400 dark:bg-amber-500"></span>
        최근 반응이 뜨거운 글을 모으는 중입니다.
      </div>

      <div v-else-if="trendingArticles.length > 0" class="mt-5 space-y-5">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ArticleTrendingCard v-for="article in trendingArticles" :key="article.articleId" :article="article" />
        </div>
      </div>

      <div v-else class="ui-state ui-state-empty mt-5 px-5 py-8">아직 집계된 트렌딩 글이 없습니다.</div>
    </div>
  </section>
</template>
