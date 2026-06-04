<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ArticleFeedCard from '../../entities/article/ui/ArticleFeedCard.vue';
import ArticleRecommendedCard from '../../entities/article/ui/ArticleRecommendedCard.vue';
import ArticleTrendingCard from '../../entities/article/ui/ArticleTrendingCard.vue';
import {
  getRecentArticles,
  getRecommendedArticles,
  getTrendingArticles,
  type ArticleRecentItemResponse,
  type ArticleRecommendedItemResponse,
  type ArticleTrendingItemResponse,
} from '../../entities/article';
import { ApiError } from '../../shared/lib/http/api';
import SectionHeader from '../../shared/ui/SectionHeader.vue';

const { t } = useI18n();

const RECENT_ARTICLE_BATCH_SIZE = 15;
const TRENDING_ARTICLE_LIMIT = 9;
const RECOMMENDED_ARTICLE_LIMIT = 9;

type HomeArticleTab = 'recent' | 'trending' | 'recommended';

const articles = ref<ArticleRecentItemResponse[]>([]);
const trendingArticles = ref<ArticleTrendingItemResponse[]>([]);
const recommendedArticles = ref<ArticleRecommendedItemResponse[]>([]);
const activeTab = ref<HomeArticleTab>('recent');
const isInitialLoading = ref(false);
const isLoadingMore = ref(false);
const isTrendingLoading = ref(false);
const isRecommendedLoading = ref(false);
const hasNextPage = ref(false);
const nextPage = ref(0);
const hasLoadedTrending = ref(false);
const hasLoadedRecommended = ref(false);
const listError = ref('');
const loadMoreError = ref('');
const trendingError = ref('');
const recommendedError = ref('');

const loadMoreLabel = computed(() => (isLoadingMore.value ? t('common.loading') : t('home.articles.loadMore')));

const resolveErrorMessage = (error: unknown, fallbackKey: 'recent' | 'trending' | 'recommended') =>
  error instanceof ApiError ? error.message : t(`home.articles.errors.${fallbackKey}`);

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
    const errorMessage = resolveErrorMessage(error, 'recent');
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
    trendingError.value = resolveErrorMessage(error, 'trending');
    trendingArticles.value = [];
  } finally {
    isTrendingLoading.value = false;
  }
};

const loadRecommendedArticles = async (force = false) => {
  if (isRecommendedLoading.value) {
    return;
  }
  if (hasLoadedRecommended.value && !force) {
    return;
  }

  isRecommendedLoading.value = true;
  recommendedError.value = '';

  try {
    recommendedArticles.value = await getRecommendedArticles(RECOMMENDED_ARTICLE_LIMIT);
    hasLoadedRecommended.value = true;
  } catch (error) {
    recommendedError.value = resolveErrorMessage(error, 'recommended');
    recommendedArticles.value = [];
  } finally {
    isRecommendedLoading.value = false;
  }
};

const loadMoreArticles = async () => {
  if (!hasNextPage.value || isLoadingMore.value) {
    return;
  }
  await loadRecentArticles(nextPage.value, true);
};

const changeTab = (tab: HomeArticleTab) => {
  if (activeTab.value === tab) {
    return;
  }
  activeTab.value = tab;
  if (tab === 'trending') {
    void loadTrendingArticles();
    return;
  }
  if (tab === 'recommended') {
    void loadRecommendedArticles();
  }
};

onMounted(() => {
  void loadRecentArticles(0, false);
});
</script>

