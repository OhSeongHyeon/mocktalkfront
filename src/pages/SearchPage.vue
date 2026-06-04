<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
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

const { t } = useI18n();
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

const types = computed<{ label: string; value: SearchType }[]>(() => [
  { label: t('search.types.ALL'), value: 'ALL' },
  { label: t('search.types.BOARD'), value: 'BOARD' },
  { label: t('search.types.ARTICLE'), value: 'ARTICLE' },
  { label: t('search.types.COMMENT'), value: 'COMMENT' },
  { label: t('search.types.USER'), value: 'USER' },
]);
const orders = computed<{ label: string; value: 'LATEST' | 'OLDEST' }[]>(() => [
  { label: t('search.order.LATEST'), value: 'LATEST' },
  { label: t('search.order.OLDEST'), value: 'OLDEST' },
]);
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
const selectedTypeLabel = computed(() => types.value.find((type) => type.value === selectedType.value)?.label ?? t('search.fallbackTypeLabel'));
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
  if (types.value.some((type) => type.value === candidate)) {
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
    errorMessage.value = error instanceof ApiError ? error.message : t('search.errors.failed');
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
        <PageHeader eyebrow="Search" :title="t('search.title')" :description="t('search.description')">
          <template #meta>
            <span class="ui-badge ui-badge-accent">{{ selectedTypeLabel }}</span>
            <span class="ui-badge ui-badge-muted">{{ selectedOrder === 'LATEST' ? t('search.badge.latest') : t('search.badge.oldest') }}</span>
            <span class="ui-badge ui-badge-muted">{{ t('search.badge.displayCount', { count: size }) }}</span>
          </template>

          <form class="space-y-3" @submit.prevent="handleSubmit">
            <div class="ui-toolbar">
              <label for="global-search-page" class="text-xs font-semibold text-muted">{{ t('search.keywordLabel') }}</label>
              <input id="global-search-page" v-model="keyword" type="search" :placeholder="t('search.keywordPlaceholder')" class="ui-input flex-1" />
              <button
                type="submit"
                class="ui-button-primary h-10 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!keyword.trim() || isLoading"
              >
                {{ t('search.searchButton') }}
              </button>
            </div>

            <div class="ui-toolbar">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-semibold text-muted">{{ t('search.scopeLabel') }}</span>
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
                <span class="text-xs font-semibold text-muted">{{ t('search.sortLabel') }}</span>
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
                <label for="search-size" class="text-xs font-semibold text-muted">{{ t('search.pageSizeLabel') }}</label>
                <select
                  id="search-size"
                  v-model.number="size"
                  class="ui-select text-xs font-semibold"
                  :disabled="isLoading"
                  @change="handleSizeChange(size)"
                >
                  <option v-for="option in sizeOptions" :key="option" :value="option">{{ t('search.pageSizeOption', { count: option }) }}</option>
                </select>
              </div>
            </div>
          </form>
        </PageHeader>

        <div v-if="errorMessage" class="ui-state ui-state-danger">
          {{ errorMessage }}
        </div>

        <div v-if="isLoading" class="text-sm text-muted">{{ t('search.loading') }}</div>

        <div v-if="selectedType === 'ALL'" class="space-y-8">
          <section>
            <SectionHeader :title="t('search.sections.board')">
              <template #actions>
                <button v-if="results?.boards.hasNext" type="button" class="ui-button-ghost h-9 px-4 text-xs" @click="openSection('BOARD')">
                  {{ t('search.loadMore') }}
                </button>
              </template>
            </SectionHeader>
            <div v-if="boardResults.length === 0" class="mt-3 text-xs text-subtle">{{ t('search.emptyResult', { keyword }) }}</div>
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
                    <div v-else class="flex h-full w-full items-center justify-center text-xs text-subtle">{{ t('common.none') }}</div>
                  </div>

                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="ui-badge ui-badge-success">{{ resolveBoardVisibilityLabel(board.visibility) }}</span>
                      <span class="text-xs text-subtle">/{{ board.slug }}</span>
                    </div>
                    <div class="bbs-row-title mt-1 text-sm">{{ board.boardName }}</div>
                    <p class="mt-1 line-clamp-1 text-xs leading-5 text-muted">
                      {{ board.description ?? t('board.defaults.noDescription') }}
                    </p>
                  </div>

                  <span class="ui-badge ui-badge-muted">{{ t('search.go') }}</span>
                </div>
              </RouterLink>
            </div>
          </section>

          <section>
            <SectionHeader :title="t('search.sections.article')">
              <template #actions>
                <button v-if="results?.articles.hasNext" type="button" class="ui-button-ghost h-9 px-4 text-xs" @click="openSection('ARTICLE')">
                  {{ t('search.loadMore') }}
                </button>
              </template>
            </SectionHeader>
            <div v-if="articleResults.length === 0" class="mt-3 text-xs text-subtle">{{ t('search.emptyResult', { keyword }) }}</div>
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
                  <span class="ui-badge ui-badge-muted">{{ t('search.badgeArticle') }}</span>
                </div>
              </RouterLink>
            </div>
          </section>

          <section>
            <SectionHeader :title="t('search.sections.comment')">
              <template #actions>
                <button v-if="results?.comments.hasNext" type="button" class="ui-button-ghost h-9 px-4 text-xs" @click="openSection('COMMENT')">
                  {{ t('search.loadMore') }}
                </button>
              </template>
            </SectionHeader>
            <div v-if="commentResults.length === 0" class="mt-3 text-xs text-subtle">{{ t('search.emptyResult', { keyword }) }}</div>
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
            <SectionHeader :title="t('search.sections.user')">
              <template #actions>
                <button v-if="results?.users.hasNext" type="button" class="ui-button-ghost h-9 px-4 text-xs" @click="openSection('USER')">
                  {{ t('search.loadMore') }}
                </button>
              </template>
            </SectionHeader>
            <div v-if="userResults.length === 0" class="mt-3 text-xs text-subtle">{{ t('search.emptyResult', { keyword }) }}</div>
            <div v-else class="mt-3 space-y-2">
              <div v-for="user in userResults" :key="user.id" class="ui-list-row text-sm text-ink">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="bbs-row-title">@{{ user.handle }}</div>
                    <div class="text-xs text-muted">{{ user.displayName }}</div>
                  </div>
                  <span class="ui-badge ui-badge-muted">{{ t('search.badgeUser') }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div v-else class="space-y-5">
          <SectionHeader :title="t('search.filteredTitle', { type: selectedTypeLabel })" :description="t('search.filteredDescription')" />

          <div v-if="currentPageInfo.items.length === 0" class="ui-state ui-state-empty px-4 py-6">{{ t('search.emptyResult', { keyword }) }}</div>
          <div v-else class="space-y-3">
            <div class="ui-toolbar justify-between text-xs text-muted">
              <span>{{ t('search.resultCount', { type: selectedTypeLabel, count: currentPageInfo.items.length }) }}</span>
              <span>{{ t('search.pageNumber', { page: currentPageInfo.page + 1 }) }}</span>
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
                    <div v-else class="flex h-full w-full items-center justify-center text-xs text-subtle">{{ t('common.none') }}</div>
                  </div>

                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="ui-badge ui-badge-success">{{ resolveBoardVisibilityLabel(board.visibility) }}</span>
                      <span class="text-xs text-subtle">/{{ board.slug }}</span>
                    </div>
                    <div class="bbs-row-title mt-1 text-sm">{{ board.boardName }}</div>
                    <p class="mt-1 line-clamp-1 text-xs leading-5 text-muted">
                      {{ board.description ?? t('board.defaults.noDescription') }}
                    </p>
                  </div>

                  <span class="ui-badge ui-badge-muted">{{ t('search.go') }}</span>
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
                  <span class="ui-badge ui-badge-muted">{{ t('search.badgeArticle') }}</span>
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
                  <span class="ui-badge ui-badge-muted">{{ t('search.badgeUser') }}</span>
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
                {{ t('common.previous') }}
              </button>
              <button
                type="button"
                class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="currentPageInfo.page === 0 || isLoading"
                @click="handlePageChange(0)"
              >
                {{ t('search.pagination.first') }}
              </button>
              <button
                type="button"
                class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!canJumpBackWindow || isLoading"
                @click="handlePageChange(Math.max(0, currentPageInfo.page - paginationWindow))"
              >
                {{ t('search.pagination.previousWindow') }}
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
                {{ t('search.pagination.nextWindow') }}
              </button>
              <button
                type="button"
                class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!currentPageInfo.hasNext || isLoading"
                @click="handlePageChange(currentPageInfo.page + 1)"
              >
                {{ t('common.next') }}
              </button>
            </div>
            <span>{{ t('search.pageNumber', { page: currentPageInfo.page + 1 }) }}</span>
          </div>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>
