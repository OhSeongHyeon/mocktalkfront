<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ArticleUpsertForm from '../components/ArticleUpsertForm.vue';
import ArticleUpsertPageLayout from '../components/ArticleUpsertPageLayout.vue';
import { ApiError } from '../lib/api';
import { extractFileIdsFromContent } from '../lib/editor/contentFiles';
import { resolveImageUrl } from '../lib/files';
import type { ArticleCreateRequest } from '../services/articles';
import { createArticle } from '../services/articles';
import type { BoardCategoryResponse } from '../services/boardCategories';
import { getBoardCategories } from '../services/boardCategories';
import type { BoardDetailResponse } from '../services/boards';
import { getBoardBySlug } from '../services/boards';
import type { UserProfileResponse } from '../services/mypage';
import { getMyProfile } from '../services/mypage';
import { isAdmin } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const slug = computed(() => String(route.params.slug ?? ''));

const board = ref<BoardDetailResponse | null>(null);
const profile = ref<UserProfileResponse | null>(null);

const title = ref('');
const content = ref('');
const visibility = ref('PUBLIC');
const selectedCategoryId = ref<number | null>(null);
const categories = ref<BoardCategoryResponse[]>([]);
const isCategoryLoading = ref(false);
const categoryErrorMessage = ref('');
const isCategoryAccessDenied = ref(false);

const errorMessage = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);

const boardImageUrl = computed(() => resolveImageUrl(board.value?.boardImage ?? null, 'medium'));

const isBoardAdmin = computed(() => {
  const role = board.value?.memberStatus;
  return role === 'OWNER' || role === 'MODERATOR';
});
const canManageCategories = computed(() => isAdmin.value || isBoardAdmin.value);

const visibilityOptions = computed(() => {
  const base = [
    { value: 'PUBLIC', label: '전체 공개' },
    { value: 'MEMBERS', label: '로그인 사용자' },
  ];
  if (isAdmin.value) {
    return [...base, { value: 'MODERATORS', label: '운영진' }, { value: 'ADMINS', label: '사이트 관리자' }];
  }
  if (isBoardAdmin.value) {
    return [...base, { value: 'MODERATORS', label: '운영진' }];
  }
  return base;
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

const loadCategories = async () => {
  if (!board.value) {
    categories.value = [];
    selectedCategoryId.value = null;
    isCategoryAccessDenied.value = false;
    return;
  }
  isCategoryLoading.value = true;
  categoryErrorMessage.value = '';
  isCategoryAccessDenied.value = false;
  try {
    categories.value = await getBoardCategories(board.value.id);
  } catch (error) {
    categories.value = [];
    selectedCategoryId.value = null;
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      isCategoryAccessDenied.value = true;
      return;
    }
    categoryErrorMessage.value = error instanceof ApiError ? error.message : '카테고리 목록을 불러오지 못했습니다.';
  } finally {
    isCategoryLoading.value = false;
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
    categoryId: selectedCategoryId.value,
    visibility: visibility.value,
    title: title.value.trim(),
    content: content.value,
    notice: false,
    fileIds: extractFileIdsFromContent(content.value),
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
  await loadCategories();
  await loadProfile();
});
</script>

<template>
  <ArticleUpsertPageLayout
    :board-title="board?.boardName ?? '커뮤니티'"
    :board-description="board?.description ?? '설명이 없습니다.'"
    :board-image-url="boardImageUrl"
    :board-link-to="board ? `/b/${board.slug}` : undefined"
    :error-message="errorMessage"
    :is-loading="isLoading"
    loading-message="게시판 정보를 불러오는 중입니다..."
  >
    <ArticleUpsertForm
      v-model:title="title"
      v-model:content="content"
      v-model:visibility="visibility"
      v-model:selected-category-id="selectedCategoryId"
      :categories="categories"
      :visibility-options="visibilityOptions"
      :is-category-loading="isCategoryLoading"
      :is-category-access-denied="isCategoryAccessDenied"
      :category-error-message="categoryErrorMessage"
      :can-manage-categories="canManageCategories"
      :is-submitting="isSubmitting"
      :is-invalid="isInvalid"
      :is-submit-blocked="false"
      :submit-permission-message="!canWrite ? '게시글 작성 권한이 없습니다.' : ''"
      @submit="submit"
      @cancel="cancel"
    />
  </ArticleUpsertPageLayout>
</template>
