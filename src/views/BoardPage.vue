<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ArticleList from '../components/ArticleList.vue';
import BoardHeaderCard from '../components/BoardHeaderCard.vue';
import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { resolveFileUrl } from '../lib/files';
import type { ArticleSummaryResponse, BoardDetailResponse } from '../services/boards';
import { getBoardArticles, getBoardBySlug, requestBoardJoin, subscribeBoard, unsubscribeBoard } from '../services/boards';
import { ARTICLE_LIST_PAGE_SIZES, articleListPageSize, setArticleListPageSize } from '../stores/articleList';
import { isAuthenticated } from '../stores/auth';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

const route = useRoute();
const router = useRouter();
const slug = computed(() => String(route.params.slug ?? ''));

const isMobileMenuOpen = ref(false);

const board = ref<BoardDetailResponse | null>(null);
const pinned = ref<ArticleSummaryResponse[]>([]);
const articles = ref<ArticleSummaryResponse[]>([]);
const isLoading = ref(false);
const isBoardLoading = ref(false);
const listError = ref('');
const actionError = ref('');
const isSubscribing = ref(false);
const isJoining = ref(false);
const page = ref(0);
const totalPages = ref(0);
const hasNext = ref(false);
const hasPrevious = ref(false);
const pageSize = computed(() => articleListPageSize.value);
const pageSizeOptions = ARTICLE_LIST_PAGE_SIZES;

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

const boardImageUrl = computed(() => resolveFileUrl(board.value?.boardImage?.storageKey ?? null));
const ownerDisplayName = computed(() => board.value?.ownerDisplayName ?? '정보 없음');
const visibilityLabel = computed(() => {
  switch (board.value?.visibility) {
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
});
const canInteract = computed(() => Boolean(isAuthenticated.value && board.value));
const canWrite = computed(() => {
  if (!isAuthenticated.value || !board.value) {
    return false;
  }
  const role = board.value.memberStatus;
  if (role === 'BANNED' || role === 'PENDING') {
    return false;
  }
  if (board.value.visibility === 'PRIVATE' || board.value.visibility === 'UNLISTED') {
    return role === 'OWNER' || role === 'MODERATOR';
  }
  return true;
});
const joinButtonLabel = computed(() => {
  const status = board.value?.memberStatus;
  if (status === 'PENDING') {
    return '가입 요청 취소';
  }
  if (status === 'MEMBER') {
    return '가입 완료';
  }
  if (status === 'MODERATOR' || status === 'OWNER') {
    return '관리자';
  }
  if (status === 'BANNED') {
    return '가입 불가';
  }
  return '가입 신청';
});
const joinDisabled = computed(() => {
  const status = board.value?.memberStatus;
  return (
    !isAuthenticated.value ||
    status === 'MEMBER' ||
    status === 'MODERATOR' ||
    status === 'OWNER' ||
    status === 'BANNED' ||
    isJoining.value
  );
});
const subscribeLabel = computed(() => (board.value?.subscribed ? '구독중' : '구독'));
const subscribeDisabled = computed(() => !isAuthenticated.value || isSubscribing.value);

const handlePageSizeChange = (size: number) => {
  setArticleListPageSize(size);
};

const resetList = () => {
  pinned.value = [];
  articles.value = [];
  listError.value = '';
  page.value = 0;
  totalPages.value = 0;
  hasNext.value = false;
  hasPrevious.value = false;
};

const loadBoard = async () => {
  if (!slug.value) {
    return;
  }
  isBoardLoading.value = true;
  listError.value = '';
  actionError.value = '';
  try {
    board.value = await getBoardBySlug(slug.value);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      listError.value = '게시판을 찾을 수 없습니다.';
      return;
    }
    if (error instanceof ApiError && error.status === 403) {
      listError.value = '게시판 접근 권한이 없습니다.';
      return;
    }
    listError.value = error instanceof ApiError ? error.message : '게시판을 불러오지 못했습니다.';
  } finally {
    isBoardLoading.value = false;
  }
};

