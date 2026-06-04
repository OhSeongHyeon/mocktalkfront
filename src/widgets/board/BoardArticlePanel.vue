<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { ApiError } from '../../shared/lib/http/api';
import type { BoardCategoryResponse } from '../../entities/board';
import { getBoardCategories } from '../../entities/board';
import type { ArticleSummaryResponse } from '../../entities/board';
import { getBoardArticles } from '../../entities/board';
import { search } from '../../features/search';
import { ARTICLE_LIST_ORDERS, ARTICLE_LIST_PAGE_SIZES, useArticleListStore } from '../../stores/articleList';
import ArticleList from '../article/ArticleList.vue';

interface BoardArticlePanelProps {
  boardId: number | null;
  boardSlug: string;
}

interface ArticleSelectPayload {
  articleId: number;
  query: Record<string, string>;
}

const props = defineProps<BoardArticlePanelProps>();
const emit = defineEmits<{
  (event: 'select', payload: ArticleSelectPayload): void;
}>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const articleListStore = useArticleListStore();
const { articleListOrder, articleListPageSize } = storeToRefs(articleListStore);
const { setArticleListOrder, setArticleListPageSize } = articleListStore;

const pinned = ref<ArticleSummaryResponse[]>([]);
const articles = ref<ArticleSummaryResponse[]>([]);
const isLoading = ref(false);
const listError = ref('');
const page = ref(0);
const totalPages = ref(0);
const hasNext = ref(false);
const hasPrevious = ref(false);

const searchKeyword = ref('');
const isSearching = computed(() => searchKeyword.value.trim().length > 0);
const orderOptions = ARTICLE_LIST_ORDERS;
const selectedOrder = computed(() => articleListOrder.value);
const pageSize = computed(() => articleListPageSize.value);
const pageSizeOptions = ARTICLE_LIST_PAGE_SIZES;

const categories = ref<BoardCategoryResponse[]>([]);
const isCategoryLoading = ref(false);
const categoryErrorMessage = ref('');
const selectedCategoryId = ref<number | null>(null);
const selectedUncategorized = ref(false);
const hasCategoryFilter = computed(() => selectedCategoryId.value !== null || selectedUncategorized.value);
const selectedCategoryLabel = computed(() => {
  if (selectedUncategorized.value) {
    return t('board.panel.categoryUncategorized');
  }
  if (selectedCategoryId.value === null) {
    return t('board.panel.categoryAll');
  }
  return categories.value.find((category) => category.id === selectedCategoryId.value)?.categoryName ?? t('board.defaults.categoryFallback');
});

const resolveCategoryFromRoute = () => {
  const raw = route.query.categoryId;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const categoryId = Number(value);
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return null;
  }
  return categoryId;
};

const resolveUncategorizedFromRoute = () => {
  const raw = route.query.uncategorized;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === 'true';
};

const hasCategory = (categoryId: number) => categories.value.some((category) => category.id === categoryId);

const resetList = () => {
  pinned.value = [];
  articles.value = [];
  listError.value = '';
  page.value = 0;
  totalPages.value = 0;
  hasNext.value = false;
  hasPrevious.value = false;
};

const syncCategoryQuery = async () => {
  const nextQuery: Record<string, string> = {};
  for (const [key, value] of Object.entries(route.query)) {
    if (key === 'categoryId' || key === 'uncategorized') {
      continue;
    }
    const firstValue = Array.isArray(value) ? value[0] : value;
    if (typeof firstValue === 'string') {
      nextQuery[key] = firstValue;
    }
  }
  if (selectedUncategorized.value) {
    nextQuery.uncategorized = 'true';
  } else if (selectedCategoryId.value !== null) {
    nextQuery.categoryId = String(selectedCategoryId.value);
  }
  await router.replace({ path: route.path, query: nextQuery });
};

const loadCategories = async () => {
  if (!props.boardId) {
    categories.value = [];
    categoryErrorMessage.value = '';
    return;
  }
  isCategoryLoading.value = true;
  categoryErrorMessage.value = '';
  try {
    categories.value = await getBoardCategories(props.boardId);
  } catch (error) {
    categories.value = [];
    categoryErrorMessage.value = error instanceof ApiError ? error.message : t('board.errors.loadCategoriesFailed');
  } finally {
    isCategoryLoading.value = false;
  }
};

