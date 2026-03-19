<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import '../shared/styles/mermaid.css';
import '../shared/styles/ui-content.css';
import { useRoute, useRouter } from 'vue-router';

import BoardArticlePanel from '../widgets/board/BoardArticlePanel.vue';
import BoardHeaderCard from '../widgets/board/BoardHeaderCard.vue';
import CommentList from '../widgets/comment/CommentList.vue';
import ConfirmModal from '../shared/ui/ConfirmModal.vue';
import type { CommentPageResponse, CommentReactionSummaryResponse, CommentSnapshotResponse, CommentTreeResponse } from '../features/comment';
import { createComment, createReply, deleteComment, getArticleCommentSnapshot, toggleCommentReaction, updateComment } from '../features/comment';
import type { BoardRealtimeSubscription, RealtimeEventEnvelope } from '../features/realtime';
import { subscribeBoardRealtime } from '../features/realtime';
import type { ArticleDetailResponse, FileResponse } from '../entities/article';
import { bookmarkArticle, deleteArticle, getArticleDetail, toggleArticleReaction, unbookmarkArticle } from '../entities/article';
import type { UserProfileResponse } from '../entities/user';
import { getMyProfile } from '../entities/user';
import { ApiError } from '../shared/lib/http/api';
import { resolveProtectedFileViewUrlsInHtml } from '../entities/file';
import { recordHistoryItem } from '../shared/lib/history';
import { renderMermaidDiagrams } from '../shared/lib/mermaid';
import { sanitizeHtml } from '../shared/lib/sanitize';
import { requestArticleAttachmentBlob } from '../entities/article';
import { useAuthStore } from '../stores/auth';
import PageContainer from '../shared/ui/PageContainer.vue';
import AppShell from '../widgets/layout/AppShell.vue';

interface ArticleSelectPayload {
  articleId: number;
  query: Record<string, string>;
}

type AppShellExposed = {
  getMainElement: () => HTMLElement | null;
};

const route = useRoute();
const router = useRouter();
const articleId = computed(() => Number(route.params.articleId));
const authStore = useAuthStore();
const { isAuthenticated } = storeToRefs(authStore);

const appShellRef = ref<AppShellExposed | null>(null);
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
const commentTextareaRef = ref<HTMLTextAreaElement | null>(null);
const isReactionLoading = ref(false);
const isBookmarkLoading = ref(false);
const focusCommentId = ref<number | null>(null);
const focusTimer = ref<number | null>(null);
const isDeleteModalOpen = ref(false);
const deleteError = ref('');
const isDeleting = ref(false);
const realtimeSubscription = ref<BoardRealtimeSubscription | null>(null);
const realtimeRefreshTimer = ref<number | null>(null);
const isRealtimeSyncing = ref(false);
const hasPendingRealtimeSync = ref(false);
const lastCommentSyncVersion = ref<number | null>(null);
const articleDetailScrollContainer = ref<HTMLElement | null>(null);
const articleContentRef = ref<HTMLElement | null>(null);
const isAttachmentExpanded = ref(false);
const isDownloadingAllAttachments = ref(false);
const COMMENT_TEXTAREA_MAX_HEIGHT = 240;

type CommentDeltaAction = 'CREATED' | 'UPDATED' | 'DELETED';

interface CommentDeltaPayload {
  targetType?: string;
  action?: CommentDeltaAction;
  boardId?: number;
  articleId?: number;
  commentId?: number;
  parentCommentId?: number | null;
  depth?: number;
  syncVersion?: number;
  comment?: CommentTreeResponse;
}

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
const renderedContent = ref('');
const articleCategoryLabel = computed(() => {
  const trimmed = article.value?.categoryName?.trim();
  return trimmed ? trimmed : null;
});
const articleVisibilityLabel = computed(() => {
  switch (article.value?.visibility) {
    case 'PUBLIC':
      return '공개';
    case 'GROUP':
      return '구독형';
    case 'PRIVATE':
      return '비공개';
    case 'UNLISTED':
      return '운영자 전용';
    default:
      return '일반';
  }
});

