<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ArticleList from '../components/ArticleList.vue';
import BoardHeaderCard from '../components/BoardHeaderCard.vue';
import CommentList from '../components/CommentList.vue';
import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { resolveFileUrl } from '../lib/files';
import { sanitizeHtml } from '../lib/sanitize';
import type { ArticleDetailResponse, FileResponse } from '../services/articles';
import { deleteArticle, getArticleDetail, toggleArticleReaction } from '../services/articles';
import type { ArticleSummaryResponse } from '../services/boards';
import { getBoardArticles } from '../services/boards';
import type { CommentPageResponse, CommentReactionSummaryResponse, CommentTreeResponse } from '../services/comments';
import { createComment, createReply, deleteComment, getArticleComments, toggleCommentReaction, updateComment } from '../services/comments';
import type { UserProfileResponse } from '../services/mypage';
import { getMyProfile } from '../services/mypage';
import { ARTICLE_LIST_PAGE_SIZES, articleListPageSize, setArticleListPageSize } from '../stores/articleList';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';
import { isAuthenticated } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const articleId = computed(() => Number(route.params.articleId));

const isMobileMenuOpen = ref(false);
const article = ref<ArticleDetailResponse | null>(null);
const profile = ref<UserProfileResponse | null>(null);
const isLoading = ref(false);
const errorMessage = ref('');

const comments = ref<CommentPageResponse<CommentTreeResponse> | null>(null);
const commentPage = ref(0);
const commentError = ref('');
const isCommentLoading = ref(false);
const isCommentSubmitting = ref(false);
const commentReactionLoading = ref(new Set<number>());
const newComment = ref('');
const isReactionLoading = ref(false);
const boardArticles = ref<ArticleSummaryResponse[]>([]);
const boardListError = ref('');
const isBoardArticlesLoading = ref(false);
const boardPage = ref(0);
const boardTotalPages = ref(0);
const boardHasNext = ref(false);
const boardHasPrevious = ref(false);

const boardPageSize = computed(() => articleListPageSize.value);
const boardPageSizeOptions = ARTICLE_LIST_PAGE_SIZES;
const isDeleteModalOpen = ref(false);
const deleteError = ref('');
const isDeleting = ref(false);

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

const boardImageUrl = computed(() => resolveFileUrl(article.value?.board?.boardImage?.storageKey ?? null));

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatFileSize = (size: number) => {
  if (!Number.isFinite(size)) {
    return '-';
  }
  if (size < 1024) {
    return `${size}B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)}KB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  }
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)}GB`;
};

const attachments = computed(() => article.value?.attachments ?? []);
const sanitizedContent = computed(() => (article.value?.content ? sanitizeHtml(article.value.content) : ''));

const boardLink = computed(() => {
  const slug = article.value?.board?.slug ?? String(route.params.slug ?? '');
  return slug ? `/b/${slug}` : '/';
});

const handleBoardPageSizeChange = (size: number) => {
  setArticleListPageSize(size);
};

const handleBoardPageChange = (nextPage: number) => {
  loadBoardArticles(nextPage);
};

const isAuthor = computed(() => {
  if (!profile.value || !article.value) {
    return false;
  }
  return profile.value.userId === article.value.userId;
});

const currentUserId = computed(() => profile.value?.userId ?? null);

const loadArticle = async () => {
  errorMessage.value = '';
  if (!Number.isFinite(articleId.value)) {
    errorMessage.value = '게시글 정보가 올바르지 않습니다.';
    return;
  }
  isLoading.value = true;
  try {
    article.value = await getArticleDetail(articleId.value);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      errorMessage.value = '게시글을 찾을 수 없습니다.';
      return;
    }
    if (error instanceof ApiError && error.status === 403) {
      errorMessage.value = '게시글 접근 권한이 없습니다.';
      return;
    }
    errorMessage.value = error instanceof ApiError ? error.message : '게시글을 불러오지 못했습니다.';
  } finally {
    isLoading.value = false;
  }
};

const loadProfile = async () => {
  if (!isAuthenticated.value) {
    return;
  }
  try {
    profile.value = await getMyProfile();
  } catch {
    profile.value = null;
  }
};

const goBoard = () => {
  if (boardLink.value) {
    router.push(boardLink.value);
  }
};

const goBoardArticle = (targetId: number) => {
  const slugValue = article.value?.board?.slug ?? String(route.params.slug ?? '');
  if (!slugValue) {
    return;
  }
  router.push(`/b/${slugValue}/articles/${targetId}`);
};

const goEdit = () => {
  if (!article.value) {
    return;
  }
  const slug = article.value.board?.slug ?? String(route.params.slug ?? '');
  router.push(`/b/${slug}/articles/${article.value.id}/edit`);
};

