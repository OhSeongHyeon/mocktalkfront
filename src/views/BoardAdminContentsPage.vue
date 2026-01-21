<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import BoardAdminNav from '../components/BoardAdminNav.vue';
import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { getBoardBySlug } from '../services/boards';
import type { BoardDetailResponse, BoardMemberStatus } from '../services/boards';
import {
  deleteBoardAdminArticle,
  deleteBoardAdminComment,
  getBoardAdminArticles,
  getBoardAdminComments,
  updateBoardAdminArticleNotice,
} from '../services/boardContents';
import type { BoardAdminArticleItemResponse, BoardAdminCommentItemResponse } from '../services/boardContents';
import { isAdmin } from '../stores/auth';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

type ContentType = 'ARTICLE' | 'COMMENT';
type ReportedFilter = 'ALL' | 'REPORTED' | 'UNREPORTED';
type NoticeFilter = 'ALL' | 'NOTICE' | 'NORMAL';

const route = useRoute();
const isMobileMenuOpen = ref(false);
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

const isAllowedMember = (memberStatus: BoardMemberStatus | null) => memberStatus === 'OWNER' || memberStatus === 'MODERATOR';

const hasPermission = computed(() => isAdmin.value || (board.value ? isAllowedMember(board.value.memberStatus) : false));

const boardSlug = computed(() => String(route.params.slug ?? ''));
const boardName = computed(() => board.value?.boardName ?? '게시판');

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
      boardError.value = '게시판 관리자 권한이 없습니다.';
    }
  } catch (error) {
    boardError.value = error instanceof ApiError ? error.message : '게시판 정보를 불러오지 못했습니다.';
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
    listError.value = error instanceof ApiError ? error.message : '콘텐츠 목록을 불러오지 못했습니다.';
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
    listError.value = error instanceof ApiError ? error.message : '공지 변경에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};

const deleteArticle = async (article: BoardAdminArticleItemResponse) => {
  if (!board.value) {
    return;
  }
  if (!window.confirm('게시글을 삭제할까요?')) {
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    await deleteBoardAdminArticle(board.value.id, article.id);
    await loadContents();
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '게시글 삭제에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};

const deleteComment = async (comment: BoardAdminCommentItemResponse) => {
  if (!board.value) {
    return;
  }
  if (!window.confirm('댓글을 삭제할까요?')) {
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    await deleteBoardAdminComment(board.value.id, comment.id);
    await loadContents();
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '댓글 삭제에 실패했습니다.';
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
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-6xl space-y-6">
          <BoardAdminNav v-if="board && hasPermission" :slug="board.slug" :board-name="boardName" active="contents" />

          <div
            v-if="boardError"
            class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ boardError }}
          </div>

          <div v-if="board && hasPermission" class="space-y-6">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">콘텐츠 관리</h1>
                <p class="text-sm text-slate-500 dark:text-slate-400">게시글과 댓글을 관리합니다.</p>
              </div>
              <div
                class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <button
                  type="button"
                  class="rounded-full px-4 py-2 transition"
                  :class="contentType === 'ARTICLE' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500'"
                  @click="switchContentType('ARTICLE')"
                >
                  게시글
                </button>
                <button
                  type="button"
                  class="rounded-full px-4 py-2 transition"
                  :class="contentType === 'COMMENT' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500'"
                  @click="switchContentType('COMMENT')"
                >
                  댓글
                </button>
              </div>
            </div>

            <div class="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
              <div class="flex flex-wrap items-center gap-3">
                <select
                  v-model="reportedFilter"
                  class="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="ALL">전체</option>
                  <option value="REPORTED">신고 있음</option>
                  <option value="UNREPORTED">신고 없음</option>
                </select>
                <select
                  v-if="contentType === 'ARTICLE'"
                  v-model="noticeFilter"
                  class="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="ALL">전체</option>
                  <option value="NOTICE">공지</option>
                  <option value="NORMAL">일반</option>
                </select>
                <input
                  v-model="authorId"
                  type="number"
                  class="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  placeholder="작성자 ID"
                />
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
                  @click="applyFilters"
                >
                  적용
                </button>
              </div>
            </div>

            <div
              v-if="listError"
              class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {{ listError }}
            </div>

            <section class="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">목록</h2>
                <span class="text-xs text-slate-400"> {{ contentType === 'ARTICLE' ? articles.length : comments.length }}건 </span>
              </div>

              <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
                불러오는 중...
              </div>

              <div v-else class="mt-4 flex flex-col gap-3">
                <template v-if="contentType === 'ARTICLE'">
                  <div
                    v-for="article in articles"
                    :key="article.id"
                    class="rounded-2xl border border-slate-200 px-4 py-3 text-left transition dark:border-slate-800"
                  >
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          <span>#{{ article.id }}</span>
                          <span class="text-xs text-slate-400">{{ article.authorName }}</span>
                        </div>
                        <p class="mt-1 text-sm text-slate-700 dark:text-slate-200">{{ article.title }}</p>
                        <p class="mt-1 text-xs text-slate-400">작성 {{ formatDate(article.createdAt) }} · 삭제 {{ formatDate(article.deletedAt) }}</p>
                      </div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span
                          v-if="article.notice"
                          class="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200"
                        >
                          공지
                        </span>
                        <span
                          v-if="article.reported"
                          class="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
                        >
                          신고
                        </span>
                        <span
                          v-if="article.deletedAt"
                          class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          삭제됨
                        </span>
                      </div>
                    </div>
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                        :disabled="isSubmitting"
                        @click="toggleNotice(article)"
                      >
                        {{ article.notice ? '공지 해제' : '공지 설정' }}
                      </button>
                      <button
                        type="button"
                        class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:opacity-40 dark:border-rose-700 dark:text-rose-300"
                        :disabled="isSubmitting"
                        @click="deleteArticle(article)"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </template>

                <template v-if="contentType === 'COMMENT'">
                  <div
                    v-for="comment in comments"
                    :key="comment.id"
                    class="rounded-2xl border border-slate-200 px-4 py-3 text-left transition dark:border-slate-800"
                  >
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          <span>#{{ comment.id }}</span>
                          <span class="text-xs text-slate-400">{{ comment.authorName }}</span>
                        </div>
                        <p class="mt-1 text-xs text-slate-400">게시글: {{ comment.articleTitle }} (#{{ comment.articleId }})</p>
                        <p class="mt-2 text-sm text-slate-700 dark:text-slate-200">{{ comment.content }}</p>
                        <p class="mt-1 text-xs text-slate-400">작성 {{ formatDate(comment.createdAt) }} · 삭제 {{ formatDate(comment.deletedAt) }}</p>
                      </div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span
                          v-if="comment.reported"
                          class="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
                        >
                          신고
                        </span>
                        <span
                          v-if="comment.deletedAt"
                          class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          삭제됨
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
                        삭제
                      </button>
                    </div>
                  </div>
                </template>

                <div
                  v-if="contentType === 'ARTICLE' && articles.length === 0"
                  class="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
                >
                  조건에 해당하는 게시글이 없습니다.
                </div>
                <div
                  v-if="contentType === 'COMMENT' && comments.length === 0"
                  class="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
                >
                  조건에 해당하는 댓글이 없습니다.
                </div>
              </div>

              <div class="mt-4 flex items-center justify-between text-sm text-slate-500">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300"
                  :disabled="page === 0"
                  @click="movePage(-1)"
                >
                  이전
                </button>
                <span>{{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300"
                  :disabled="page + 1 >= totalPages"
                  @click="movePage(1)"
                >
                  다음
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