const renderArticleMermaid = async () => {
  await nextTick();
  await renderMermaidDiagrams(articleContentRef.value);
};

const refreshRenderedContent = async () => {
  renderedContent.value = await resolveProtectedFileViewUrlsInHtml(sanitizedContent.value, isAuthenticated.value);
};

const boardLink = computed(() => {
  const slug = article.value?.board?.slug ?? String(route.params.slug ?? '');
  return slug ? `/b/${slug}` : '/';
});

const parseCommentId = () => {
  const raw = route.query.commentId;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

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

const resolveBoardFilterQuery = () => {
  const query: Record<string, string> = {};
  const uncategorized = resolveUncategorizedFromRoute();
  if (uncategorized) {
    query.uncategorized = 'true';
    return query;
  }
  const categoryId = resolveCategoryFromRoute();
  if (categoryId !== null) {
    query.categoryId = String(categoryId);
  }
  return query;
};

const boardLinkWithFilter = computed(() => {
  if (!boardLink.value || boardLink.value === '/') {
    return boardLink.value;
  }
  const query = resolveBoardFilterQuery();
  const params = new URLSearchParams(query);
  const queryString = params.toString();
  return queryString ? `${boardLink.value}?${queryString}` : boardLink.value;
});

const hasComment = (nodes: CommentTreeResponse[], targetId: number): boolean => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return true;
    }
    if (node.children.length > 0 && hasComment(node.children, targetId)) {
      return true;
    }
  }
  return false;
};

const clearFocusTimer = () => {
  if (focusTimer.value) {
    window.clearTimeout(focusTimer.value);
    focusTimer.value = null;
  }
};

const clearRealtimeRefreshTimer = () => {
  if (realtimeRefreshTimer.value) {
    window.clearTimeout(realtimeRefreshTimer.value);
    realtimeRefreshTimer.value = null;
  }
};

const closeRealtimeSubscription = () => {
  realtimeSubscription.value?.close();
  realtimeSubscription.value = null;
};

const setFocusHighlight = (targetId: number) => {
  focusCommentId.value = targetId;
  clearFocusTimer();
  focusTimer.value = window.setTimeout(() => {
    focusCommentId.value = null;
  }, 3000);
};

const scrollToComment = async (targetId: number) => {
  await nextTick();
  const element = document.getElementById(`comment-${targetId}`);
  if (!element) {
    return;
  }
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setFocusHighlight(targetId);
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
    if (article.value) {
      recordHistoryItem({
        articleId: article.value.id,
        title: article.value.title ?? '',
        boardSlug: article.value.board?.slug ?? String(route.params.slug ?? ''),
        boardName: article.value.board?.boardName ?? null,
      });
      await refreshRenderedContent();
      void renderArticleMermaid();
    }
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
    router.push({
      path: boardLink.value,
      query: resolveBoardFilterQuery(),
    });
  }
};

const scrollArticleDetailToTop = () => {
  if (!articleDetailScrollContainer.value) {
    articleDetailScrollContainer.value = appShellRef.value?.getMainElement() ?? null;
  }
  if (articleDetailScrollContainer.value) {
    articleDetailScrollContainer.value.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    return;
  }
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
};

const goBoardArticle = async ({ articleId: targetId, query }: ArticleSelectPayload) => {
  const slugValue = article.value?.board?.slug ?? String(route.params.slug ?? '');
  if (!slugValue) {
    return;
  }
  await router.push({
    path: `/b/${slugValue}/articles/${targetId}`,
    query,
  });
  await nextTick();
  scrollArticleDetailToTop();
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
    const boardPath = boardLink.value || '/';
    router.push({
      path: boardPath,
      query: boardPath === '/' ? {} : resolveBoardFilterQuery(),
    });
  } catch (error) {
    deleteError.value = error instanceof ApiError ? error.message : '게시글 삭제에 실패했습니다.';
  } finally {
    isDeleting.value = false;
  }
};

