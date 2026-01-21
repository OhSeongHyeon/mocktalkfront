<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { resolveFileUrl } from '../lib/files';
import { search, type SearchResponse, type SearchType } from '../services/search';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

const route = useRoute();
const router = useRouter();

const isMobileMenuOpen = ref(false);
const scrollAreaRef = ref<HTMLElement | null>(null);
const keyword = ref('');
const selectedType = ref<SearchType>('ALL');
const selectedOrder = ref<'LATEST' | 'OLDEST'>('LATEST');
const page = ref(0);
const size = ref(10);
const results = ref<SearchResponse | null>(null);
const isLoading = ref(false);
const errorMessage = ref('');

const types: { label: string; value: SearchType }[] = [
  { label: '전체', value: 'ALL' },
  { label: '게시판', value: 'BOARD' },
  { label: '게시글', value: 'ARTICLE' },
  { label: '댓글', value: 'COMMENT' },
  { label: '사용자', value: 'USER' },
];
const orders: { label: string; value: 'LATEST' | 'OLDEST' }[] = [
  { label: '최신순', value: 'LATEST' },
  { label: '과거순', value: 'OLDEST' },
];
const sizeOptions = [10, 20, 30, 40, 50];
const paginationWindow = 10;

const isMobileView = () => (typeof window !== 'undefined' ? window.innerWidth < 768 : false);