const openDeleteModal = () => {
  deleteError.value = '';
  isDeleteModalOpen.value = true;
};

const closeDeleteModal = () => {
  if (isDeleting.value) {
    return;
  }
  isDeleteModalOpen.value = false;
};

const confirmDelete = async () => {
  if (!article.value) {
    return;
  }
  isDeleting.value = true;
  deleteError.value = '';
  try {
    await deleteArticle(article.value.id);
    isDeleteModalOpen.value = false;
    router.push(boardLink.value || '/');
  } catch (error) {
    deleteError.value = error instanceof ApiError ? error.message : '게시글 삭제에 실패했습니다.';
  } finally {
    isDeleting.value = false;
  }
};

const resolveAttachmentUrl = (file: FileResponse) => resolveFileUrl(file.storageKey);

const commentPageSize = 10;

const loadCommentsPage = async (page: number) => {
  if (!Number.isFinite(articleId.value)) {
    return;
  }
  commentError.value = '';
  isCommentLoading.value = true;
  try {
    const response = await getArticleComments(articleId.value, page, commentPageSize);
    comments.value = response;
    commentPage.value = response.page;
  } catch (error) {
    commentError.value = error instanceof ApiError ? error.message : '댓글을 불러오지 못했습니다.';
  } finally {
    isCommentLoading.value = false;
  }
};

const loadBoardArticles = async (page: number) => {
  if (!article.value?.board?.id) {
    return;
  }
  boardListError.value = '';
  isBoardArticlesLoading.value = true;
  try {
    const response = await getBoardArticles(article.value.board.id, page, boardPageSize.value);
    boardArticles.value = response.page.items ?? [];
    boardPage.value = response.page.page;
    boardTotalPages.value = response.page.totalPages;
    boardHasNext.value = response.page.hasNext;
    boardHasPrevious.value = response.page.hasPrevious;
  } catch (error) {
    boardListError.value = error instanceof ApiError ? error.message : '게시글 목록을 불러오지 못했습니다.';
    boardHasNext.value = false;
    boardHasPrevious.value = false;
    boardTotalPages.value = 0;
  } finally {
    isBoardArticlesLoading.value = false;
  }
};

const loadLastCommentPage = async () => {
  if (!Number.isFinite(articleId.value)) {
    return;
  }
  commentError.value = '';
  isCommentLoading.value = true;
  try {
    const first = await getArticleComments(articleId.value, 0, commentPageSize);
    if (first.totalPages <= 1) {
      comments.value = first;
      commentPage.value = first.page;
    } else {
      const lastPage = first.totalPages - 1;
      const last = await getArticleComments(articleId.value, lastPage, commentPageSize);
      comments.value = last;
      commentPage.value = last.page;
    }
  } catch (error) {
    commentError.value = error instanceof ApiError ? error.message : '댓글을 불러오지 못했습니다.';
  } finally {
    isCommentLoading.value = false;
  }
};

const refreshComments = async () => {
  await loadLastCommentPage();
  await loadArticle();
};

const submitComment = async () => {
  if (!article.value || !newComment.value.trim()) {
    return;
  }
  isCommentSubmitting.value = true;
  try {
    await createComment(article.value.id, newComment.value.trim());
    newComment.value = '';
    await refreshComments();
  } catch (error) {
    commentError.value = error instanceof ApiError ? error.message : '댓글 작성에 실패했습니다.';
  } finally {
    isCommentSubmitting.value = false;
  }
};

const handleReply = async (payload: { parentId: number; content: string }) => {
  if (!article.value) {
    return;
  }
  isCommentSubmitting.value = true;
  try {
    await createReply(article.value.id, payload.parentId, payload.content);
    await refreshComments();
  } catch (error) {
    commentError.value = error instanceof ApiError ? error.message : '답글 작성에 실패했습니다.';
  } finally {
    isCommentSubmitting.value = false;
  }
};

const handleUpdate = async (payload: { commentId: number; content: string }) => {
  isCommentSubmitting.value = true;
  try {
    await updateComment(payload.commentId, payload.content);
    await refreshComments();
  } catch (error) {
    commentError.value = error instanceof ApiError ? error.message : '댓글 수정에 실패했습니다.';
  } finally {
    isCommentSubmitting.value = false;
  }
};

const handleDelete = async (commentId: number) => {
  isCommentSubmitting.value = true;
  try {
    await deleteComment(commentId);
    await refreshComments();
  } catch (error) {
    commentError.value = error instanceof ApiError ? error.message : '댓글 삭제에 실패했습니다.';
  } finally {
    isCommentSubmitting.value = false;
  }
};