const attachmentSectionId = 'article-attachment-section';

const triggerBlobDownload = (blob: Blob, fileName: string) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(objectUrl);
};

const downloadAttachment = async (file: FileResponse) => {
  const id = file.id ?? null;
  if (!article.value?.id || !id) {
    return;
  }
  const blob = await requestArticleAttachmentBlob(article.value.id, id);
  triggerBlobDownload(blob, file.fileName);
};

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), milliseconds);
  });

const downloadAllAttachments = async () => {
  if (attachments.value.length === 0 || isDownloadingAllAttachments.value) {
    return;
  }
  isDownloadingAllAttachments.value = true;
  try {
    for (const file of attachments.value) {
      await downloadAttachment(file);
      await sleep(120);
    }
  } finally {
    isDownloadingAllAttachments.value = false;
  }
};

const commentPageSize = 10;

const applyCommentSnapshot = (snapshot: CommentSnapshotResponse) => {
  comments.value = snapshot.page;
  commentPage.value = snapshot.page.page;
  lastCommentSyncVersion.value = snapshot.syncVersion;
};

const loadCommentsPage = async (page: number) => {
  if (!Number.isFinite(articleId.value)) {
    return;
  }
  commentError.value = '';
  isCommentLoading.value = true;
  try {
    const response = await getArticleCommentSnapshot(articleId.value, page, commentPageSize);
    applyCommentSnapshot(response);
  } catch (error) {
    commentError.value = error instanceof ApiError ? error.message : '댓글을 불러오지 못했습니다.';
  } finally {
    isCommentLoading.value = false;
  }
};

const loadLastCommentPage = async () => {
  if (!Number.isFinite(articleId.value)) {
    return;
  }
  commentError.value = '';
  isCommentLoading.value = true;
  try {
    const first = await getArticleCommentSnapshot(articleId.value, 0, commentPageSize);
    if (first.page.totalPages <= 1) {
      applyCommentSnapshot(first);
    } else {
      const lastPage = first.page.totalPages - 1;
      const last = await getArticleCommentSnapshot(articleId.value, lastPage, commentPageSize);
      applyCommentSnapshot(last);
    }
  } catch (error) {
    commentError.value = error instanceof ApiError ? error.message : '댓글을 불러오지 못했습니다.';
  } finally {
    isCommentLoading.value = false;
  }
};

const loadCommentPageWithTarget = async (targetId: number) => {
  if (!Number.isFinite(articleId.value)) {
    return false;
  }
  if (comments.value && hasComment(comments.value.items, targetId)) {
    return true;
  }
  commentError.value = '';
  isCommentLoading.value = true;
  try {
    const first = await getArticleCommentSnapshot(articleId.value, 0, commentPageSize);
    if (hasComment(first.page.items, targetId)) {
      applyCommentSnapshot(first);
      return true;
    }
    const totalPages = first.page.totalPages;
    for (let page = 1; page < totalPages; page += 1) {
      const response = await getArticleCommentSnapshot(articleId.value, page, commentPageSize);
      if (hasComment(response.page.items, targetId)) {
        applyCommentSnapshot(response);
        return true;
      }
    }
    applyCommentSnapshot(first);
    return false;
  } catch (error) {
    commentError.value = error instanceof ApiError ? error.message : '댓글을 불러오지 못했습니다.';
    return false;
  } finally {
    isCommentLoading.value = false;
  }
};

const focusComment = async (targetId: number | null) => {
  if (!targetId || !Number.isFinite(targetId)) {
    focusCommentId.value = null;
    return;
  }
  const found = await loadCommentPageWithTarget(targetId);
  if (found) {
    await scrollToComment(targetId);
  }
};

const refreshComments = async () => {
  await loadLastCommentPage();
  await loadArticle();
};