const loadPage = async (pageIndex: number) => {
  if (!props.boardId || isLoading.value) {
    return;
  }
  isLoading.value = true;
  listError.value = '';
  try {
    if (isSearching.value) {
      const response = await search({
        q: searchKeyword.value.trim(),
        type: 'ARTICLE',
        order: selectedOrder.value,
        page: pageIndex,
        size: pageSize.value,
        boardSlug: props.boardSlug,
      });
      pinned.value = [];
      articles.value = response.articles.items.map((item) => ({
        id: item.id,
        boardId: item.boardId,
        userId: item.userId,
        authorName: item.authorName,
        title: item.title,
        categoryId: item.categoryId ?? null,
        categoryName: item.categoryName ?? null,
        hit: item.hit,
        commentCount: item.commentCount,
        likeCount: item.likeCount,
        dislikeCount: item.dislikeCount,
        notice: item.notice,
        createdAt: item.createdAt,
      }));
      page.value = response.articles.page;
      totalPages.value = 0;
      hasNext.value = response.articles.hasNext;
      hasPrevious.value = response.articles.hasPrevious;
      return;
    }

    const response = await getBoardArticles(
      props.boardId,
      pageIndex,
      pageSize.value,
      selectedOrder.value,
      selectedCategoryId.value ?? undefined,
      selectedUncategorized.value || undefined,
    );
    pinned.value = pageIndex === 0 && selectedCategoryId.value === null && !selectedUncategorized.value ? (response.pinned ?? []) : [];
    articles.value = response.page.items;
    page.value = response.page.page;
    totalPages.value = response.page.totalPages;
    hasNext.value = response.page.hasNext;
    hasPrevious.value = response.page.hasPrevious;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      listError.value = t('board.errors.notFound');
      hasNext.value = false;
      hasPrevious.value = false;
      return;
    }
    if (error instanceof ApiError && error.status === 403) {
      listError.value = t('board.errors.articlesForbidden');
      hasNext.value = false;
      hasPrevious.value = false;
      return;
    }
    listError.value = error instanceof ApiError ? error.message : t('board.errors.loadArticlesFailed');
    hasNext.value = false;
    hasPrevious.value = false;
  } finally {
    isLoading.value = false;
  }
};

const applyAllFilter = async () => {
  if (selectedCategoryId.value === null && !selectedUncategorized.value) {
    return;
  }
  selectedCategoryId.value = null;
  selectedUncategorized.value = false;
  await syncCategoryQuery();
  resetList();
  await loadPage(0);
};

const applyCategoryFilter = async (categoryId: number | null) => {
  if (selectedCategoryId.value === categoryId && !selectedUncategorized.value) {
    return;
  }
  selectedCategoryId.value = categoryId;
  selectedUncategorized.value = false;
  await syncCategoryQuery();
  resetList();
  await loadPage(0);
};

const applyUncategorizedFilter = async () => {
  if (selectedUncategorized.value && selectedCategoryId.value === null) {
    return;
  }
  selectedCategoryId.value = null;
  selectedUncategorized.value = true;
  await syncCategoryQuery();
  resetList();
  await loadPage(0);
};

const handleOrderChange = (value: string) => {
  if (value !== 'LATEST' && value !== 'OLDEST') {
    return;
  }
  setArticleListOrder(value);
};

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    return;
  }
  await loadPage(0);
};

const clearSearch = async () => {
  searchKeyword.value = '';
  await loadPage(0);
};

const handlePageSizeChange = (size: number) => {
  setArticleListPageSize(size);
};

const handlePageChange = async (nextPage: number) => {
  await loadPage(nextPage);
};

const resolveArticleFilterQuery = () => {
  const query: Record<string, string> = {};
  if (selectedUncategorized.value) {
    query.uncategorized = 'true';
    return query;
  }
  if (selectedCategoryId.value !== null) {
    query.categoryId = String(selectedCategoryId.value);
  }
  return query;
};

const handleSelect = (articleId: number) => {
  emit('select', {
    articleId,
    query: resolveArticleFilterQuery(),
  });
};

const resolveArticleHref = (article: ArticleSummaryResponse) => {
  if (!props.boardSlug) {
    return '#';
  }
  const params = new URLSearchParams(resolveArticleFilterQuery());
  const queryString = params.toString();
  const path = `/b/${props.boardSlug}/articles/${article.id}`;
  return queryString ? `${path}?${queryString}` : path;
};

watch(
  () => [props.boardId, props.boardSlug],
  async () => {
    searchKeyword.value = '';
    selectedUncategorized.value = resolveUncategorizedFromRoute();
    selectedCategoryId.value = selectedUncategorized.value ? null : resolveCategoryFromRoute();
    resetList();
    if (!props.boardId) {
      categories.value = [];
      categoryErrorMessage.value = '';
      return;
    }
    if (selectedUncategorized.value && route.query.categoryId !== undefined) {
      await syncCategoryQuery();
    }
    await loadCategories();
    if (!selectedUncategorized.value && selectedCategoryId.value !== null && !hasCategory(selectedCategoryId.value)) {
      selectedCategoryId.value = null;
      await syncCategoryQuery();
    }
    await loadPage(0);
  },
  { immediate: true },
);