const updateCommentReaction = (nodes: CommentTreeResponse[], summary: CommentReactionSummaryResponse) => {
  for (const node of nodes) {
    if (node.id === summary.commentId) {
      node.likeCount = summary.likeCount;
      node.dislikeCount = summary.dislikeCount;
      node.myReaction = summary.myReaction;
      return true;
    }
    if (node.children.length > 0 && updateCommentReaction(node.children, summary)) {
      return true;
    }
  }
  return false;
};

const setCommentReactionLoading = (commentId: number, isLoading: boolean) => {
  const next = new Set(commentReactionLoading.value);
  if (isLoading) {
    next.add(commentId);
  } else {
    next.delete(commentId);
  }
  commentReactionLoading.value = next;
};

const handleCommentReaction = async (payload: { commentId: number; reactionType: number }) => {
  if (!comments.value || !isAuthenticated.value || commentReactionLoading.value.has(payload.commentId)) {
    return;
  }
  setCommentReactionLoading(payload.commentId, true);
  try {
    const summary = await toggleCommentReaction(payload.commentId, payload.reactionType);
    updateCommentReaction(comments.value.items, summary);
  } catch (error) {
    commentError.value = error instanceof ApiError ? error.message : '댓글 반응 처리에 실패했습니다.';
  } finally {
    setCommentReactionLoading(payload.commentId, false);
  }
};

const handleReaction = async (reactionType: number) => {
  if (!article.value || isReactionLoading.value || !isAuthenticated.value) {
    return;
  }
  isReactionLoading.value = true;
  try {
    const summary = await toggleArticleReaction(article.value.id, reactionType);
    article.value.likeCount = summary.likeCount;
    article.value.dislikeCount = summary.dislikeCount;
    article.value.myReaction = summary.myReaction;
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : '반응 처리에 실패했습니다.';
  } finally {
    isReactionLoading.value = false;
  }
};

const handleCommentPage = async (page: number) => {
  if (!comments.value) {
    return;
  }
  const totalPages = comments.value.totalPages;
  if (page < 0 || page >= totalPages) {
    return;
  }
  await loadCommentsPage(page);
};

onMounted(async () => {
  await loadArticle();
  await loadProfile();
  await refreshComments();
  await loadBoardArticles(0);
});

watch(
  () => route.params.articleId,
  async () => {
    await loadArticle();
    await refreshComments();
    await loadBoardArticles(0);
  },
);

