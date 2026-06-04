<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { resolveBoardVisibilityLabel } from '../entities/board';
import { search, type SearchResponse, type SearchType } from '../features/search';
import FileImage from '../entities/file/ui/FileImage.vue';
import PageContainer from '../shared/ui/PageContainer.vue';
import { formatKoreanDate } from '../shared/lib/date';
import { ApiError } from '../shared/lib/http/api';
import PageHeader from '../shared/ui/PageHeader.vue';
import SectionHeader from '../shared/ui/SectionHeader.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const route = useRoute();
const router = useRouter();

type AppShellExposed = {
  getMainElement: () => HTMLElement | null;
};

const appShellRef = ref<AppShellExposed | null>(null);
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
const selectedTypeLabel = computed(() => types.find((type) => type.value === selectedType.value)?.label ?? '검색');
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

const scrollToTop = () => {
  if (!scrollAreaRef.value) {
    scrollAreaRef.value = appShellRef.value?.getMainElement() ?? null;
  }
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
  <AppShell ref="appShellRef">
    <PageContainer width="auto">
      <div class="space-y-4">
        <PageHeader eyebrow="Search" title="통합검색" description="게시판, 게시글, 댓글, 사용자를 같은 밀도로 한 번에 찾을 수 있습니다.">
          <template #meta>
            <span class="ui-badge ui-badge-accent">{{ selectedTypeLabel }}</span>
            <span class="ui-badge ui-badge-muted">{{ selectedOrder === 'LATEST' ? '최신순' : '과거순' }}</span>
            <span class="ui-badge ui-badge-muted">표시 {{ size }}개</span>
          </template>

          <form class="space-y-3" @submit.prevent="handleSubmit">
            <div class="ui-toolbar">
              <label for="global-search-page" class="text-xs font-semibold text-muted">검색어</label>
              <input id="global-search-page" v-model="keyword" type="search" placeholder="게시판, 게시글, 댓글, 사용자" class="ui-input flex-1" />
              <button
                type="submit"
                class="ui-button-primary h-10 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!keyword.trim() || isLoading"
              >
                검색
              </button>
            </div>

            <div class="ui-toolbar">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-semibold text-muted">검색 범위</span>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="type in types"
                    :key="type.value"
                    type="button"
                    class="h-9 px-4 text-xs"
                    :class="selectedType === type.value ? 'ui-button-primary' : 'ui-button-ghost'"
                    @click="handleTypeChange(type.value)"
                  >
                    {{ type.label }}
                  </button>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-semibold text-muted">정렬</span>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="order in orders"
                    :key="order.value"
                    type="button"
                    class="h-9 px-4 text-xs"
                    :class="selectedOrder === order.value ? 'ui-button-primary' : 'ui-button-ghost'"
                    @click="handleOrderChange(order.value)"
                  >
                    {{ order.label }}
                  </button>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <label for="search-size" class="text-xs font-semibold text-muted">표시 개수</label>
                <select
                  id="search-size"
                  v-model.number="size"
                  class="ui-select text-xs font-semibold"
                  :disabled="isLoading"
                  @change="handleSizeChange(size)"
                >
                  <option v-for="option in sizeOptions" :key="option" :value="option">{{ option }}개</option>
                </select>
              </div>
            </div>
          </form>
        </PageHeader>

        <div v-if="errorMessage" class="ui-state ui-state-danger">
          {{ errorMessage }}
        </div>

        <div v-if="isLoading" class="text-sm text-muted">검색 결과를 불러오는 중입니다...</div>

        <div v-if="selectedType === 'ALL'" class="space-y-8">
          <section>
            <SectionHeader title="게시판">
              <template #actions>
                <button v-if="results?.boards.hasNext" type="button" class="ui-button-ghost h-9 px-4 text-xs" @click="openSection('BOARD')">
                  더보기
                </button>
              </template>
            </SectionHeader>
            <div v-if="boardResults.length === 0" class="mt-3 text-xs text-subtle">‘{{ keyword }}’ 검색 결과가 없습니다.</div>
            <div v-else class="mt-3 space-y-2">
              <RouterLink v-for="board in boardResults" :key="board.id" :to="`/b/${board.slug}`" class="ui-list-row group">
                <div class="grid gap-3 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:items-center">
                  <div class="h-[3.25rem] overflow-hidden rounded-[0.55rem] border border-line bg-surface-soft">
                    <FileImage
                      v-if="board.boardImage"
                      :file="board.boardImage"
                      variant="thumb"
                      :alt="board.boardName"
                      class="h-full w-full object-cover"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center text-xs text-subtle">없음</div>
                  </div>

                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="ui-badge ui-badge-success">{{ resolveBoardVisibilityLabel(board.visibility) }}</span>
                      <span class="text-xs text-subtle">/{{ board.slug }}</span>
                    </div>
                    <div class="bbs-row-title mt-1 text-sm">{{ board.boardName }}</div>
                    <p class="mt-1 line-clamp-1 text-xs leading-5 text-muted">
                      {{ board.description ?? '설명이 없습니다.' }}
                    </p>
                  </div>

                  <span class="ui-badge ui-badge-muted">이동</span>
                </div>
              </RouterLink>
            </div>
          </section>

          <section>
            <SectionHeader title="게시글">
              <template #actions>
                <button v-if="results?.articles.hasNext" type="button" class="ui-button-ghost h-9 px-4 text-xs" @click="openSection('ARTICLE')">
                  더보기
                </button>
              </template>
            </SectionHeader>
            <div v-if="articleResults.length === 0" class="mt-3 text-xs text-subtle">‘{{ keyword }}’ 검색 결과가 없습니다.</div>
            <div v-else class="mt-3 space-y-2">
              <RouterLink
                v-for="article in articleResults"
                :key="article.id"
                :to="`/b/${article.boardSlug}/articles/${article.id}`"
                class="ui-list-row"
              >
                <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span class="ui-badge ui-badge-accent">{{ article.boardName }}</span>
                      <span>{{ article.authorName }}</span>
                      <span>{{ formatKoreanDate(article.createdAt) }}</span>
                    </div>
                    <div class="bbs-row-title mt-1 truncate text-sm">{{ article.title }}</div>
                  </div>
                  <span class="ui-badge ui-badge-muted">게시글</span>
                </div>
              </RouterLink>
            </div>
          </section>

          <section>
            <SectionHeader title="댓글">
              <template #actions>
                <button v-if="results?.comments.hasNext" type="button" class="ui-button-ghost h-9 px-4 text-xs" @click="openSection('COMMENT')">
                  더보기
                </button>
              </template>
            </SectionHeader>
            <div v-if="commentResults.length === 0" class="mt-3 text-xs text-subtle">‘{{ keyword }}’ 검색 결과가 없습니다.</div>
            <div v-else class="mt-3 space-y-2">
              <RouterLink
                v-for="comment in commentResults"
                :key="comment.id"
                :to="`/b/${comment.boardSlug}/articles/${comment.articleId}`"
                class="ui-list-row"
              >
                <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span class="ui-badge ui-badge-muted">{{ comment.boardName }}</span>
                  <span>{{ comment.articleTitle }}</span>
                  <span>{{ comment.authorName }}</span>
                </div>
                <p class="line-clamp-2 text-sm leading-6 text-muted">{{ comment.content }}</p>
              </RouterLink>
            </div>
          </section>

          <section>
            <SectionHeader title="사용자">
              <template #actions>
                <button v-if="results?.users.hasNext" type="button" class="ui-button-ghost h-9 px-4 text-xs" @click="openSection('USER')">
                  더보기
                </button>
              </template>
            </SectionHeader>
            <div v-if="userResults.length === 0" class="mt-3 text-xs text-subtle">‘{{ keyword }}’ 검색 결과가 없습니다.</div>
            <div v-else class="mt-3 space-y-2">
              <div v-for="user in userResults" :key="user.id" class="ui-list-row text-sm text-ink">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="bbs-row-title">@{{ user.handle }}</div>
                    <div class="text-xs text-muted">{{ user.displayName }}</div>
                  </div>
                  <span class="ui-badge ui-badge-muted">사용자</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div v-else class="space-y-5">
          <SectionHeader :title="`${selectedTypeLabel} 검색 결과`" description="현재 선택한 범위의 검색 결과입니다." />

          <div v-if="currentPageInfo.items.length === 0" class="ui-state ui-state-empty px-4 py-6">‘{{ keyword }}’ 검색 결과가 없습니다.</div>
          <div v-else class="space-y-3">
            <div class="ui-toolbar justify-between text-xs text-muted">
              <span>{{ selectedTypeLabel }} {{ currentPageInfo.items.length }}건</span>
              <span>페이지 {{ currentPageInfo.page + 1 }}</span>
            </div>
            <div v-if="selectedType === 'BOARD'" class="space-y-2">
              <RouterLink v-for="board in boardResults" :key="board.id" :to="`/b/${board.slug}`" class="ui-list-row group">
                <div class="grid gap-3 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:items-center">
                  <div class="h-[3.25rem] overflow-hidden rounded-[0.55rem] border border-line bg-surface-soft">
                    <FileImage
                      v-if="board.boardImage"
                      :file="board.boardImage"
                      variant="thumb"
                      :alt="board.boardName"
                      class="h-full w-full object-cover"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center text-xs text-subtle">없음</div>
                  </div>

                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="ui-badge ui-badge-success">{{ resolveBoardVisibilityLabel(board.visibility) }}</span>
                      <span class="text-xs text-subtle">/{{ board.slug }}</span>
                    </div>
                    <div class="bbs-row-title mt-1 text-sm">{{ board.boardName }}</div>
                    <p class="mt-1 line-clamp-1 text-xs leading-5 text-muted">
                      {{ board.description ?? '설명이 없습니다.' }}
                    </p>
                  </div>

                  <span class="ui-badge ui-badge-muted">이동</span>
                </div>
              </RouterLink>
            </div>

            <div v-else-if="selectedType === 'ARTICLE'" class="space-y-2">
              <RouterLink
                v-for="article in articleResults"
                :key="article.id"
                :to="`/b/${article.boardSlug}/articles/${article.id}`"
                class="ui-list-row"
              >
                <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span class="ui-badge ui-badge-accent">{{ article.boardName }}</span>
                      <span>{{ article.authorName }}</span>
                      <span>{{ formatKoreanDate(article.createdAt) }}</span>
                    </div>
                    <div class="bbs-row-title mt-1 truncate text-sm">{{ article.title }}</div>
                  </div>
                  <span class="ui-badge ui-badge-muted">게시글</span>
                </div>
              </RouterLink>
            </div>

            <div v-else-if="selectedType === 'COMMENT'" class="space-y-2">
              <RouterLink
                v-for="comment in commentResults"
                :key="comment.id"
                :to="`/b/${comment.boardSlug}/articles/${comment.articleId}`"
                class="ui-list-row"
              >
                <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span class="ui-badge ui-badge-muted">{{ comment.boardName }}</span>
                  <span>{{ comment.articleTitle }}</span>
                  <span>{{ comment.authorName }}</span>
                </div>
                <p class="line-clamp-2 text-sm leading-6 text-muted">{{ comment.content }}</p>
              </RouterLink>
            </div>

            <div v-else-if="selectedType === 'USER'" class="space-y-2">
              <div v-for="user in userResults" :key="user.id" class="ui-list-row text-sm text-ink">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="bbs-row-title">@{{ user.handle }}</div>
                    <div class="text-xs text-muted">{{ user.displayName }}</div>
                  </div>
                  <span class="ui-badge ui-badge-muted">사용자</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="currentPageInfo.hasPrevious || currentPageInfo.hasNext" class="ui-toolbar mt-6 justify-between text-xs text-muted">
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!currentPageInfo.hasPrevious || isLoading"
                @click="handlePageChange(currentPageInfo.page - 1)"
              >
                이전
              </button>
              <button
                type="button"
                class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="currentPageInfo.page === 0 || isLoading"
                @click="handlePageChange(0)"
              >
                처음
              </button>
              <button
                type="button"
                class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
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
                  class="h-9 px-4 text-xs"
                  :class="pageNumber === currentPageInfo.page ? 'ui-button-primary' : 'ui-button-ghost'"
                  :aria-current="pageNumber === currentPageInfo.page ? 'page' : undefined"
                  :disabled="isLoading"
                  @click="handlePageChange(pageNumber)"
                >
                  {{ pageNumber + 1 }}
                </button>
                <span v-if="showTrailingEllipsis" class="px-1 text-xs text-subtle">…</span>
              </div>
              <button
                type="button"
                class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!canJumpForwardWindow || isLoading"
                @click="handlePageChange(currentPageInfo.page + paginationWindow)"
              >
                다음 10
              </button>
              <button
                type="button"
                class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
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
    </PageContainer>
  </AppShell>
</template>
