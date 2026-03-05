<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ApiError } from '../lib/api';
import type { BoardCategoryResponse } from '../entities/board';
import { getBoardCategories } from '../entities/board';
import type { ArticleSummaryResponse } from '../services/boards';
import { getBoardArticles } from '../services/boards';
import { search } from '../services/search';
import {
  ARTICLE_LIST_ORDERS,
  ARTICLE_LIST_PAGE_SIZES,
  articleListOrder,
  articleListPageSize,
  setArticleListOrder,
  setArticleListPageSize,
} from '../stores/articleList';
import ArticleList from './ArticleList.vue';

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

const route = useRoute();
const router = useRouter();

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
    categoryErrorMessage.value = error instanceof ApiError ? error.message : '카테고리 목록을 불러오지 못했습니다.';
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
      listError.value = '게시판을 찾을 수 없습니다.';
      hasNext.value = false;
      hasPrevious.value = false;
      return;
    }
    if (error instanceof ApiError && error.status === 403) {
      listError.value = '게시글 접근 권한이 없습니다.';
      hasNext.value = false;
      hasPrevious.value = false;
      return;
    }
    listError.value = error instanceof ApiError ? error.message : '게시글을 불러오지 못했습니다.';
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
  <section class="ui-panel mt-6 px-4 py-3 sm:px-5">
    <div class="flex items-center justify-between gap-2">
      <label class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">카테고리</label>
      <span v-if="selectedCategoryId !== null || selectedUncategorized" class="text-xs text-slate-500 dark:text-slate-400"
        >카테고리 필터 적용 중</span
      >
    </div>

    <div v-if="isCategoryLoading" class="mt-3 text-sm text-slate-500 dark:text-slate-400">카테고리 목록을 불러오는 중입니다...</div>
    <div v-else-if="categoryErrorMessage" class="ui-state ui-state-danger mt-3">
      {{ categoryErrorMessage }}
    </div>
    <div v-else class="mt-3 flex gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        class="ui-chip-button shrink-0 px-4 py-2"
        :class="
          selectedCategoryId === null && !selectedUncategorized
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
        "
        @click="applyAllFilter"
      >
        전체
      </button>
      <button
        type="button"
        class="ui-chip-button shrink-0 px-4 py-2"
        :class="
          selectedUncategorized
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
        "
        @click="applyUncategorizedFilter"
      >
        미분류
      </button>
      <button
        v-for="category in categories"
        :key="category.id"
        type="button"
        class="ui-chip-button shrink-0 px-4 py-2"
        :class="
          selectedCategoryId === category.id
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
        "
        @click="applyCategoryFilter(category.id)"
      >
        {{ category.categoryName }}
      </button>
    </div>
  </section>

  <form class="ui-panel mt-4 flex flex-wrap items-center gap-2 px-4 py-3 text-sm sm:px-5" @submit.prevent="handleSearch">
    <label for="board-search" class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">게시글 검색</label>
    <input
      id="board-search"
      v-model="searchKeyword"
      type="search"
      placeholder="게시글 제목/본문/작성자 검색"
      class="ui-input h-10 min-w-[220px] flex-1 rounded-full"
    />
    <button
      type="submit"
      class="ui-chip-button h-10 border-emerald-200 bg-emerald-50 px-4 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      :disabled="!searchKeyword.trim() || isLoading"
    >
      검색
    </button>
    <button
      v-if="isSearching"
      type="button"
      class="ui-chip-button ui-chip-button-muted h-10 px-4 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="isLoading"
      @click="clearSearch"
    >
      초기화
    </button>
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
    @select="handleSelect"
    @update:order="handleOrderChange"
    @update:page-size="handlePageSizeChange"
    @update:page="handlePageChange"
  />

  <div v-if="isLoading && articles.length > 0" class="mt-6 text-sm text-slate-500 dark:text-slate-400">게시글을 불러오는 중...</div>
</template>
