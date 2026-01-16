<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ArticleEditor from '../components/ArticleEditor.vue';
import BoardHeaderCard from '../components/BoardHeaderCard.vue';
import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { resolveFileUrl } from '../lib/files';
import type { ArticleCreateRequest } from '../services/articles';
import { createArticle } from '../services/articles';
import type { BoardDetailResponse } from '../services/boards';
import { getBoardBySlug } from '../services/boards';
import type { UserProfileResponse } from '../services/mypage';
import { getMyProfile } from '../services/mypage';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

const route = useRoute();
const router = useRouter();
const slug = computed(() => String(route.params.slug ?? ''));

const isMobileMenuOpen = ref(false);
const board = ref<BoardDetailResponse | null>(null);
const profile = ref<UserProfileResponse | null>(null);

const title = ref('');
const content = ref('');
const visibility = ref('PUBLIC');
const notice = ref(false);

const errorMessage = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);

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

const visibilityOptions = [
  { value: 'PUBLIC', label: '전체 공개' },
  { value: 'MEMBERS', label: '로그인 사용자' },
  { value: 'MODERATORS', label: '운영진' },
  { value: 'ADMINS', label: '사이트 관리자' },
];

const canUseNotice = computed(() => {
  const role = board.value?.memberStatus;
  return role === 'OWNER' || role === 'MODERATOR';
});

const canWrite = computed(() => {
  const role = board.value?.memberStatus;
  if (role === 'BANNED' || role === 'PENDING') {
    return false;
  }
  if (!board.value) {
    return false;
  }
  if (board.value.visibility === 'PRIVATE' || board.value.visibility === 'UNLISTED') {
    return role === 'OWNER' || role === 'MODERATOR';
  }
  return true;
});

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

const isInvalid = computed(() => {
  if (!title.value.trim()) {
    return true;
  }
  if (!stripHtml(content.value)) {
    return true;
  }
  return false;
});

const loadBoard = async () => {
  if (!slug.value) {
    errorMessage.value = '게시판 정보가 올바르지 않습니다.';
    return;
  }
  isLoading.value = true;
  errorMessage.value = '';
  try {
    board.value = await getBoardBySlug(slug.value);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      errorMessage.value = '게시판을 찾을 수 없습니다.';
      return;
    }
    if (error instanceof ApiError && error.status === 403) {
      errorMessage.value = '게시판 접근 권한이 없습니다.';
      return;
    }
    errorMessage.value = error instanceof ApiError ? error.message : '게시판을 불러오지 못했습니다.';
  } finally {
    isLoading.value = false;
  }
};

const loadProfile = async () => {
  try {
    profile.value = await getMyProfile();
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : '사용자 정보를 불러오지 못했습니다.';
  }
};

const submit = async () => {
  if (!board.value || !profile.value) {
    errorMessage.value = '게시글 작성에 필요한 정보를 불러오지 못했습니다.';
    return;
  }
  if (!canWrite.value) {
    errorMessage.value = '게시글 작성 권한이 없습니다.';
    return;
  }
  if (isInvalid.value) {
    errorMessage.value = '제목과 본문을 입력해주세요.';
    return;
  }
  isSubmitting.value = true;
  errorMessage.value = '';
  const payload: ArticleCreateRequest = {
    boardId: board.value.id,
    userId: profile.value.userId,
    visibility: visibility.value,
    title: title.value.trim(),
    content: content.value,
    notice: canUseNotice.value ? notice.value : false,
  };
  try {
    const response = await createArticle(payload);
    router.push(`/b/${board.value.slug}/articles/${response.id}`);
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : '게시글 저장에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};

const cancel = () => {
  if (!board.value) {
    router.push('/');
    return;
  }
  router.push(`/b/${board.value.slug}`);
};

onMounted(async () => {
  await loadBoard();
  await loadProfile();
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-4xl">
          <BoardHeaderCard
            :title="board?.boardName ?? '커뮤니티'"
            :description="board?.description ?? '설명이 없습니다.'"
            :image-url="boardImageUrl"
          />

          <div
            v-if="errorMessage"
            class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ errorMessage }}
          </div>

          <div v-if="isLoading" class="mt-6 text-sm text-slate-500">게시판 정보를 불러오는 중입니다...</div>

          <div v-else class="mt-6 space-y-6">
            <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div class="flex flex-col gap-4">
                <label class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  제목
                  <input
                    v-model="title"
                    type="text"
                    class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="제목을 입력하세요"
                  />
                </label>

                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    공개 범위
                    <select
                      v-model="visibility"
                      class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option v-for="option in visibilityOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                  </label>

                  <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <input
                      v-model="notice"
                      type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 disabled:opacity-50"
                      :disabled="!canUseNotice"
                    />
                    공지글로 등록
                  </label>
                </div>
              </div>
            </section>

            <section>
              <ArticleEditor v-model="content" placeholder="본문을 입력하세요." />
            </section>

            <div class="flex flex-wrap items-center gap-3">
              <button
                type="button"
                class="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isSubmitting || isInvalid"
                @click="submit"
              >
                저장
              </button>
              <button
                type="button"
                class="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
                @click="cancel"
              >
                취소
              </button>
              <span v-if="!canWrite" class="text-xs text-rose-500"> 게시글 작성 권한이 없습니다. </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
