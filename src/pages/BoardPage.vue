<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import BoardArticlePanel from '../components/BoardArticlePanel.vue';
import BoardHeaderCard from '../components/BoardHeaderCard.vue';
import SideMenuBar from '../widgets/layout/SideMenuBar.vue';
import TopMenuBar from '../widgets/layout/TopMenuBar.vue';
import { ApiError } from '../shared/lib/http/api';
import { canWriteArticle, resolveWriteUnavailableReason } from '../lib/boardWritePolicy';
import { resolveImageUrl } from '../shared/lib/files';
import type { BoardDetailResponse } from '../entities/board';
import { cancelBoardJoin, getBoardBySlug, requestBoardJoin, subscribeBoard, unsubscribeBoard } from '../entities/board';
import { isAdmin, isAuthenticated } from '../stores/auth';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

interface ArticleSelectPayload {
  articleId: number;
  query: Record<string, string>;
}

const route = useRoute();
const router = useRouter();
const slug = computed(() => String(route.params.slug ?? ''));

const isMobileMenuOpen = ref(false);
const board = ref<BoardDetailResponse | null>(null);
const isBoardLoading = ref(false);
const boardError = ref('');
const actionError = ref('');
const isSubscribing = ref(false);
const isJoining = ref(false);

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

const boardImageUrl = computed(() => resolveImageUrl(board.value?.boardImage ?? null, 'medium'));
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
const canBoardAdmin = computed(() => {
  if (!board.value) {
    return false;
  }
  return isAdmin.value || board.value.memberStatus === 'OWNER' || board.value.memberStatus === 'MODERATOR';
});
const canWrite = computed(() => {
  return canWriteArticle(board.value, isAuthenticated.value, isAdmin.value);
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
  return !isAuthenticated.value || status === 'MEMBER' || status === 'MODERATOR' || status === 'OWNER' || status === 'BANNED' || isJoining.value;
});
const showJoinButton = computed(() => {
  if (!board.value) {
    return false;
  }
  return board.value.visibility === 'PUBLIC' || board.value.visibility === 'GROUP';
});
const subscribeLabel = computed(() => (board.value?.subscribed ? '구독중' : '구독'));
const subscribeDisabled = computed(() => !isAuthenticated.value || isSubscribing.value);
const writeUnavailableReason = computed(() => {
  return resolveWriteUnavailableReason(board.value, isAuthenticated.value, isAdmin.value);
});

const loadBoard = async () => {
  if (!slug.value) {
    board.value = null;
    return;
  }
  isBoardLoading.value = true;
  boardError.value = '';
  actionError.value = '';
  board.value = null;
  try {
    board.value = await getBoardBySlug(slug.value);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      boardError.value = '게시판을 찾을 수 없습니다.';
      return;
    }
    if (error instanceof ApiError && error.status === 403) {
      boardError.value = '게시판 접근 권한이 없습니다.';
      return;
    }
    boardError.value = error instanceof ApiError ? error.message : '게시판을 불러오지 못했습니다.';
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
  const shouldCancel = board.value.memberStatus === 'PENDING';
  actionError.value = '';
  isJoining.value = true;
  try {
    if (shouldCancel) {
      await cancelBoardJoin(board.value.id);
      board.value.memberStatus = null;
      return;
    }
    const response = await requestBoardJoin(board.value.id);
    board.value.memberStatus = response.memberStatus;
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      actionError.value = '이미 가입 상태입니다.';
      return;
    }
    actionError.value = error instanceof ApiError ? error.message : shouldCancel ? '가입 요청 취소에 실패했습니다.' : '가입 요청에 실패했습니다.';
  } finally {
    isJoining.value = false;
  }
};

const goArticle = ({ articleId, query }: ArticleSelectPayload) => {
  router.push({
    path: `/b/${slug.value}/articles/${articleId}`,
    query,
  });
};

const goWrite = () => {
  if (!slug.value) {
    return;
  }
  router.push(`/b/${slug.value}/articles/new`);
};

const goBoardAdmin = () => {
  if (!slug.value) {
    return;
  }
  router.push(`/b/${slug.value}/admin/settings`);
};

onMounted(async () => {
  await loadBoard();
});

watch(
  () => slug.value,
  async () => {
    await loadBoard();
  },
);
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900 dark:text-slate-100">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-7xl">
          <BoardHeaderCard
            :title="board?.boardName ?? '커뮤니티'"
            :description="board?.description ?? '설명이 없습니다.'"
            :image-url="boardImageUrl"
            :link-to="board ? `/b/${board.slug}` : undefined"
          >
            <template #meta>
              <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>운영자 {{ ownerDisplayName }}</span>
                <span>{{ visibilityLabel }} 커뮤니티</span>
              </div>
            </template>
            <template #actions>
              <div v-if="canInteract" class="flex flex-wrap items-center gap-3">
                <button
                  v-if="canBoardAdmin"
                  type="button"
                  class="ui-chip-button border-slate-900 bg-slate-900 text-white hover:bg-slate-800 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  @click="goBoardAdmin"
                >
                  관리
                </button>
                <button
                  type="button"
                  class="ui-chip-button ui-chip-button-muted disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="subscribeDisabled"
                  @click="handleSubscribe"
                >
                  {{ subscribeLabel }}
                </button>
                <button
                  v-if="showJoinButton"
                  type="button"
                  class="ui-chip-button border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200"
                  :disabled="joinDisabled"
                  @click="handleJoin"
                >
                  {{ joinButtonLabel }}
                </button>
                <button
                  type="button"
                  class="ui-chip-button border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                  :disabled="!canWrite"
                  :title="!canWrite ? writeUnavailableReason : undefined"
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

          <div v-if="boardError" class="ui-state ui-state-danger mt-6">
            {{ boardError }}
          </div>

          <div v-if="isBoardLoading" class="mt-6 text-sm text-slate-500 dark:text-slate-400">게시판 정보를 불러오는 중입니다...</div>

          <BoardArticlePanel v-if="board" :board-id="board.id" :board-slug="board.slug" @select="goArticle" />
        </div>
      </main>
    </div>
  </div>
</template>