const syncCommentsByRealtime = async () => {
  if (isRealtimeSyncing.value) {
    hasPendingRealtimeSync.value = true;
    return;
  }
  isRealtimeSyncing.value = true;
  try {
    if (comments.value) {
      await loadCommentsPage(commentPage.value);
    } else {
      await loadLastCommentPage();
    }
    await loadArticle();
  } finally {
    isRealtimeSyncing.value = false;
    if (hasPendingRealtimeSync.value) {
      hasPendingRealtimeSync.value = false;
      await syncCommentsByRealtime();
    }
  }
};

const scheduleRealtimeCommentSync = () => {
  if (typeof window === 'undefined') {
    return;
  }
  clearRealtimeRefreshTimer();
  realtimeRefreshTimer.value = window.setTimeout(() => {
    void syncCommentsByRealtime();
  }, 250);
};

const findCommentNode = (nodes: CommentTreeResponse[], targetId: number): CommentTreeResponse | null => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node;
    }
    const child = findCommentNode(node.children, targetId);
    if (child) {
      return child;
    }
  }
  return null;
};

const recalculateCommentPageMeta = () => {
  if (!comments.value) {
    return;
  }
  const pageData = comments.value;
  const size = pageData.size > 0 ? pageData.size : commentPageSize;
  pageData.totalPages = Math.ceil(pageData.totalElements / size);
  pageData.hasPrevious = pageData.page > 0;
  pageData.hasNext = pageData.page + 1 < pageData.totalPages;
};

const mergeCommentNode = (target: CommentTreeResponse, source: CommentTreeResponse) => {
  target.userId = source.userId;
  target.authorName = source.authorName;
  target.content = source.content;
  target.depth = source.depth;
  target.parentCommentId = source.parentCommentId;
  target.rootCommentId = source.rootCommentId;
  target.createdAt = source.createdAt;
  target.updatedAt = source.updatedAt;
  target.deletedAt = source.deletedAt;
  target.likeCount = source.likeCount;
  target.dislikeCount = source.dislikeCount;
  target.myReaction = source.myReaction;
};

const updateArticleCommentCount = (action: CommentDeltaAction) => {
  if (!article.value) {
    return;
  }
  if (action === 'CREATED') {
    article.value.commentCount += 1;
    return;
  }
  if (action === 'DELETED') {
    article.value.commentCount = Math.max(0, article.value.commentCount - 1);
  }
};

const applyCommentDelta = (payload: CommentDeltaPayload) => {
  if (!comments.value || !payload.action) {
    return;
  }

  const action = payload.action;
  const snapshot = payload.comment;
  const resolvedCommentId = Number(payload.commentId ?? snapshot?.id);
  if (!Number.isFinite(resolvedCommentId)) {
    return;
  }

  if (action === 'CREATED') {
    if (!snapshot) {
      return;
    }
    updateArticleCommentCount(action);
    if (snapshot.parentCommentId === null) {
      if (comments.value.items.some((item) => item.id === snapshot.id)) {
        return;
      }
      comments.value.totalElements += 1;
      recalculateCommentPageMeta();
      const isLastPage = !comments.value.hasNext;
      const hasRoom = comments.value.items.length < comments.value.size;
      if (isLastPage && hasRoom) {
        comments.value.items.push(snapshot);
      }
      return;
    }
    const parent = findCommentNode(comments.value.items, snapshot.parentCommentId);
    if (!parent) {
      return;
    }
    if (!parent.children.some((child) => child.id === snapshot.id)) {
      parent.children.push(snapshot);
    }
    return;
  }

  if (action === 'UPDATED') {
    if (!snapshot) {
      return;
    }
    const target = findCommentNode(comments.value.items, resolvedCommentId);
    if (target) {
      mergeCommentNode(target, snapshot);
    }
    return;
  }

  if (action === 'DELETED') {
    updateArticleCommentCount(action);
    const target = findCommentNode(comments.value.items, resolvedCommentId);
    if (target && snapshot) {
      mergeCommentNode(target, snapshot);
    }
  }
};

