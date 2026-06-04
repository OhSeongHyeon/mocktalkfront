<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import BoardArticlePanel from '../widgets/board/BoardArticlePanel.vue';
import BoardHeaderCard from '../widgets/board/BoardHeaderCard.vue';
import { ApiError } from '../shared/lib/http/api';
import { canWriteArticle, resolveWriteUnavailableReason } from '../entities/board/lib/boardWritePolicy';
import type { BoardDetailResponse } from '../entities/board';
import { cancelBoardJoin, getBoardBySlug, requestBoardJoin, subscribeBoard, unsubscribeBoard } from '../entities/board';
import { useAuthStore } from '../stores/auth';
import PageContainer from '../shared/ui/PageContainer.vue';
import AppShell from '../widgets/layout/AppShell.vue';

interface ArticleSelectPayload {
  articleId: number;
  query: Record<string, string>;
}

const route = useRoute();
const router = useRouter();
const slug = computed(() => String(route.params.slug ?? ''));
const authStore = useAuthStore();
const { isAdmin, isAuthenticated } = storeToRefs(authStore);

const board = ref<BoardDetailResponse | null>(null);
const isBoardLoading = ref(false);
const boardError = ref('');
const actionError = ref('');
const isSubscribing = ref(false);
const isJoining = ref(false);

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
const memberStatusLabel = computed(() => {
  switch (board.value?.memberStatus) {
    case 'OWNER':
      return '개설자';
    case 'MODERATOR':
      return '운영진';
    case 'MEMBER':
      return '멤버';
    case 'PENDING':
      return '가입 대기';
    case 'BANNED':
      return '제한됨';
    default:
      return '방문자';
  }
});
const subscribeStatusLabel = computed(() => (board.value?.subscribed ? '구독 중' : '미구독'));

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
  <AppShell>
    <PageContainer width="auto">
      <div class="space-y-6">
        <BoardHeaderCard
          :title="board?.boardName ?? '커뮤니티'"
          :description="board?.description ?? '설명이 없습니다.'"
          :image-file="board?.boardImage ?? null"
          :link-to="board ? `/b/${board.slug}` : undefined"
        >
          <template #meta>
            <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span class="ui-badge ui-badge-accent">{{ visibilityLabel }} 커뮤니티</span>
              <span class="ui-badge ui-badge-muted">운영자 {{ ownerDisplayName }}</span>
              <span class="ui-badge" :class="board?.memberStatus === 'BANNED' ? 'ui-badge-danger' : 'ui-badge-warning'">{{ memberStatusLabel }}</span>
              <span class="ui-badge" :class="board?.subscribed ? 'ui-badge-success' : 'ui-badge-muted'">{{ subscribeStatusLabel }}</span>
            </div>
          </template>
          <template #actions>
            <div class="flex flex-col gap-3">
              <div v-if="canInteract" class="flex flex-wrap items-center gap-2">
                <button v-if="canBoardAdmin" type="button" class="ui-button-primary h-10 px-4 text-xs" @click="goBoardAdmin">관리</button>
                <button
                  type="button"
                  class="h-10 px-4 text-xs"
                  :class="board?.subscribed ? 'ui-button-primary' : 'ui-button-ghost'"
                  :disabled="subscribeDisabled"
                  @click="handleSubscribe"
                >
                  {{ subscribeLabel }}
                </button>
                <button
                  v-if="showJoinButton"
                  type="button"
                  class="h-10 px-4 text-xs"
                  :class="board?.memberStatus === 'PENDING' ? 'ui-button-ghost' : 'ui-button-primary'"
                  :disabled="joinDisabled"
                  @click="handleJoin"
                >
                  {{ joinButtonLabel }}
                </button>
                <button
                  type="button"
                  class="ui-button-accent h-10 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="!canWrite"
                  :title="!canWrite ? writeUnavailableReason : undefined"
                  @click="goWrite"
                >
                  글쓰기
                </button>
              </div>

              <div v-else class="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span class="ui-badge ui-badge-muted">로그인 후 구독과 글쓰기를 사용할 수 있습니다.</span>
              </div>

              <div v-if="actionError" class="ui-state ui-state-danger text-xs font-semibold">
                {{ actionError }}
              </div>
            </div>
          </template>
        </BoardHeaderCard>

        <div v-if="boardError" class="ui-state ui-state-danger mt-6">
          {{ boardError }}
        </div>

        <div v-if="isBoardLoading" class="mt-6 text-sm text-muted">게시판 정보를 불러오는 중입니다...</div>

        <BoardArticlePanel v-if="board" :board-id="board.id" :board-slug="board.slug" @select="goArticle" />
      </div>
    </PageContainer>
  </AppShell>
</template>
