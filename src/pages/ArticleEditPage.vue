<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ArticleUpsertForm from '../widgets/article/ArticleUpsertForm.vue';
import { validateAttachmentFile } from '../entities/file/lib/attachmentPolicy';
import ArticleUpsertPageLayout from '../widgets/article/ArticleUpsertPageLayout.vue';
import { ApiError } from '../shared/lib/http/api';
import { extractFileIdsFromContent } from '../features/editor/lib/contentFiles';
import { resolveImageUrl } from '../shared/lib/files';
import type { ArticleDetailResponse, ArticleUpdateRequest } from '../entities/article';
import { getArticleDetail, updateArticle } from '../entities/article';
import type { BoardCategoryResponse } from '../entities/board';
import { getBoardCategories } from '../entities/board';
import type { BoardDetailResponse } from '../entities/board';
import { getBoardBySlug } from '../entities/board';
import type { UserProfileResponse } from '../entities/user';
import { getMyProfile } from '../entities/user';
import type { FileResponse } from '../entities/file';
import { uploadArticleAttachmentFile } from '../entities/file';
import { isAdmin } from '../stores/auth';

const route = useRoute();
const router = useRouter();

const articleId = computed(() => Number(route.params.articleId));
const slug = computed(() => String(route.params.slug ?? ''));

const article = ref<ArticleDetailResponse | null>(null);
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
const attachmentFiles = ref<FileResponse[]>([]);
const isAttachmentUploading = ref(false);
const attachmentErrorMessage = ref('');

const errorMessage = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);

const boardImageUrl = computed(() => resolveImageUrl(article.value?.board?.boardImage ?? null, 'medium'));

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

const isAuthor = computed(() => {
  if (!profile.value || !article.value) {
    return false;
  }
  return profile.value.userId === article.value.userId;
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

const loadCategories = async (boardId: number) => {
  if (!Number.isFinite(boardId) || boardId <= 0) {
    categories.value = [];
    isCategoryAccessDenied.value = false;
    return;
  }
  isCategoryLoading.value = true;
  categoryErrorMessage.value = '';
  isCategoryAccessDenied.value = false;
  try {
    categories.value = await getBoardCategories(boardId);
  } catch (error) {
    categories.value = [];
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      isCategoryAccessDenied.value = true;
      return;
    }
    categoryErrorMessage.value = error instanceof ApiError ? error.message : '카테고리 목록을 불러오지 못했습니다.';
  } finally {
    isCategoryLoading.value = false;
  }
};

const loadArticle = async () => {
  categories.value = [];
  selectedCategoryId.value = null;
  categoryErrorMessage.value = '';
  isCategoryAccessDenied.value = false;
  attachmentFiles.value = [];
  isAttachmentUploading.value = false;
  attachmentErrorMessage.value = '';
  if (!Number.isFinite(articleId.value)) {
    errorMessage.value = '게시글 정보가 올바르지 않습니다.';
    return;
  }
  isLoading.value = true;
  errorMessage.value = '';
  try {
    article.value = await getArticleDetail(articleId.value);
    title.value = article.value.title;
    content.value = article.value.content;
    visibility.value = article.value.visibility;
    selectedCategoryId.value = article.value.categoryId ?? null;
    attachmentFiles.value = [...article.value.attachments];
    await loadBoard(article.value.board?.slug ?? '');
    await loadCategories(article.value.board?.id ?? 0);
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

const loadBoard = async (slugValue: string) => {
  if (!slugValue) {
    board.value = null;
    return;
  }
  try {
    board.value = await getBoardBySlug(slugValue);
  } catch {
    board.value = null;
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
  if (!article.value) {
    return;
  }
  if (!isAuthor.value) {
    errorMessage.value = '게시글 수정 권한이 없습니다.';
    return;
  }
  if (isInvalid.value) {
    errorMessage.value = '제목과 본문을 입력해주세요.';
    return;
  }
  isSubmitting.value = true;
  errorMessage.value = '';
  attachmentErrorMessage.value = '';
  const fileIds = Array.from(new Set([...extractFileIdsFromContent(content.value), ...attachmentFiles.value.map((file) => file.id)]));
  const payload: ArticleUpdateRequest = {
    categoryId: selectedCategoryId.value,
    visibility: visibility.value,
    title: title.value.trim(),
    content: content.value,
    notice: article.value.notice,
    fileIds,
  };
  try {
    await updateArticle(article.value.id, payload);
    const boardSlug = article.value.board?.slug ?? slug.value;
    router.push(`/b/${boardSlug}/articles/${article.value.id}`);
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : '게시글 수정에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};

const cancel = () => {
  if (article.value?.board?.slug) {
    router.push(`/b/${article.value.board.slug}/articles/${article.value.id}`);
    return;
  }
  router.push('/');
};

const addAttachments = async (files: File[]) => {
  if (files.length === 0) {
    return;
  }
  isAttachmentUploading.value = true;
  attachmentErrorMessage.value = '';
  const failedMessages: string[] = [];
  try {
    for (const file of files) {
      const validationMessage = validateAttachmentFile(file);
      if (validationMessage) {
        failedMessages.push(`${file.name}: ${validationMessage}`);
        continue;
      }
      try {
        const uploaded = await uploadArticleAttachmentFile(file);
        if (attachmentFiles.value.some((existing) => existing.id === uploaded.id)) {
          continue;
        }
        attachmentFiles.value = [...attachmentFiles.value, uploaded];
      } catch (error) {
        const message = error instanceof ApiError ? error.message : '업로드 실패';
        failedMessages.push(`${file.name}: ${message}`);
      }
    }
  } finally {
    isAttachmentUploading.value = false;
  }
  if (failedMessages.length > 0) {
    attachmentErrorMessage.value = failedMessages[0] ?? '';
  }
};

const removeAttachment = (fileId: number) => {
  attachmentFiles.value = attachmentFiles.value.filter((file) => file.id !== fileId);
};

onMounted(async () => {
  await loadArticle();
  await loadProfile();
});

watch(
  () => route.params.articleId,
  () => {
    loadArticle();
  },
);
</script>

<template>
  <ArticleUpsertPageLayout
    :board-title="article?.board?.boardName ?? '커뮤니티'"
    :board-description="article?.board?.description ?? '설명이 없습니다.'"
    :board-image-url="boardImageUrl"
    :board-link-to="article?.board?.slug ? `/b/${article.board.slug}` : undefined"
    :error-message="errorMessage"
    :is-loading="isLoading"
    loading-message="게시글 정보를 불러오는 중입니다..."
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
      :attachments="attachmentFiles"
      :is-attachment-uploading="isAttachmentUploading"
      :attachment-error-message="attachmentErrorMessage"
      :is-submitting="isSubmitting"
      :is-invalid="isInvalid"
      :is-submit-blocked="isAttachmentUploading || !isAuthor"
      :submit-permission-message="
        !isAuthor ? '게시글 수정 권한이 없습니다.' : isAttachmentUploading ? '첨부파일 업로드가 완료될 때까지 기다려주세요.' : ''
      "
      @add-attachments="addAttachments"
      @remove-attachment="removeAttachment"
      @submit="submit"
      @cancel="cancel"
    />
  </ArticleUpsertPageLayout>
</template>