<template>
  <section class="bbs-box">
    <SectionHeader :title="t('home.articles.title')">
      <template #tabs>
        <div role="tablist" class="flex flex-wrap">
          <button
            type="button"
            role="tab"
            data-testid="home-article-tab-recent"
            class="bbs-tab"
            :class="activeTab === 'recent' ? 'bbs-tab-active' : ''"
            @click="changeTab('recent')"
          >
            {{ t('home.articles.tabs.recent') }}
          </button>
          <button
            type="button"
            role="tab"
            data-testid="home-article-tab-trending"
            class="bbs-tab"
            :class="activeTab === 'trending' ? 'bbs-tab-active' : ''"
            @click="changeTab('trending')"
          >
            {{ t('home.articles.tabs.trending') }}
          </button>
          <button
            type="button"
            role="tab"
            data-testid="home-article-tab-recommended"
            class="bbs-tab"
            :class="activeTab === 'recommended' ? 'bbs-tab-active' : ''"
            @click="changeTab('recommended')"
          >
            {{ t('home.articles.tabs.recommended') }}
          </button>
        </div>
      </template>
    </SectionHeader>

    <template v-if="activeTab === 'recent'">
      <div v-if="listError" class="ui-state ui-state-danger ui-section-message">{{ listError }}</div>
      <div v-else-if="isInitialLoading" class="ui-section-loading">{{ t('common.loading') }}</div>
      <template v-else-if="articles.length > 0">
        <div class="bbs-table-head bbs-cols-6">
          <span>{{ t('home.articles.columns.title') }}</span>
          <span class="text-center">{{ t('home.articles.columns.author') }}</span>
          <span class="text-center">{{ t('home.articles.columns.date') }}</span>
          <span class="text-center">{{ t('home.articles.columns.comments') }}</span>
          <span class="text-center">{{ t('home.articles.columns.views') }}</span>
          <span class="text-center">{{ t('home.articles.columns.likes') }}</span>
        </div>
        <ArticleFeedCard v-for="article in articles" :key="article.id" :article="article" />
        <div v-if="loadMoreError" class="ui-state ui-state-danger ui-section-message">{{ loadMoreError }}</div>
        <div v-if="hasNextPage" class="border-t border-line px-3 py-2 text-center">
          <button
            type="button"
            data-testid="home-recent-load-more"
            class="ui-button-ghost h-8 px-4 text-xs"
            :disabled="isLoadingMore"
            @click="loadMoreArticles"
          >
            {{ loadMoreLabel }}
          </button>
        </div>
      </template>
      <div v-else class="ui-state ui-state-empty ui-section-message">{{ t('home.articles.empty') }}</div>
    </template>

    <template v-else-if="activeTab === 'trending'">
      <div v-if="trendingError" class="ui-state ui-state-danger ui-section-message">{{ trendingError }}</div>
      <div v-else-if="isTrendingLoading" class="ui-section-loading">{{ t('common.loading') }}</div>
      <template v-else-if="trendingArticles.length > 0">
        <div class="bbs-table-head bbs-cols-6">
          <span>{{ t('home.articles.columns.title') }}</span>
          <span class="text-center">{{ t('home.articles.columns.author') }}</span>
          <span class="text-center">{{ t('home.articles.columns.date') }}</span>
          <span class="text-center">{{ t('home.articles.columns.comments') }}</span>
          <span class="text-center">{{ t('home.articles.columns.views') }}</span>
          <span class="text-center">{{ t('home.articles.columns.trend') }}</span>
        </div>
        <ArticleTrendingCard v-for="article in trendingArticles" :key="article.articleId" :article="article" />
      </template>
      <div v-else class="ui-state ui-state-empty ui-section-message">{{ t('home.articles.emptyTrending') }}</div>
    </template>

    <template v-else>
      <div v-if="recommendedError" class="ui-state ui-state-danger ui-section-message">{{ recommendedError }}</div>
      <div v-else-if="isRecommendedLoading" class="ui-section-loading">{{ t('common.loading') }}</div>
      <template v-else-if="recommendedArticles.length > 0">
        <div class="bbs-table-head bbs-cols-6">
          <span>{{ t('home.articles.columns.title') }}</span>
          <span class="text-center">{{ t('home.articles.columns.author') }}</span>
          <span class="text-center">{{ t('home.articles.columns.date') }}</span>
          <span class="text-center">{{ t('home.articles.columns.comments') }}</span>
          <span class="text-center">{{ t('home.articles.columns.views') }}</span>
          <span class="text-center">{{ t('home.articles.columns.likes') }}</span>
        </div>
        <ArticleRecommendedCard v-for="article in recommendedArticles" :key="article.articleId" :article="article" />
      </template>
      <div v-else class="ui-state ui-state-empty ui-section-message">{{ t('home.articles.emptyRecommended') }}</div>
    </template>
  </section>
</template>
