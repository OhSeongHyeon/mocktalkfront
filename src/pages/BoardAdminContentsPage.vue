<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import BoardAdminNav from '../widgets/layout/BoardAdminNav.vue';
import { ApiError } from '../shared/lib/http/api';
import { getBoardBySlug } from '../entities/board';
import type { BoardDetailResponse, BoardMemberStatus } from '../entities/board';
import {
  deleteBoardAdminArticle,
  deleteBoardAdminComment,
  getBoardAdminArticles,
  getBoardAdminComments,
  updateBoardAdminArticleNotice,
} from '../features/admin/board';
import type { BoardAdminArticleItemResponse, BoardAdminCommentItemResponse } from '../features/admin/board';
import { useAuthStore } from '../stores/auth';
import PageContainer from '../shared/ui/PageContainer.vue';
import AppShell from '../widgets/layout/AppShell.vue';

type ContentType = 'ARTICLE' | 'COMMENT';
type ReportedFilter = 'ALL' | 'REPORTED' | 'UNREPORTED';
type NoticeFilter = 'ALL' | 'NOTICE' | 'NORMAL';

const route = useRoute();
const { t } = useI18n();
const authStore = useAuthStore();
const { isAdmin } = storeToRefs(authStore);
const board = ref<BoardDetailResponse | null>(null);
const boardError = ref('');

const contentType = ref<ContentType>('ARTICLE');
const reportedFilter = ref<ReportedFilter>('ALL');
const noticeFilter = ref<NoticeFilter>('ALL');
const authorId = ref('');

const articles = ref<BoardAdminArticleItemResponse[]>([]);
const comments = ref<BoardAdminCommentItemResponse[]>([]);
const listError = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);
const page = ref(0);
const size = ref(10);
const totalPages = ref(0);

const isAllowedMember = (memberStatus: BoardMemberStatus | null) => memberStatus === 'OWNER' || memberStatus === 'MODERATOR';

const hasPermission = computed(() => isAdmin.value || (board.value ? isAllowedMember(board.value.memberStatus) : false));

const boardSlug = computed(() => String(route.params.slug ?? ''));
const boardName = computed(() => board.value?.boardName ?? t('admin.common.defaultBoardName'));

const reportedParam = computed(() => {
  if (reportedFilter.value === 'ALL') {
    return undefined;
  }
  return reportedFilter.value === 'REPORTED';
});

const noticeParam = computed(() => {
  if (noticeFilter.value === 'ALL') {
    return undefined;
  }
  return noticeFilter.value === 'NOTICE';
});

const parsedAuthorId = computed(() => {
  const value = Number(authorId.value);
  return Number.isFinite(value) && value > 0 ? value : undefined;
});

const formatDate = (value: string | null) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

const loadBoard = async () => {
  boardError.value = '';
  try {
    board.value = await getBoardBySlug(boardSlug.value);
    if (!hasPermission.value) {
      boardError.value = t('admin.common.noBoardAdmin');
    }
  } catch (error) {
    boardError.value = error instanceof ApiError ? error.message : t('admin.common.loadBoardFailed');
  }
};

const loadContents = async () => {
  if (!board.value || !hasPermission.value) {
    return;
  }
  listError.value = '';
  isLoading.value = true;
  try {
    if (contentType.value === 'ARTICLE') {
      const response = await getBoardAdminArticles(board.value.id, {
        reported: reportedParam.value,
        notice: noticeParam.value,
        authorId: parsedAuthorId.value,
        page: page.value,
        size: size.value,
      });
      articles.value = response.items;
      comments.value = [];
      totalPages.value = response.totalPages;
    } else {
      const response = await getBoardAdminComments(board.value.id, {
        reported: reportedParam.value,
        authorId: parsedAuthorId.value,
        page: page.value,
        size: size.value,
      });
      comments.value = response.items;
      articles.value = [];
      totalPages.value = response.totalPages;
    }
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : t('admin.boardAdmin.contents.errors.loadList');
  } finally {
    isLoading.value = false;
  }
};

const applyFilters = async () => {
  page.value = 0;
  await loadContents();
};

const movePage = async (delta: number) => {
  const next = page.value + delta;
  if (next < 0 || next >= totalPages.value) {
    return;
  }
  page.value = next;
  await loadContents();
};

const switchContentType = async (type: ContentType) => {
  if (contentType.value === type) {
    return;
  }
  contentType.value = type;
  page.value = 0;
  await loadContents();
};

const toggleNotice = async (article: BoardAdminArticleItemResponse) => {
  if (!board.value) {
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    const updated = await updateBoardAdminArticleNotice(board.value.id, article.id, { notice: !article.notice });
    articles.value = articles.value.map((item) => (item.id === updated.id ? updated : item));
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : t('admin.boardAdmin.contents.errors.noticeFailed');
  } finally {
    isSubmitting.value = false;
  }
};