watch(
  () => boardPageSize.value,
  () => {
    loadBoardArticles(0);
  },
);
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-4xl">
          <BoardHeaderCard
            :title="article?.board?.boardName ?? '커뮤니티'"
            :description="article?.board?.description ?? '설명이 없습니다.'"
            :image-url="boardImageUrl"
          >
            <template #actions>
              <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                  @click="goBoard"
                >
                  게시판으로
                </button>
                <button
                  v-if="isAuthor"
                  type="button"
                  class="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                  @click="goEdit"
                >
                  수정
                </button>
                <button
                  v-if="isAuthor"
                  type="button"
                  class="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
                  @click="openDeleteModal"
                >
                  삭제
                </button>
              </div>
            </template>
          </BoardHeaderCard>

          <div
            v-if="errorMessage"
            class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ errorMessage }}
          </div>

          <div v-else class="mt-6">
            <div class="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span v-if="article?.notice" class="rounded-full bg-amber-500 px-2 py-0.5 font-semibold text-white"> 공지 </span>
                <span>{{ article?.authorName ?? '작성자' }}</span>
                <span>조회 {{ article?.hit ?? 0 }}</span>
                <span>댓글 {{ article?.commentCount ?? 0 }}</span>
                <span>{{ article?.createdAt ? formatDateTime(article.createdAt) : '' }}</span>
                <span v-if="article?.updatedAt">수정 {{ formatDateTime(article.updatedAt) }}</span>
              </div>
              <h1 class="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {{ article?.title ?? '' }}
              </h1>
              <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                  :class="
                    article?.myReaction === 1
                      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                  "
                  :disabled="!isAuthenticated || isReactionLoading"
                  @click="handleReaction(1)"
                >
                  좋아요 {{ article?.likeCount ?? 0 }}
                </button>
                <button
                  type="button"
                  class="rounded-full border px-3 py-1 text-xs font-semibold transition"
                  :class="
                    article?.myReaction === -1
                      ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                  "
                  :disabled="!isAuthenticated || isReactionLoading"
                  @click="handleReaction(-1)"
                >
                  싫어요 {{ article?.dislikeCount ?? 0 }}
                </button>
                <span v-if="!isAuthenticated" class="text-xs text-slate-400">로그인 후 반응할 수 있습니다.</span>
              </div>
              <div v-if="article?.content" class="mt-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300" v-html="sanitizedContent"></div>
              <div v-else class="mt-6 text-sm text-slate-500 dark:text-slate-400">본문이 없습니다.</div>
            </div>

            <section class="mt-6">
              <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">첨부파일</h2>
              <div
                v-if="attachments.length === 0"
                class="mt-3 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
              >
                첨부파일이 없습니다.
              </div>
              <div v-else class="mt-3 space-y-2">
                <a
                  v-for="file in attachments"
                  :key="file.id"
                  :href="resolveAttachmentUrl(file) ?? '#'"
                  class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  target="_blank"
                  rel="noopener"
                >
                  <div class="flex flex-col">
                    <span class="font-medium">{{ file.fileName }}</span>
                    <span class="text-xs text-slate-500 dark:text-slate-400">{{ file.mimeType }}</span>
                  </div>
                  <span class="text-xs text-slate-500 dark:text-slate-400">
                    {{ formatFileSize(file.fileSize) }}
                  </span>
                </a>
              </div>
            </section>

            <section class="mt-10">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">댓글</h2>
                <span class="text-xs text-slate-500 dark:text-slate-400">총 {{ article?.commentCount ?? 0 }}개</span>
              </div>

              <div
                v-if="isAuthenticated"
                class="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <textarea
                  v-model="newComment"
                  rows="3"
                  placeholder="댓글을 입력하세요"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-emerald-500/20"
                ></textarea>
                <div class="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700"
                    :disabled="isCommentSubmitting"
                    @click="submitComment"
                  >
                    댓글 등록
                  </button>
                </div>
              </div>

              <div
                v-else
                class="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
              >
                댓글 작성은 로그인 후 이용할 수 있습니다.
              </div>

              <div
                v-if="commentError"
                class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
              >
                {{ commentError }}
              </div>

              <div v-if="comments && comments.items.length === 0" class="mt-4 text-sm text-slate-500 dark:text-slate-400">아직 댓글이 없습니다.</div>

              <div v-else-if="comments" class="mt-4">
                <CommentList
                  :comments="comments.items"
                  :current-user-id="currentUserId"
                  :article-author-id="article?.userId ?? null"
                  :is-authenticated="isAuthenticated"
                  @reply="handleReply"
                  @update="handleUpdate"
                  @delete="handleDelete"
                  @reaction="handleCommentReaction"
                />
              </div>

              <div v-if="comments && comments.totalPages > 1" class="mt-4 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  :disabled="!comments.hasPrevious || isCommentLoading"
                  @click="handleCommentPage(commentPage - 1)"
                >
                  이전
                </button>
                <span>페이지 {{ commentPage + 1 }} / {{ comments.totalPages }}</span>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  :disabled="!comments.hasNext || isCommentLoading"
                  @click="handleCommentPage(commentPage + 1)"
                >
                  다음
                </button>
              </div>

              <div v-if="isCommentLoading" class="mt-3 text-xs text-slate-500">댓글을 불러오는 중입니다...</div>
            </section>

            <section class="mt-10">
              <div
                v-if="boardListError"
                class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
              >
                {{ boardListError }}
              </div>
              <ArticleList
                :articles="boardArticles"
                :is-loading="isBoardArticlesLoading"
                :page-size="boardPageSize"
                :page-size-options="boardPageSizeOptions"
                :page="boardPage"
                :total-pages="boardTotalPages"
                :has-next="boardHasNext"
                :has-previous="boardHasPrevious"
                @select="goBoardArticle"
                @update:page-size="handleBoardPageSizeChange"
                @update:page="handleBoardPageChange"
              />
              <div v-if="isBoardArticlesLoading" class="mt-4 text-xs text-slate-500">게시글 목록을 불러오는 중입니다...</div>
            </section>
          </div>

          <div v-if="isLoading" class="mt-6 text-sm text-slate-500">게시글을 불러오는 중입니다...</div>
        </div>
      </main>
    </div>

    <div v-if="isDeleteModalOpen" class="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-slate-900/40" @click="closeDeleteModal"></div>
      <div class="relative w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">게시글 삭제</h3>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">삭제한 게시글은 복구할 수 없습니다. 계속 진행하시겠어요?</p>
        <p
          v-if="deleteError"
          class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200"
          role="alert"
        >
          {{ deleteError }}
        </p>
        <div class="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            :disabled="isDeleting"
            @click="closeDeleteModal"
          >
            취소
          </button>
          <button
            type="button"
            class="rounded-full border border-rose-300 bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-rose-800"
            :disabled="isDeleting"
            @click="confirmDelete"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