const handleRealtimeCommentChanged = (event: RealtimeEventEnvelope<Record<string, unknown>>) => {
  const payload = event.data as CommentDeltaPayload;
  if (!payload || !article.value) {
    return;
  }
  const targetArticleId = Number(payload.articleId);
  if (!Number.isFinite(targetArticleId) || targetArticleId !== article.value.id) {
    return;
  }

  const syncVersion = Number(payload.syncVersion);
  if (!Number.isFinite(syncVersion) || syncVersion <= 0) {
    scheduleRealtimeCommentSync();
    return;
  }

  if (lastCommentSyncVersion.value === null) {
    scheduleRealtimeCommentSync();
    return;
  }

  if (syncVersion <= lastCommentSyncVersion.value) {
    return;
  }

  if (syncVersion !== lastCommentSyncVersion.value + 1) {
    scheduleRealtimeCommentSync();
    return;
  }

  applyCommentDelta(payload);
  lastCommentSyncVersion.value = syncVersion;
};

const handleRealtimeReactionChanged = (event: RealtimeEventEnvelope<Record<string, unknown>>) => {
  const payload = event.data;
  if (!payload || !article.value) {
    return;
  }
  const targetType = payload.targetType;
  if (targetType === 'ARTICLE') {
    const targetArticleId = Number(payload.articleId);
    if (targetArticleId !== article.value.id) {
      return;
    }
    if (typeof payload.likeCount === 'number') {
      article.value.likeCount = payload.likeCount;
    }
    if (typeof payload.dislikeCount === 'number') {
      article.value.dislikeCount = payload.dislikeCount;
    }
    return;
  }
  if (targetType === 'COMMENT') {
    const targetCommentId = Number(payload.commentId);
    if (!Number.isFinite(targetCommentId) || !comments.value) {
      return;
    }
    const target = findCommentNode(comments.value.items, targetCommentId);
    if (!target) {
      return;
    }
    if (typeof payload.likeCount === 'number') {
      target.likeCount = payload.likeCount;
    }
    if (typeof payload.dislikeCount === 'number') {
      target.dislikeCount = payload.dislikeCount;
    }
    if (typeof payload.myReaction === 'number') {
      target.myReaction = payload.myReaction;
    }
  }
};

const startRealtimeSubscription = (boardId: number) => {
  closeRealtimeSubscription();
  realtimeSubscription.value = subscribeBoardRealtime(boardId, {
    onCommentChanged: (event) => {
      handleRealtimeCommentChanged(event);
    },
    onReactionChanged: (event) => {
      handleRealtimeReactionChanged(event);
    },
    onError: () => {
      // 재연결은 EventSource 기본 동작에 위임한다.
    },
  });
};

const submitComment = async () => {
  if (!article.value || !newComment.value.trim()) {
    return;
  }
  isCommentSubmitting.value = true;
  try {
    await createComment(article.value.id, newComment.value.trim());
    newComment.value = '';
    await nextTick();
    resizeCommentTextarea();
    await refreshComments();
  } catch (error) {
    commentError.value = error instanceof ApiError ? error.message : '댓글 작성에 실패했습니다.';
  } finally {
    isCommentSubmitting.value = false;
  }
};

const resizeTextareaElement = (textarea: HTMLTextAreaElement | null) => {
  if (!textarea) {
    return;
  }
  textarea.style.height = 'auto';
  const nextHeight = Math.min(textarea.scrollHeight, COMMENT_TEXTAREA_MAX_HEIGHT);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > COMMENT_TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
};

const resizeCommentTextarea = () => {
  resizeTextareaElement(commentTextareaRef.value);
};

const handleCommentInput = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }
  resizeTextareaElement(target);
};

const handleCommentInputKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) {
    return;
  }
  event.preventDefault();
  if (isCommentSubmitting.value || !newComment.value.trim()) {
    return;
  }
  void submitComment();
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