const deleteArticle = async (article: BoardAdminArticleItemResponse) => {
  if (!board.value) {
    return;
  }
  if (!window.confirm(t('admin.boardAdmin.contents.confirmDeleteArticle'))) {
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    await deleteBoardAdminArticle(board.value.id, article.id);
    await loadContents();
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : t('admin.boardAdmin.contents.errors.deleteArticleFailed');
  } finally {
    isSubmitting.value = false;
  }
};

const deleteComment = async (comment: BoardAdminCommentItemResponse) => {
  if (!board.value) {
    return;
  }
  if (!window.confirm(t('admin.boardAdmin.contents.confirmDeleteComment'))) {
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    await deleteBoardAdminComment(board.value.id, comment.id);
    await loadContents();
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : t('admin.boardAdmin.contents.errors.deleteCommentFailed');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  await nextTick();
  await loadBoard();
  await loadContents();
});
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <div class="space-y-6">
        <BoardAdminNav v-if="board && hasPermission" :slug="board.slug" :board-name="boardName" active="contents" />

        <div v-if="boardError" class="ui-state ui-state-danger">
          {{ boardError }}
        </div>

        <div v-if="board && hasPermission" class="space-y-6">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 class="ui-heading-page">{{ t('admin.boardAdmin.contents.title') }}</h1>
              <p class="text-sm text-muted">{{ t('admin.boardAdmin.contents.description') }}</p>
            </div>
            <div class="flex items-center gap-2 rounded-full border border-line bg-surface px-2 py-1 text-xs font-semibold text-muted">
              <button
                type="button"
                class="rounded-full px-4 py-2 transition"
                :class="contentType === 'ARTICLE' ? 'bg-[color:var(--accent-strong)] text-white' : 'text-muted'"
                @click="switchContentType('ARTICLE')"
              >
                {{ t('admin.boardAdmin.contents.tabArticles') }}
              </button>
              <button
                type="button"
                class="rounded-full px-4 py-2 transition"
                :class="contentType === 'COMMENT' ? 'bg-[color:var(--accent-strong)] text-white' : 'text-muted'"
                @click="switchContentType('COMMENT')"
              >
                {{ t('admin.boardAdmin.contents.tabComments') }}
              </button>
            </div>
          </div>

          <div class="ui-panel p-4">
            <div class="flex flex-wrap items-center gap-3">
              <select
                v-model="reportedFilter"
                class="h-10 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink shadow-sm transition focus:border-[color:var(--accent-strong)] focus:outline-none"
              >
                <option value="ALL">{{ t('admin.boardAdmin.contents.filterReportedAll') }}</option>
                <option value="REPORTED">{{ t('admin.boardAdmin.contents.filterReportedYes') }}</option>
                <option value="UNREPORTED">{{ t('admin.boardAdmin.contents.filterReportedNo') }}</option>
              </select>
              <select
                v-if="contentType === 'ARTICLE'"
                v-model="noticeFilter"
                class="h-10 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink shadow-sm transition focus:border-[color:var(--accent-strong)] focus:outline-none"
              >
                <option value="ALL">{{ t('admin.boardAdmin.contents.filterNoticeAll') }}</option>
                <option value="NOTICE">{{ t('admin.boardAdmin.contents.filterNoticeYes') }}</option>
                <option value="NORMAL">{{ t('admin.boardAdmin.contents.filterNoticeNo') }}</option>
              </select>
              <input
                v-model="authorId"
                type="number"
                class="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink shadow-sm focus:border-[color:var(--accent-strong)] focus:outline-none"
                :placeholder="t('admin.common.authorIdPlaceholder')"
              />
              <button
                type="button"
                class="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:text-subtle"
                @click="applyFilters"
              >
                {{ t('admin.common.apply') }}
              </button>
            </div>
          </div>

          <div v-if="listError" class="ui-state ui-state-danger">
            {{ listError }}
          </div>

          <section class="ui-panel p-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-ink">{{ t('admin.boardAdmin.contents.listTitle') }}</h2>
              <span class="text-xs text-subtle">{{
                t('admin.common.displayCount', { count: contentType === 'ARTICLE' ? articles.length : comments.length })
              }}</span>
            </div>

            <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-muted">
              <span class="h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)] dark:bg-surface-2"></span>
              {{ t('common.loading') }}
            </div>

            <div v-else class="mt-4 flex flex-col gap-3">
              <template v-if="contentType === 'ARTICLE'">
                <div
                  v-for="article in articles"
                  :key="article.id"
                  class="rounded-ui border border-line px-4 py-3 text-left transition dark:border-line"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2 text-sm font-semibold text-ink">
                        <span>#{{ article.id }}</span>
                        <span class="text-xs text-subtle">{{ article.authorName }}</span>
                      </div>
                      <p class="mt-1 text-sm text-ink">{{ article.title }}</p>
                      <p class="mt-1 text-xs text-subtle">
                        {{ t('admin.boardAdmin.contents.writtenAt') }} {{ formatDate(article.createdAt) }} ·
                        {{ t('admin.boardAdmin.contents.deletedAtLabel') }} {{ formatDate(article.deletedAt) }}
                      </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span
                        v-if="article.notice"
                        class="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200"
                      >
                        {{ t('admin.boardAdmin.contents.notice') }}
                      </span>
                      <span
                        v-if="article.reported"
                        class="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
                      >
                        {{ t('admin.boardAdmin.contents.reported') }}
                      </span>
                      <span
                        v-if="article.deletedAt"
                        class="inline-flex items-center rounded-full bg-surface-2 bg-surface-soft px-2.5 py-1 text-xs font-semibold text-muted dark:text-subtle"
                      >
                        {{ t('admin.common.deleted') }}
                      </span>
                    </div>
                  </div>
                  <div class="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      class="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted transition hover:border-line hover:text-ink disabled:opacity-40 dark:text-subtle"
                      :disabled="isSubmitting"
                      @click="toggleNotice(article)"
                    >
                      {{ article.notice ? t('admin.boardAdmin.contents.unsetNotice') : t('admin.boardAdmin.contents.setNotice') }}
                    </button>
                    <button
                      type="button"
                      class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:opacity-40 dark:border-rose-700 dark:text-rose-300"
                      :disabled="isSubmitting"
                      @click="deleteArticle(article)"
                    >
                      {{ t('common.delete') }}
                    </button>
                  </div>
                </div>
              </template>

              <template v-if="contentType === 'COMMENT'">
                <div
                  v-for="comment in comments"
                  :key="comment.id"
                  class="rounded-ui border border-line px-4 py-3 text-left transition dark:border-line"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2 text-sm font-semibold text-ink">
                        <span>#{{ comment.id }}</span>
                        <span class="text-xs text-subtle">{{ comment.authorName }}</span>
                      </div>
                      <p class="mt-1 text-xs text-subtle">
                        {{ t('admin.boardAdmin.contents.articleLine', { title: comment.articleTitle, id: comment.articleId }) }}
                      </p>
                      <p class="mt-2 text-sm text-ink">{{ comment.content }}</p>
                      <p class="mt-1 text-xs text-subtle">
                        {{ t('admin.boardAdmin.contents.writtenAt') }} {{ formatDate(comment.createdAt) }} ·
                        {{ t('admin.boardAdmin.contents.deletedAtLabel') }} {{ formatDate(comment.deletedAt) }}
                      </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span
                        v-if="comment.reported"
                        class="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
                      >
                        {{ t('admin.boardAdmin.contents.reported') }}
                      </span>
                      <span
                        v-if="comment.deletedAt"
                        class="inline-flex items-center rounded-full bg-surface-2 bg-surface-soft px-2.5 py-1 text-xs font-semibold text-muted dark:text-subtle"
                      >
                        {{ t('admin.common.deleted') }}
                      </span>
                    </div>
                  </div>
                  <div class="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:opacity-40 dark:border-rose-700 dark:text-rose-300"
                      :disabled="isSubmitting"
                      @click="deleteComment(comment)"
                    >
                      {{ t('common.delete') }}
                    </button>
                  </div>
                </div>
              </template>

              <div v-if="contentType === 'ARTICLE' && articles.length === 0" class="ui-state ui-state-empty px-4 py-10">
                {{ t('admin.boardAdmin.contents.emptyArticles') }}
              </div>
              <div v-if="contentType === 'COMMENT' && comments.length === 0" class="ui-state ui-state-empty px-4 py-10">
                {{ t('admin.boardAdmin.contents.emptyComments') }}
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between text-sm text-muted">
              <button
                type="button"
                class="ui-chip-button ui-chip-button-muted px-4 py-2 disabled:opacity-40"
                :disabled="page === 0"
                @click="movePage(-1)"
              >
                {{ t('common.previous') }}
              </button>
              <span>{{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
              <button
                type="button"
                class="ui-chip-button ui-chip-button-muted px-4 py-2 disabled:opacity-40"
                :disabled="page + 1 >= totalPages"
                @click="movePage(1)"
              >
                {{ t('common.next') }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>