const toggleMenu = () => {
  if (isMobileView()) {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
    return;
  }
  setMenuCollapsed(!menuCollapsed.value);
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

const emptyPage = (pageValue: number, sizeValue: number) => ({
  items: [],
  page: pageValue,
  size: sizeValue,
  hasNext: false,
  hasPrevious: pageValue > 0,
});

const ensureResults = (pageValue: number, sizeValue: number) => ({
  boards: emptyPage(pageValue, sizeValue),
  articles: emptyPage(pageValue, sizeValue),
  comments: emptyPage(pageValue, sizeValue),
  users: emptyPage(pageValue, sizeValue),
});

const boardResults = computed(() => results.value?.boards.items ?? []);
const articleResults = computed(() => results.value?.articles.items ?? []);
const commentResults = computed(() => results.value?.comments.items ?? []);
const userResults = computed(() => results.value?.users.items ?? []);
const currentPageInfo = computed(() => {
  if (!results.value) {
    return emptyPage(page.value, size.value);
  }
  switch (selectedType.value) {
    case 'BOARD':
      return results.value.boards;
    case 'ARTICLE':
      return results.value.articles;
    case 'COMMENT':
      return results.value.comments;
    case 'USER':
      return results.value.users;
    default:
      return emptyPage(page.value, size.value);
  }
});
const paginationPages = computed(() => {
  const info = currentPageInfo.value;
  if (!info) {
    return [];
  }
  const current = info.page;
  let start = Math.max(0, current - Math.floor(paginationWindow / 2));
  if (!info.hasPrevious) {
    start = 0;
  }
  let end = start + paginationWindow - 1;
  if (!info.hasNext) {
    end = current;
    start = Math.max(0, end - (paginationWindow - 1));
  }
  const pages: number[] = [];
  for (let index = start; index <= end; index += 1) {
    pages.push(index);
  }
  return pages;
});
const showTrailingEllipsis = computed(() => currentPageInfo.value.hasNext && paginationPages.value.length > 0);
const canJumpBackWindow = computed(() => currentPageInfo.value.hasPrevious && currentPageInfo.value.page - paginationWindow >= 0);
const canJumpForwardWindow = computed(() => currentPageInfo.value.hasNext);

const resolveVisibilityLabel = (visibility: string) => {
  switch (visibility) {
    case 'PUBLIC':
      return '공개';
    case 'GROUP':
      return '구독형';
    case 'PRIVATE':
      return '비공개';
    case 'UNLISTED':
      return '운영자 전용';
    default:
      return '알 수 없음';
  }
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const scrollToTop = () => {
  scrollAreaRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
};

const resolveType = (value: unknown): SearchType => {
  const candidate = typeof value === 'string' ? value.toUpperCase() : 'ALL';
  if (types.some((type) => type.value === candidate)) {
    return candidate as SearchType;
  }
  return 'ALL';
};

const resolveOrder = (value: unknown): 'LATEST' | 'OLDEST' => {
  const candidate = typeof value === 'string' ? value.toUpperCase() : 'LATEST';
  return candidate === 'OLDEST' ? 'OLDEST' : 'LATEST';
};

const syncFromRoute = () => {
  keyword.value = typeof route.query.q === 'string' ? route.query.q : '';
  selectedType.value = resolveType(route.query.type);
  selectedOrder.value = resolveOrder(route.query.order);
  const nextPage = Number(route.query.page ?? 0);
  const nextSize = Number(route.query.size ?? 10);
  page.value = Number.isFinite(nextPage) && nextPage >= 0 ? nextPage : 0;
  size.value = Number.isFinite(nextSize) && nextSize > 0 ? nextSize : 10;
};

const loadSearch = async () => {
  const trimmed = keyword.value.trim();
  if (!trimmed) {
    results.value = ensureResults(page.value, size.value);
    return;
  }
  isLoading.value = true;
  errorMessage.value = '';
  try {
    results.value = await search({
      q: trimmed,
      type: selectedType.value,
      order: selectedOrder.value,
      page: page.value,
      size: size.value,
    });
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : '검색에 실패했습니다.';
    results.value = ensureResults(page.value, size.value);
  } finally {
    isLoading.value = false;
  }
};

const updateRoute = async (next: { type?: SearchType; order?: 'LATEST' | 'OLDEST'; page?: number; size?: number }) => {
  const trimmed = keyword.value.trim();
  if (!trimmed) {
    return;
  }
  await router.push({
    path: '/search',
    query: {
      q: trimmed,
      type: next.type ?? selectedType.value,
      order: next.order ?? selectedOrder.value,
      page: String(next.page ?? page.value),
      size: String(next.size ?? size.value),
    },
  });
};

const handleSubmit = async () => {
  const trimmed = keyword.value.trim();
  if (!trimmed) {
    return;
  }
  await updateRoute({ page: 0 });
};

const handleTypeChange = async (type: SearchType) => {
  selectedType.value = type;
  await updateRoute({ type, page: 0 });
  scrollToTop();
};

const handleOrderChange = async (order: 'LATEST' | 'OLDEST') => {
  selectedOrder.value = order;
  await updateRoute({ order, page: 0 });
  scrollToTop();
};

const handleSizeChange = async (nextSize: number) => {
  size.value = nextSize;
  await updateRoute({ size: nextSize, page: 0 });
  scrollToTop();
};

const handlePageChange = async (nextPage: number) => {
  if (nextPage < 0) {
    return;
  }
  if (nextPage > currentPageInfo.value.page && !currentPageInfo.value.hasNext) {
    return;
  }
  if (nextPage < currentPageInfo.value.page && !currentPageInfo.value.hasPrevious) {
    return;
  }
  await updateRoute({ page: nextPage });
  scrollToTop();
};

const openSection = async (type: SearchType) => {
  await handleTypeChange(type);
};

watch(
  () => route.query,
  async () => {
    syncFromRoute();
    await loadSearch();
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main ref="scrollAreaRef" class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-6xl">
          <div class="flex flex-col gap-3">
            <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">검색</h1>
            <form
              class="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              @submit.prevent="handleSubmit"
            >
              <div class="flex flex-wrap items-center gap-2">
                <label for="global-search-page" class="text-xs font-semibold text-slate-500 dark:text-slate-400">검색어</label>
                <input
                  id="global-search-page"
                  v-model="keyword"
                  type="search"
                  placeholder="게시판, 게시글, 댓글, 사용자"
                  class="h-10 flex-1 rounded-full border border-slate-200 px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
                />
                <button
                  type="submit"
                  class="inline-flex h-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                  :disabled="!keyword.trim() || isLoading"
                >
                  검색
                </button>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">검색 범위</span>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="type in types"
                    :key="type.value"
                    type="button"
                    class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                    :class="
                      selectedType === type.value
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                    "
                    @click="handleTypeChange(type.value)"
                  >
                    {{ type.label }}
                  </button>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">정렬</span>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="order in orders"
                    :key="order.value"
                    type="button"
                    class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                    :class="
                      selectedOrder === order.value
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                    "
                    @click="handleOrderChange(order.value)"
                  >
                    {{ order.label }}
                  </button>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <label for="search-size" class="text-xs font-semibold text-slate-500 dark:text-slate-400">표시 개수</label>
                <select
                  id="search-size"
                  v-model.number="size"
                  class="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
                  :disabled="isLoading"
                  @change="handleSizeChange(size)"
                >
                  <option v-for="option in sizeOptions" :key="option" :value="option">{{ option }}개</option>
                </select>
              </div>
            </form>
          </div>

          <div
            v-if="errorMessage"
            class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ errorMessage }}
          </div>

          <div v-if="isLoading" class="mt-6 text-sm text-slate-500">검색 결과를 불러오는 중입니다...</div>

          <div v-if="selectedType === 'ALL'" class="mt-6 space-y-8">
            <section>
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">게시판</h2>
                <button
                  v-if="results?.boards.hasNext"
                  type="button"
                  class="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  @click="openSection('BOARD')"
                >
                  더보기
                </button>
              </div>
              <div v-if="boardResults.length === 0" class="mt-3 text-xs text-slate-400">‘{{ keyword }}’ 검색 결과가 없습니다.</div>
              <div v-else class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <RouterLink
                  v-for="board in boardResults"
                  :key="board.id"
                  :to="`/b/${board.slug}`"
                  class="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300/80 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div class="flex items-center gap-3">
                    <div class="h-12 w-12 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                      <img
                        v-if="resolveFileUrl(board.boardImage?.storageKey ?? null)"
                        :src="resolveFileUrl(board.boardImage?.storageKey ?? null) ?? undefined"
                        :alt="board.boardName"
                        class="h-full w-full object-cover"
                      />
                      <div v-else class="flex h-full w-full items-center justify-center text-xs text-slate-400">없음</div>
                    </div>
                    <div class="flex-1">
                      <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ board.boardName }}</div>
                      <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ resolveVisibilityLabel(board.visibility) }}</div>
                    </div>
                  </div>
                  <p class="mt-3 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{{ board.description ?? '설명이 없습니다.' }}</p>
                </RouterLink>
              </div>
            </section>

            <section>
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">게시글</h2>
                <button
                  v-if="results?.articles.hasNext"
                  type="button"
                  class="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  @click="openSection('ARTICLE')"
                >
                  더보기
                </button>
              </div>
              <div v-if="articleResults.length === 0" class="mt-3 text-xs text-slate-400">‘{{ keyword }}’ 검색 결과가 없습니다.</div>
              <div v-else class="mt-3 space-y-3">
                <RouterLink
                  v-for="article in articleResults"
                  :key="article.id"
                  :to="`/b/${article.boardSlug}/articles/${article.id}`"
                  class="block rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300/80 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{{ article.boardName }}</span>
                    <span>{{ article.authorName }}</span>
                    <span>{{ formatDate(article.createdAt) }}</span>
                  </div>
                  <div class="mt-1 font-semibold text-slate-900 dark:text-slate-100">{{ article.title }}</div>
                </RouterLink>
              </div>
            </section>

            <section>
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">댓글</h2>
                <button
                  v-if="results?.comments.hasNext"
                  type="button"
                  class="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  @click="openSection('COMMENT')"
                >
                  더보기
                </button>
              </div>
              <div v-if="commentResults.length === 0" class="mt-3 text-xs text-slate-400">‘{{ keyword }}’ 검색 결과가 없습니다.</div>
              <div v-else class="mt-3 space-y-3">
                <RouterLink
                  v-for="comment in commentResults"
                  :key="comment.id"
                  :to="`/b/${comment.boardSlug}/articles/${comment.articleId}`"
                  class="block rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300/80 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{{ comment.boardName }}</span>
                    <span>{{ comment.articleTitle }}</span>
                    <span>{{ comment.authorName }}</span>
                  </div>
                  <p class="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{{ comment.content }}</p>
                </RouterLink>
              </div>
            </section>

            <section>
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">사용자</h2>
                <button
                  v-if="results?.users.hasNext"
                  type="button"
                  class="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  @click="openSection('USER')"
                >
                  더보기
                </button>
              </div>
              <div v-if="userResults.length === 0" class="mt-3 text-xs text-slate-400">‘{{ keyword }}’ 검색 결과가 없습니다.</div>
              <div v-else class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  v-for="user in userResults"
                  :key="user.id"
                  class="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <div class="font-semibold text-slate-900 dark:text-slate-100">@{{ user.handle }}</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400">{{ user.displayName }}</div>
                </div>
              </div>
            </section>
          </div>

          <div v-else class="mt-6">
            <div
              v-if="currentPageInfo.items.length === 0"
              class="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
            >
              ‘{{ keyword }}’ 검색 결과가 없습니다.
            </div>
            <div v-else class="space-y-3">
              <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>페이지 {{ currentPageInfo.page + 1 }}</span>
                <span v-if="currentPageInfo.hasNext">다음 페이지 있음</span>
              </div>
              <div v-if="selectedType === 'BOARD'" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <RouterLink
                  v-for="board in boardResults"
                  :key="board.id"
                  :to="`/b/${board.slug}`"
                  class="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300/80 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div class="flex items-center gap-3">
                    <div class="h-12 w-12 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                      <img
                        v-if="resolveFileUrl(board.boardImage?.storageKey ?? null)"
                        :src="resolveFileUrl(board.boardImage?.storageKey ?? null) ?? undefined"
                        :alt="board.boardName"
                        class="h-full w-full object-cover"
                      />
                      <div v-else class="flex h-full w-full items-center justify-center text-xs text-slate-400">없음</div>
                    </div>
                    <div class="flex-1">
                      <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ board.boardName }}</div>
                      <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ resolveVisibilityLabel(board.visibility) }}</div>
                    </div>
                  </div>
                  <p class="mt-3 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{{ board.description ?? '설명이 없습니다.' }}</p>
                </RouterLink>
              </div>

              <div v-else-if="selectedType === 'ARTICLE'" class="space-y-3">
                <RouterLink
                  v-for="article in articleResults"
                  :key="article.id"
                  :to="`/b/${article.boardSlug}/articles/${article.id}`"
                  class="block rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300/80 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{{ article.boardName }}</span>
                    <span>{{ article.authorName }}</span>
                    <span>{{ formatDate(article.createdAt) }}</span>
                  </div>
                  <div class="mt-1 font-semibold text-slate-900 dark:text-slate-100">{{ article.title }}</div>
                </RouterLink>
              </div>

              <div v-else-if="selectedType === 'COMMENT'" class="space-y-3">
                <RouterLink
                  v-for="comment in commentResults"
                  :key="comment.id"
                  :to="`/b/${comment.boardSlug}/articles/${comment.articleId}`"
                  class="block rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300/80 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{{ comment.boardName }}</span>
                    <span>{{ comment.articleTitle }}</span>
                    <span>{{ comment.authorName }}</span>
                  </div>
                  <p class="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{{ comment.content }}</p>
                </RouterLink>
              </div>

              <div v-else-if="selectedType === 'USER'" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  v-for="user in userResults"
                  :key="user.id"
                  class="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <div class="font-semibold text-slate-900 dark:text-slate-100">@{{ user.handle }}</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400">{{ user.displayName }}</div>
                </div>
              </div>
            </div>

            <div
              v-if="currentPageInfo.hasPrevious || currentPageInfo.hasNext"
              class="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400"
            >
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  :disabled="!currentPageInfo.hasPrevious || isLoading"
                  @click="handlePageChange(currentPageInfo.page - 1)"
                >
                  이전
                </button>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  :disabled="currentPageInfo.page === 0 || isLoading"
                  @click="handlePageChange(0)"
                >
                  처음
                </button>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  :disabled="!canJumpBackWindow || isLoading"
                  @click="handlePageChange(Math.max(0, currentPageInfo.page - paginationWindow))"
                >
                  이전 10
                </button>
                <div class="flex flex-wrap items-center gap-1">
                  <button
                    v-for="pageNumber in paginationPages"
                    :key="pageNumber"
                    type="button"
                    class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                    :class="
                      pageNumber === currentPageInfo.page
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                    "
                    :aria-current="pageNumber === currentPageInfo.page ? 'page' : undefined"
                    :disabled="isLoading"
                    @click="handlePageChange(pageNumber)"
                  >
                    {{ pageNumber + 1 }}
                  </button>
                  <span v-if="showTrailingEllipsis" class="px-1 text-xs text-slate-400">…</span>
                </div>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  :disabled="!canJumpForwardWindow || isLoading"
                  @click="handlePageChange(currentPageInfo.page + paginationWindow)"
                >
                  다음 10
                </button>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  :disabled="!currentPageInfo.hasNext || isLoading"
                  @click="handlePageChange(currentPageInfo.page + 1)"
                >
                  다음
                </button>
              </div>
              <span>페이지 {{ currentPageInfo.page + 1 }}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