watch(
  () => [route.query.categoryId, route.query.uncategorized],
  async () => {
    if (!props.boardId) {
      return;
    }
    const nextUncategorized = resolveUncategorizedFromRoute();
    if (nextUncategorized) {
      if (selectedUncategorized.value && selectedCategoryId.value === null) {
        return;
      }
      selectedCategoryId.value = null;
      selectedUncategorized.value = true;
      if (route.query.categoryId !== undefined) {
        await syncCategoryQuery();
      }
      resetList();
      await loadPage(0);
      return;
    }

    const nextCategoryId = resolveCategoryFromRoute();
    if (nextCategoryId === selectedCategoryId.value && !selectedUncategorized.value) {
      return;
    }
    if (nextCategoryId !== null && !hasCategory(nextCategoryId)) {
      selectedCategoryId.value = null;
      selectedUncategorized.value = false;
      await syncCategoryQuery();
      resetList();
      await loadPage(0);
      return;
    }
    selectedCategoryId.value = nextCategoryId;
    selectedUncategorized.value = false;
    resetList();
    await loadPage(0);
  },
);

watch(
  () => articleListPageSize.value,
  async () => {
    resetList();
    await loadPage(0);
  },
);

watch(
  () => articleListOrder.value,
  async () => {
    resetList();
    await loadPage(0);
  },
);
</script>

<template>
  <section class="ui-panel mt-6 overflow-hidden">
    <div class="px-4 py-4 sm:px-5">
      <div class="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div class="min-w-0">
          <p class="ui-eyebrow">{{ t('board.panel.eyebrow') }}</p>
          <h2 class="ui-heading-section mt-1">{{ t('board.panel.title') }}</h2>
        </div>

        <div class="flex flex-wrap gap-2">
          <span class="ui-badge ui-badge-muted">{{ t('board.panel.categoryCount', { count: categories.length }) }}</span>
          <span class="ui-badge" :class="hasCategoryFilter ? 'ui-badge-accent' : 'ui-badge-muted'">{{ selectedCategoryLabel }}</span>
          <span v-if="isSearching" class="ui-badge ui-badge-success">{{ t('board.panel.searchResults') }}</span>
        </div>
      </div>

      <div v-if="isCategoryLoading" class="mt-3 text-sm text-muted">{{ t('board.panel.loadingCategories') }}</div>
      <div v-else-if="categoryErrorMessage" class="ui-state ui-state-danger mt-4">
        {{ categoryErrorMessage }}
      </div>
      <div v-else class="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          class="shrink-0"
          :class="selectedCategoryId === null && !selectedUncategorized ? 'ui-button-primary h-9 px-4 text-xs' : 'ui-button-ghost h-9 px-4 text-xs'"
          @click="applyAllFilter"
        >
          {{ t('board.panel.categoryAll') }}
        </button>
        <button
          type="button"
          class="shrink-0"
          :class="selectedUncategorized ? 'ui-button-primary h-9 px-4 text-xs' : 'ui-button-ghost h-9 px-4 text-xs'"
          @click="applyUncategorizedFilter"
        >
          {{ t('board.panel.categoryUncategorized') }}
        </button>
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="shrink-0"
          :class="selectedCategoryId === category.id ? 'ui-button-primary h-9 px-4 text-xs' : 'ui-button-ghost h-9 px-4 text-xs'"
          @click="applyCategoryFilter(category.id)"
        >
          {{ category.categoryName }}
        </button>
      </div>
    </div>
  </section>

  <form class="ui-toolbar mt-4 text-sm" @submit.prevent="handleSearch">
    <label for="board-search" class="ui-field-label">{{ t('board.panel.searchLabel') }}</label>
    <input
      id="board-search"
      v-model="searchKeyword"
      type="search"
      :placeholder="t('board.panel.searchPlaceholder')"
      class="ui-input min-w-[220px] flex-1"
    />
    <button
      type="submit"
      class="ui-button-primary h-9 px-3.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="!searchKeyword.trim() || isLoading"
    >
      {{ t('board.panel.search') }}
    </button>
    <button
      v-if="isSearching"
      type="button"
      class="ui-button-ghost h-9 px-3.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="isLoading"
      @click="clearSearch"
    >
      {{ t('board.panel.reset') }}
    </button>
    <span v-if="hasCategoryFilter" class="ui-badge ui-badge-accent">{{ t('board.panel.filterSuffix', { label: selectedCategoryLabel }) }}</span>
  </form>

  <div v-if="listError" class="ui-state ui-state-danger mt-4">
    {{ listError }}
  </div>

  <ArticleList
    :pinned="pinned"
    :articles="articles"
    :is-loading="isLoading"
    :order="selectedOrder"
    :order-options="orderOptions"
    :page-size="pageSize"
    :page-size-options="pageSizeOptions"
    :page="page"
    :total-pages="totalPages"
    :has-next="hasNext"
    :has-previous="hasPrevious"
    :resolve-href="resolveArticleHref"
    @select="handleSelect"
    @update:order="handleOrderChange"
    @update:page-size="handlePageSizeChange"
    @update:page="handlePageChange"
  />

  <div v-if="isLoading && articles.length > 0" class="mt-6 text-sm text-muted">{{ t('board.panel.loadingArticles') }}</div>
</template>
