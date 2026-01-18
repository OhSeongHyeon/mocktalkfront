<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import BoardHeaderCard from '../components/BoardHeaderCard.vue';
import CommentList from '../components/CommentList.vue';
import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { resolveFileUrl } from '../lib/files';
import { sanitizeHtml } from '../lib/sanitize';
import type { ArticleDetailResponse, FileResponse } from '../services/articles';
import { getArticleDetail } from '../services/articles';
import type { CommentPageResponse, CommentTreeResponse } from '../services/comments';
import { createComment, createReply, deleteComment, getArticleComments, updateComment } from '../services/comments';
import type { UserProfileResponse } from '../services/mypage';
import { getMyProfile } from '../services/mypage';
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
const newComment = ref('');

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

const goEdit = () => {
  if (!article.value) {
    return;
  }
  const slug = article.value.board?.slug ?? String(route.params.slug ?? '');
  router.push(`/b/${slug}/articles/${article.value.id}/edit`);
};

const resolveAttachmentUrl = (file: FileResponse) => resolveFileUrl(file.storageKey);

const loadComments = async (reset = false) => {
  if (!Number.isFinite(articleId.value)) {
    return;
  }
  commentError.value = '';
  isCommentLoading.value = true;
  try {
    const page = reset ? 0 : commentPage.value;
    const response = await getArticleComments(articleId.value, page, 10);
    if (reset || !comments.value) {
      comments.value = response;
    } else {
      comments.value = {
        ...response,
        items: [...comments.value.items, ...response.items],
      };
    }
    commentPage.value = response.page + 1;
  } catch (error) {
    commentError.value = error instanceof ApiError ? error.message : '댓글을 불러오지 못했습니다.';
  } finally {
    isCommentLoading.value = false;
  }
};

const refreshComments = async () => {
  commentPage.value = 0;
  await loadComments(true);
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

const loadMoreComments = async () => {
  if (!comments.value || !comments.value.hasNext) {
    return;
  }
  await loadComments(false);
};

onMounted(async () => {
  await loadArticle();
  await loadProfile();
  await refreshComments();
});

watch(
  () => route.params.articleId,
  () => {
    loadArticle();
    refreshComments();
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
                  :is-authenticated="isAuthenticated"
                  @reply="handleReply"
                  @update="handleUpdate"
                  @delete="handleDelete"
                />
              </div>

              <div v-if="comments?.hasNext" class="mt-4 flex justify-center">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300"
                  :disabled="isCommentLoading"
                  @click="loadMoreComments"
                >
                  더 보기
                </button>
              </div>

              <div v-if="isCommentLoading" class="mt-3 text-xs text-slate-500">댓글을 불러오는 중입니다...</div>
            </section>
          </div>

          <div v-if="isLoading" class="mt-6 text-sm text-slate-500">게시글을 불러오는 중입니다...</div>
        </div>
      </main>
    </div>
  </div>
</template>