const handleSubscribe = async () => {
  if (!board.value || !isAuthenticated.value || isSubscribing.value) {
    return;
  }
  actionError.value = '';
  isSubscribing.value = true;
  try {
    if (board.value.subscribed) {
      const response = await unsubscribeBoard(board.value.id);
      board.value.subscribed = response.subscribed;
    } else {
      const response = await subscribeBoard(board.value.id);
      board.value.subscribed = response.subscribed;
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      actionError.value = '이미 처리된 요청입니다.';
      return;
    }
    actionError.value = error instanceof ApiError ? error.message : '구독 처리에 실패했습니다.';
  } finally {
    isSubscribing.value = false;
  }
};

const handleJoin = async () => {
  if (!board.value || joinDisabled.value) {
    return;
  }
  actionError.value = '';
  isJoining.value = true;
  try {
    const response = await requestBoardJoin(board.value.id);
    board.value.memberStatus = response.memberStatus;
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      actionError.value = '이미 가입 상태입니다.';
      return;
    }
    actionError.value = error instanceof ApiError ? error.message : '가입 요청에 실패했습니다.';
  } finally {
    isJoining.value = false;
  }
};

const loadPage = async (pageIndex: number) => {
  if (!board.value || isLoading.value) {
    return;
  }
  isLoading.value = true;
  listError.value = '';
  try {
    const response = await getBoardArticles(board.value.id, pageIndex, pageSize.value);
    pinned.value = pageIndex === 0 ? response.pinned ?? [] : [];
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

const goArticle = (articleId: number) => {
  router.push(`/b/${slug.value}/articles/${articleId}`);
};

const goWrite = () => {
  if (!slug.value) {
    return;
  }
  router.push(`/b/${slug.value}/articles/new`);
};

const handlePageChange = async (nextPage: number) => {
  await loadPage(nextPage);
};

onMounted(async () => {
  resetList();
  await loadBoard();
  await loadPage(0);
});

watch(
  () => slug.value,
  async () => {
    resetList();
    await loadBoard();
    await loadPage(0);
  },
);

watch(
  () => articleListPageSize.value,
  async () => {
    resetList();
    if (!board.value && slug.value) {
      await loadBoard();
    }
    await loadPage(0);
  },
);
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-6xl">
          <BoardHeaderCard :title="board?.boardName ?? '커뮤니티'" :description="board?.description ?? '설명이 없습니다.'" :image-url="boardImageUrl">
            <template #meta>
              <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>운영자 {{ ownerDisplayName }}</span>
                <span>가시성 {{ visibilityLabel }}</span>
              </div>
            </template>
            <template #actions>
              <div v-if="canInteract" class="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                  :disabled="subscribeDisabled"
                  @click="handleSubscribe"
                >
                  {{ subscribeLabel }}
                </button>
                <button
                  type="button"
                  class="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200"
                  :disabled="joinDisabled"
                  @click="handleJoin"
                >
                  {{ joinButtonLabel }}
                </button>
                <button
                  type="button"
                  class="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                  :disabled="!canWrite"
                  @click="goWrite"
                >
                  글쓰기
                </button>
                <span v-if="actionError" class="text-xs text-rose-500">
                  {{ actionError }}
                </span>
              </div>
            </template>
          </BoardHeaderCard>

          <div
            v-if="listError"
            class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ listError }}
          </div>

          <div v-if="isBoardLoading" class="mt-6 text-sm text-slate-500">게시판 정보를 불러오는 중입니다...</div>

          <ArticleList
            :pinned="pinned"
            :articles="articles"
            :is-loading="isLoading"
            :page-size="pageSize"
            :page-size-options="pageSizeOptions"
            :page="page"
            :total-pages="totalPages"
            :has-next="hasNext"
            :has-previous="hasPrevious"
            @select="goArticle"
            @update:page-size="handlePageSizeChange"
            @update:page="handlePageChange"
          />

          <div v-if="isLoading && articles.length > 0" class="mt-6 text-sm text-slate-500">게시글을 불러오는 중...</div>
        </div>
      </main>
    </div>
  </div>
</template>
