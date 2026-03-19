<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

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

const resolveErrorMessage = (error: unknown) => (error instanceof ApiError ? error.message : '공개 최신글을 불러오지 못했습니다.');
const resolveTrendingErrorMessage = (error: unknown) => (error instanceof ApiError ? error.message : '트렌딩 글을 불러오지 못했습니다.');
const resolveRecommendedErrorMessage = (error: unknown) => (error instanceof ApiError ? error.message : '추천 글을 불러오지 못했습니다.');

const sectionTitle = computed(() => '공개 글 둘러보기');

const sectionDescription = computed(() => {
  if (activeTab.value === 'recent') {
    return '최근 올라온 공개 글만 빠르게 살펴볼 수 있습니다.';
  }
  if (activeTab.value === 'trending') {
    return '최근 반응이 집중된 공개 글을 모아 확인할 수 있습니다.';
  }
  return '북마크, 반응, 댓글 활동과 현재 인기 흐름을 함께 반영한 추천 글입니다.';
});

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
    recommendedError.value = resolveRecommendedErrorMessage(error);
    recommendedArticles.value = [];
  } finally {
    isRecommendedLoading.value = false;
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
  <section class="ui-panel overflow-hidden">
    <div class="px-4 py-4 sm:px-5">
      <SectionHeader :title="sectionTitle" :description="sectionDescription">
        <template #actions>
          <div class="ui-tab-list" role="tablist" aria-label="홈 게시글 목록 전환">
            <button
              type="button"
              role="tab"
              data-testid="home-article-tab-recent"
              class="ui-tab-button"
              :class="activeTab === 'recent' ? 'ui-tab-button-active' : ''"
              :aria-selected="activeTab === 'recent'"
              @click="changeTab('recent')"
            >
              최신글
            </button>
            <button
              type="button"
              role="tab"
              data-testid="home-article-tab-trending"
              class="ui-tab-button"
              :class="activeTab === 'trending' ? 'ui-tab-button-active' : ''"
              :aria-selected="activeTab === 'trending'"
              @click="changeTab('trending')"
            >
              트렌딩
            </button>
            <button
              type="button"
              role="tab"
              data-testid="home-article-tab-recommended"
              class="ui-tab-button"
              :class="activeTab === 'recommended' ? 'ui-tab-button-active' : ''"
              :aria-selected="activeTab === 'recommended'"
              @click="changeTab('recommended')"
            >
              추천
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

        <div v-else-if="articles.length > 0" class="mt-4 space-y-3">
          <div
            class="hidden grid-cols-[minmax(0,1fr)_7rem_4.5rem_4.5rem_4.5rem] gap-2 rounded-[0.55rem] border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 md:grid dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
          >
            <span>제목</span>
            <span class="text-center">작성자</span>
            <span class="text-center">댓글</span>
            <span class="text-center">조회</span>
            <span class="text-center">추천</span>
          </div>
          <div class="space-y-2">
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
                class="ui-button-primary h-9 min-w-28 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
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

      <div v-else-if="activeTab === 'trending'">
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

        <div v-else-if="trendingArticles.length > 0" class="mt-4 space-y-3">
          <div
            class="hidden grid-cols-[minmax(0,1fr)_7rem_4.5rem_4.5rem_5rem] gap-2 rounded-[0.55rem] border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 md:grid dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
          >
            <span>제목</span>
            <span class="text-center">작성자</span>
            <span class="text-center">댓글</span>
            <span class="text-center">조회</span>
            <span class="text-center">점수</span>
          </div>
          <div class="space-y-2">
            <ArticleTrendingCard v-for="article in trendingArticles" :key="article.articleId" :article="article" />
          </div>
        </div>

        <div v-else class="ui-state ui-state-empty mt-5 px-5 py-8">아직 집계된 트렌딩 글이 없습니다.</div>
      </div>

      <div v-else>
        <div v-if="recommendedError" class="ui-state ui-state-danger mt-5 space-y-3">
          <p>{{ recommendedError }}</p>
          <button
            type="button"
            class="ui-chip-button border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-300 hover:bg-cyan-100 dark:border-cyan-900/50 dark:bg-cyan-950/40 dark:text-cyan-200"
            @click="loadRecommendedArticles(true)"
          >
            다시 시도
          </button>
        </div>

        <div v-else-if="isRecommendedLoading" class="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span class="h-2 w-2 animate-pulse rounded-full bg-cyan-400 dark:bg-cyan-500"></span>
          관심사와 현재 인기 흐름을 반영한 글을 모으는 중입니다.
        </div>

        <div v-else-if="recommendedArticles.length > 0" class="mt-4 space-y-3">
          <div
            class="hidden grid-cols-[minmax(0,1fr)_7rem_4.5rem_4.5rem_4.5rem] gap-2 rounded-[0.55rem] border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 md:grid dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
          >
            <span>제목</span>
            <span class="text-center">작성자</span>
            <span class="text-center">댓글</span>
            <span class="text-center">조회</span>
            <span class="text-center">추천</span>
          </div>
          <div class="space-y-2">
            <ArticleRecommendedCard v-for="article in recommendedArticles" :key="article.articleId" :article="article" />
          </div>
        </div>

        <div v-else class="ui-state ui-state-empty mt-5 px-5 py-8">아직 보여드릴 추천 글이 없습니다.</div>
      </div>
    </div>
  </section>
</template>