const handleBookmark = async () => {
  if (!article.value || isBookmarkLoading.value || !isAuthenticated.value) {
    return;
  }
  isBookmarkLoading.value = true;
  try {
    const response = article.value.bookmarked ? await unbookmarkArticle(article.value.id) : await bookmarkArticle(article.value.id);
    article.value.bookmarked = response.bookmarked;
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : '북마크 처리에 실패했습니다.';
  } finally {
    isBookmarkLoading.value = false;
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
  articleDetailScrollContainer.value = appShellRef.value?.getMainElement() ?? null;
  await loadArticle();
  await loadProfile();
  const targetId = parseCommentId();
  if (targetId) {
    await focusComment(targetId);
  } else {
    await refreshComments();
  }
});

watch(
  () => sanitizedContent.value,
  async () => {
    await refreshRenderedContent();
    void renderArticleMermaid();
  },
);

watch(
  () => isAuthenticated.value,
  async () => {
    await refreshRenderedContent();
    void renderArticleMermaid();
  },
);

watch(
  () => route.params.articleId,
  async () => {
    lastCommentSyncVersion.value = null;
    await loadArticle();
    const targetId = parseCommentId();
    if (targetId) {
      await focusComment(targetId);
    } else {
      await refreshComments();
    }
  },
);

watch(
  () => route.query.commentId,
  async () => {
    const targetId = parseCommentId();
    if (!targetId) {
      focusCommentId.value = null;
      return;
    }
    await focusComment(targetId);
  },
);

watch(
  () => article.value?.board?.id,
  (boardId) => {
    if (!boardId) {
      closeRealtimeSubscription();
      lastCommentSyncVersion.value = null;
      return;
    }
    startRealtimeSubscription(boardId);
  },
);

onUnmounted(() => {
  closeRealtimeSubscription();
  clearRealtimeRefreshTimer();
  clearFocusTimer();
});
</script>

