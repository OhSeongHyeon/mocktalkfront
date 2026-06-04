<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
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

const { t } = useI18n();
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

const ownerDisplayName = computed(() => board.value?.ownerDisplayName ?? t('board.defaults.unknownInfo'));
const visibilityLabel = computed(() => {
  const visibility = board.value?.visibility;
  if (!visibility) {
    return t('board.defaults.unknownInfo');
  }
  const key = `board.visibility.${visibility}`;
  const translated = t(key);
  return translated !== key ? translated : t('board.defaults.unknownInfo');
});
const memberStatusLabel = computed(() => {
  switch (board.value?.memberStatus) {
    case 'OWNER':
      return t('board.memberStatus.OWNER');
    case 'MODERATOR':
      return t('board.memberStatus.MODERATOR');
    case 'MEMBER':
      return t('board.memberStatus.MEMBER');
    case 'PENDING':
      return t('board.memberStatus.PENDING');
    case 'BANNED':
      return t('board.memberStatus.BANNED');
    default:
      return t('board.memberStatus.VISITOR');
  }
});
const subscribeStatusLabel = computed(() => (board.value?.subscribed ? t('board.subscribe.subscribed') : t('board.subscribe.notSubscribed')));

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
    return t('board.join.cancelRequest');
  }
  if (status === 'MEMBER') {
    return t('board.join.completed');
  }
  if (status === 'MODERATOR' || status === 'OWNER') {
    return t('board.join.admin');
  }
  if (status === 'BANNED') {
    return t('board.join.blocked');
  }
  return t('board.join.request');
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
const subscribeLabel = computed(() => (board.value?.subscribed ? t('board.subscribe.subscribing') : t('board.subscribe.subscribeAction')));
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
      boardError.value = t('board.errors.notFound');
      return;
    }
    if (error instanceof ApiError && error.status === 403) {
      boardError.value = t('board.errors.forbidden');
      return;
    }
    boardError.value = error instanceof ApiError ? error.message : t('board.errors.loadFailed');
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
      actionError.value = t('board.errors.alreadyProcessed');
      return;
    }
    actionError.value = error instanceof ApiError ? error.message : t('board.errors.subscribeFailed');
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
      actionError.value = t('board.errors.alreadyJoined');
      return;
    }
    actionError.value = error instanceof ApiError ? error.message : shouldCancel ? t('board.errors.joinCancelFailed') : t('board.errors.joinFailed');
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
          :title="board?.boardName ?? t('board.defaults.communityName')"
          :description="board?.description ?? t('board.defaults.noDescription')"
          :image-file="board?.boardImage ?? null"
          :link-to="board ? `/b/${board.slug}` : undefined"
        >
          <template #meta>
            <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span class="ui-badge ui-badge-accent">{{ t('board.visibility.communitySuffix', { label: visibilityLabel }) }}</span>
              <span class="ui-badge ui-badge-muted">{{ t('board.memberStatus.operatorPrefix', { name: ownerDisplayName }) }}</span>
              <span class="ui-badge" :class="board?.memberStatus === 'BANNED' ? 'ui-badge-danger' : 'ui-badge-warning'">{{ memberStatusLabel }}</span>
              <span class="ui-badge" :class="board?.subscribed ? 'ui-badge-success' : 'ui-badge-muted'">{{ subscribeStatusLabel }}</span>
            </div>
          </template>
          <template #actions>
            <div class="flex flex-col gap-3">
              <div v-if="canInteract" class="flex flex-wrap items-center gap-2">
                <button v-if="canBoardAdmin" type="button" class="ui-button-primary h-10 px-4 text-xs" @click="goBoardAdmin">
                  {{ t('board.actions.manage') }}
                </button>
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
                  {{ t('board.actions.write') }}
                </button>
              </div>

              <div v-else class="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span class="ui-badge ui-badge-muted">{{ t('board.subscribe.loginHint') }}</span>
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

        <div v-if="isBoardLoading" class="mt-6 text-sm text-muted">{{ t('board.page.loadingBoard') }}</div>

        <BoardArticlePanel v-if="board" :board-id="board.id" :board-slug="board.slug" @select="goArticle" />
      </div>
    </PageContainer>
  </AppShell>
</template>