<template>
  <AppShell ref="appShellRef">
    <PageContainer width="auto">
      <div>
        <BoardHeaderCard
          :title="article?.board?.boardName ?? '커뮤니티'"
          :description="article?.board?.description ?? '설명이 없습니다.'"
          :image-file="article?.board?.boardImage ?? null"
          :link-to="article?.board?.slug ? boardLinkWithFilter : undefined"
        >
          <template #actions>
            <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <button type="button" class="ui-chip-button ui-chip-button-muted" @click="goBoard">게시판으로</button>
              <button
                v-if="isAuthor"
                type="button"
                class="ui-chip-button border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                @click="goEdit"
              >
                수정
              </button>
              <button
                v-if="isAuthor"
                type="button"
                class="ui-chip-button border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
                @click="openDeleteModal"
              >
                삭제
              </button>
            </div>
          </template>
        </BoardHeaderCard>

        <div v-if="errorMessage" class="ui-state ui-state-danger mt-6">
          {{ errorMessage }}
        </div>

        <div v-else class="mt-6 space-y-6">
          <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <article class="ui-panel overflow-hidden">
              <div class="border-b border-slate-200/80 px-5 py-5 sm:px-6 dark:border-slate-800/80">
                <div class="flex flex-wrap items-center gap-2">
                  <span v-if="article?.notice" class="ui-badge ui-badge-warning">공지</span>
                  <span v-if="articleCategoryLabel" class="ui-badge ui-badge-success">{{ articleCategoryLabel }}</span>
                  <span class="ui-badge ui-badge-muted">{{ articleVisibilityLabel }}</span>
                  <span class="ui-badge ui-badge-muted">댓글 {{ article?.commentCount ?? 0 }}</span>
                </div>
                <h1 class="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem] dark:text-slate-100">
                  {{ article?.title ?? '' }}
                </h1>
                <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{{ article?.authorName ?? '작성자' }}</span>
                  <span>조회 {{ article?.hit ?? 0 }}</span>
                  <span>{{ article?.createdAt ? formatDateTime(article.createdAt) : '' }}</span>
                  <span v-if="article?.updatedAt">수정 {{ formatDateTime(article.updatedAt) }}</span>
                </div>
              </div>

              <div class="px-5 py-5 sm:px-6">
                <div v-if="article?.content" ref="articleContentRef" class="ui-content max-w-none" v-html="renderedContent"></div>
                <div v-else class="text-sm text-slate-500 dark:text-slate-400">본문이 없습니다.</div>
              </div>
            </article>

            <aside class="space-y-4">
              <section class="ui-panel p-4">
                <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Quick Actions</p>
                <div class="mt-3 flex flex-col gap-2">
                  <button type="button" class="ui-button-ghost h-10 px-4 text-sm" @click="goBoard">게시판으로</button>
                  <button v-if="isAuthor" type="button" class="ui-button-primary h-10 px-4 text-sm" @click="goEdit">수정</button>
                  <button v-if="isAuthor" type="button" class="ui-button-danger h-10 px-4 text-sm" @click="openDeleteModal">삭제</button>
                </div>
              </section>

              <section class="ui-panel p-4">
                <div class="flex items-center justify-between gap-2">
                  <div>
                    <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Reaction</p>
                    <h2 class="mt-1 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">반응과 보관</h2>
                  </div>
                  <span class="ui-badge" :class="isAuthenticated ? 'ui-badge-success' : 'ui-badge-muted'">
                    {{ isAuthenticated ? '사용 가능' : '로그인 필요' }}
                  </span>
                </div>
                <div class="mt-3 grid gap-2">
                  <button
                    type="button"
                    class="h-10 px-4 text-sm"
                    :class="article?.myReaction === 1 ? 'ui-button-primary' : 'ui-button-ghost'"
                    :disabled="!isAuthenticated || isReactionLoading"
                    @click="handleReaction(1)"
                  >
                    좋아요 {{ article?.likeCount ?? 0 }}
                  </button>
                  <button
                    type="button"
                    class="h-10 px-4 text-sm"
                    :class="article?.myReaction === -1 ? 'ui-button-danger' : 'ui-button-ghost'"
                    :disabled="!isAuthenticated || isReactionLoading"
                    @click="handleReaction(-1)"
                  >
                    싫어요 {{ article?.dislikeCount ?? 0 }}
                  </button>
                  <button
                    type="button"
                    class="h-10 px-4 text-sm"
                    :class="article?.bookmarked ? 'ui-button-primary' : 'ui-button-ghost'"
                    :disabled="!isAuthenticated || isBookmarkLoading"
                    @click="handleBookmark"
                  >
                    {{ article?.bookmarked ? '북마크됨' : '북마크' }}
                  </button>
                </div>
                <p v-if="!isAuthenticated" class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  로그인 후 반응과 북마크를 사용할 수 있습니다.
                </p>
              </section>

              <section class="ui-panel p-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Attachment</p>
                    <h2 class="mt-1 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">첨부파일 {{ attachments.length }}개</h2>
                  </div>
                  <button
                    type="button"
                    class="ui-button-ghost h-10 px-4 text-xs"
                    :aria-expanded="isAttachmentExpanded ? 'true' : 'false'"
                    :aria-controls="attachmentSectionId"
                    @click="isAttachmentExpanded = !isAttachmentExpanded"
                  >
                    {{ isAttachmentExpanded ? '접기' : '펼치기' }}
                  </button>
                </div>

                <button
                  type="button"
                  class="ui-button-primary mt-3 h-10 w-full px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="attachments.length === 0 || isDownloadingAllAttachments"
                  @click="downloadAllAttachments"
                >
                  {{ isDownloadingAllAttachments ? '다운로드 중...' : '전체 다운로드' }}
                </button>

                <div v-show="isAttachmentExpanded" :id="attachmentSectionId" class="mt-3">
                  <div v-if="attachments.length === 0" class="ui-state ui-state-empty px-4 py-6">첨부파일이 없습니다.</div>
                  <div v-else class="space-y-2">
                    <div v-for="file in attachments" :key="file.id" class="ui-list-row">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{{ file.fileName }}</p>
                          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ file.mimeType }}</p>
                        </div>
                        <span class="ui-badge ui-badge-muted">{{ formatFileSize(file.fileSize) }}</span>
                      </div>
                      <button type="button" class="ui-button-ghost h-9 self-end px-4 text-xs" @click="downloadAttachment(file)">다운로드</button>
                    </div>
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <section class="ui-panel overflow-hidden">
            <div class="border-b border-slate-200/80 px-5 py-4 sm:px-6 dark:border-slate-800/80">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Comment</p>
                  <h2 class="mt-1 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">댓글</h2>
                </div>
                <span class="ui-badge ui-badge-muted">총 {{ article?.commentCount ?? 0 }}개</span>
              </div>
            </div>

            <div class="px-5 py-5 sm:px-6">
              <div v-if="isAuthenticated" class="ui-sub-panel p-4">
                <textarea
                  ref="commentTextareaRef"
                  v-model="newComment"
                  rows="3"
                  placeholder="댓글을 입력하세요"
                  class="ui-textarea"
                  @focus="resizeCommentTextarea"
                  @input="handleCommentInput"
                  @keydown="handleCommentInputKeydown"
                ></textarea>
                <div class="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="ui-button-primary h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="isCommentSubmitting || !newComment.trim()"
                    @click="submitComment"
                  >
                    댓글 등록
                  </button>
                </div>
              </div>

              <div v-else class="ui-state ui-state-empty px-4 py-6">댓글 작성은 로그인 후 이용할 수 있습니다.</div>

              <div v-if="commentError" class="ui-state ui-state-danger mt-4">
                {{ commentError }}
              </div>

              <div v-if="comments && comments.items.length === 0" class="ui-state ui-state-empty mt-4">아직 댓글이 없습니다.</div>

              <div v-else-if="comments" class="mt-4">
                <CommentList
                  :comments="comments.items"
                  :current-user-id="currentUserId"
                  :article-author-id="article?.userId ?? null"
                  :is-authenticated="isAuthenticated"
                  :focus-comment-id="focusCommentId"
                  @reply="handleReply"
                  @update="handleUpdate"
                  @delete="handleDelete"
                  @reaction="handleCommentReaction"
                />
              </div>

              <div v-if="comments && comments.totalPages > 1" class="ui-toolbar mt-4 justify-between text-xs text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="!comments.hasPrevious || isCommentLoading"
                  @click="handleCommentPage(commentPage - 1)"
                >
                  이전
                </button>
                <span>페이지 {{ commentPage + 1 }} / {{ comments.totalPages }}</span>
                <button
                  type="button"
                  class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="!comments.hasNext || isCommentLoading"
                  @click="handleCommentPage(commentPage + 1)"
                >
                  다음
                </button>
              </div>

              <div v-if="isCommentLoading" class="mt-3 text-xs text-slate-500">댓글을 불러오는 중입니다...</div>
            </div>
          </section>

          <section class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Related Feed</p>
                <h2 class="mt-1 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">같은 게시판의 다른 글</h2>
              </div>
              <span class="ui-badge ui-badge-muted">{{ article?.board?.boardName ?? '커뮤니티' }}</span>
            </div>
            <BoardArticlePanel :board-id="article?.board?.id ?? null" :board-slug="article?.board?.slug ?? ''" @select="goBoardArticle" />
          </section>
        </div>

        <div v-if="isLoading" class="mt-6 text-sm text-slate-500 dark:text-slate-400">게시글을 불러오는 중입니다...</div>
      </div>
    </PageContainer>

    <ConfirmModal
      :open="isDeleteModalOpen"
      title="게시글 삭제"
      description="삭제한 게시글은 복구할 수 없습니다. 계속 진행하시겠어요?"
      confirm-label="삭제"
      confirm-variant="danger"
      :confirm-disabled="isDeleting"
      :cancel-disabled="isDeleting"
      @close="closeDeleteModal"
      @confirm="confirmDelete"
    >
      <p v-if="deleteError" class="ui-state ui-state-danger mt-4 px-4 py-2 text-sm font-semibold" role="alert">
        {{ deleteError }}
      </p>
    </ConfirmModal>
  </AppShell>
</template>
