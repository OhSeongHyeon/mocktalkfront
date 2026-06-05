<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import ArticleUpsertForm from '../widgets/article/ArticleUpsertForm.vue';
import { validateAttachmentFile } from '../entities/file/lib/attachmentPolicy';
import ArticleUpsertPageLayout from '../widgets/article/ArticleUpsertPageLayout.vue';
import { ApiError } from '../shared/lib/http/api';
import { extractFileIdsFromContent } from '../features/editor/lib/contentFiles';
import { hasMeaningfulArticleContent } from '../features/editor/lib/articleContent';
import { mergeManagedMarkdownFrontmatter, stripMarkdownFrontmatter } from '../features/editor/lib/markdownFrontmatter';
import type { MarkdownImportMetadata } from '../features/editor/lib/markdownImport';
import type { ArticleContentFormat, ArticleEditorDetailResponse, ArticleUpdateRequest } from '../entities/article';
import { getArticleEditorDetail, updateArticle } from '../entities/article';
import type { BoardCategoryResponse } from '../entities/board';
import { getBoardCategories } from '../entities/board';
import type { BoardDetailResponse } from '../entities/board';
import { getBoardBySlug } from '../entities/board';
import type { UserProfileResponse } from '../entities/user';
import { getMyProfile } from '../entities/user';
import type { FileResponse } from '../entities/file';
import { uploadArticleAttachmentFile } from '../entities/file';
import ConfirmModal from '../shared/ui/ConfirmModal.vue';
import { createArticleUpsertSnapshot, isArticleUpsertDirty, type ArticleUpsertFormState } from '../shared/lib/articleUpsertDirty';
import { useUnsavedChangesGuard } from '../shared/lib/useUnsavedChangesGuard';
import { useAuthStore } from '../stores/auth';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const articleId = computed(() => Number(route.params.articleId));
const slug = computed(() => String(route.params.slug ?? ''));
const authStore = useAuthStore();
const { isAdmin } = storeToRefs(authStore);

const article = ref<ArticleEditorDetailResponse | null>(null);
const board = ref<BoardDetailResponse | null>(null);
const profile = ref<UserProfileResponse | null>(null);

const title = ref('');
const contentSource = ref('');
const contentFormat = ref<ArticleContentFormat>('MARKDOWN');
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
const baselineFormState = ref<ArticleUpsertFormState | null>(null);
const storedMarkdownSource = ref('');

const isBoardAdmin = computed(() => {
  const role = board.value?.memberStatus;
  return role === 'OWNER' || role === 'MODERATOR';
});
const canManageCategories = computed(() => isAdmin.value || isBoardAdmin.value);
const selectedCategoryName = computed(() => {
  if (selectedCategoryId.value == null) {
    return undefined;
  }
  return categories.value.find((category) => category.id === selectedCategoryId.value)?.categoryName;
});

const visibilityOptions = computed(() => {
  const base = [
    { value: 'PUBLIC', label: t('article.visibility.upsert.PUBLIC') },
    { value: 'MEMBERS', label: t('article.visibility.upsert.MEMBERS') },
  ];
  if (isAdmin.value) {
    return [
      ...base,
      { value: 'MODERATORS', label: t('article.visibility.upsert.MODERATORS') },
      { value: 'ADMINS', label: t('article.visibility.upsert.ADMINS') },
    ];
  }
  if (isBoardAdmin.value) {
    return [...base, { value: 'MODERATORS', label: t('article.visibility.upsert.MODERATORS') }];
  }
  return base;
});

const isAuthor = computed(() => {
  if (!profile.value || !article.value) {
    return false;
  }
  return profile.value.userId === article.value.userId;
});

const isInvalid = computed(() => {
  if (!title.value.trim()) {
    return true;
  }
  if (!hasMeaningfulArticleContent(contentSource.value, contentFormat.value)) {
    return true;
  }
  return false;
});

const upsertFormState = computed(() => ({
  title: title.value,
  contentSource: contentSource.value,
  contentFormat: contentFormat.value,
  visibility: visibility.value,
  selectedCategoryId: selectedCategoryId.value,
  attachmentIds: attachmentFiles.value.map((file) => file.id),
}));

const isDirty = computed(() => {
  if (isLoading.value) {
    return false;
  }
  return isArticleUpsertDirty(upsertFormState.value, baselineFormState.value, 'edit');
});

const { allowLeaveWithoutConfirm, cancelLeave, confirmLeave, isLeaveModalOpen, requestLeave } = useUnsavedChangesGuard({
  isDirty,
});

const applyImportedCategory = (nextCategoryName?: string | null) => {
  if (!nextCategoryName) {
    return;
  }
  const normalizedCategoryName = nextCategoryName.trim().toLowerCase();
  const matchedCategory = categories.value.find((category) => category.categoryName.trim().toLowerCase() === normalizedCategoryName);
  if (!matchedCategory) {
    selectedCategoryId.value = null;
    return;
  }
  selectedCategoryId.value = matchedCategory.id;
};

const applyAllowedVisibility = (nextVisibility?: string | null) => {
  if (!nextVisibility) {
    return;
  }
  if (!visibilityOptions.value.some((option) => option.value === nextVisibility)) {
    return;
  }
  visibility.value = nextVisibility;
};

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
    categoryErrorMessage.value = error instanceof ApiError ? error.message : t('article.upsert.loadCategoriesFailed');
  } finally {
    isCategoryLoading.value = false;
  }
};

const loadArticle = async () => {
  categories.value = [];
  baselineFormState.value = null;
  selectedCategoryId.value = null;
  categoryErrorMessage.value = '';
  isCategoryAccessDenied.value = false;
  attachmentFiles.value = [];
  isAttachmentUploading.value = false;
  attachmentErrorMessage.value = '';
  if (!Number.isFinite(articleId.value)) {
    errorMessage.value = t('article.upsert.invalidArticle');
    return;
  }
  isLoading.value = true;
  errorMessage.value = '';
  try {
    article.value = await getArticleEditorDetail(articleId.value);
    title.value = article.value.title;
    storedMarkdownSource.value = article.value.contentSource;
    contentSource.value =
      article.value.contentFormat === 'MARKDOWN' ? stripMarkdownFrontmatter(article.value.contentSource) : article.value.contentSource;
    contentFormat.value = article.value.contentFormat;
    visibility.value = article.value.visibility;
    selectedCategoryId.value = article.value.categoryId ?? null;
    attachmentFiles.value = [...article.value.attachments];
    baselineFormState.value = createArticleUpsertSnapshot({
      title: title.value,
      contentSource: contentSource.value,
      contentFormat: contentFormat.value,
      visibility: visibility.value,
      selectedCategoryId: selectedCategoryId.value,
      attachmentIds: attachmentFiles.value.map((file) => file.id),
    });
    await loadBoard(article.value.board?.slug ?? '');
    await loadCategories(article.value.board?.id ?? 0);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      errorMessage.value = t('article.errors.notFound');
      return;
    }
    if (error instanceof ApiError && error.status === 403) {
      errorMessage.value = t('article.errors.forbidden');
      return;
    }
    errorMessage.value = error instanceof ApiError ? error.message : t('article.errors.loadFailed');
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
    errorMessage.value = error instanceof ApiError ? error.message : t('article.upsert.loadProfileFailed');
  }
};

const submit = async () => {
  if (!article.value) {
    return;
  }
  if (!isAuthor.value) {
    errorMessage.value = t('article.upsert.noEditPermission');
    return;
  }
  if (isInvalid.value) {
    errorMessage.value = t('article.upsert.requiredFields');
    return;
  }
  isSubmitting.value = true;
  errorMessage.value = '';
  attachmentErrorMessage.value = '';
  const fileIds = Array.from(new Set([...extractFileIdsFromContent(contentSource.value), ...attachmentFiles.value.map((file) => file.id)]));
  const normalizedTitle = title.value.trim();
  const normalizedContentSource =
    contentFormat.value === 'MARKDOWN'
      ? mergeManagedMarkdownFrontmatter(
          storedMarkdownSource.value,
          {
            title: normalizedTitle,
            boardSlug: article.value.board.slug,
            visibility: visibility.value,
            categoryName: selectedCategoryName.value,
          },
          { body: contentSource.value },
        )
      : contentSource.value;
  const payload: ArticleUpdateRequest = {
    categoryId: selectedCategoryId.value,
    visibility: visibility.value,
    title: normalizedTitle,
    contentSource: normalizedContentSource,
    contentFormat: contentFormat.value,
    notice: article.value.notice,
    fileIds,
  };
  try {
    await updateArticle(article.value.id, payload);
    const boardSlug = article.value.board?.slug ?? slug.value;
    allowLeaveWithoutConfirm();
    router.push(`/b/${boardSlug}/articles/${article.value.id}`);
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : t('article.upsert.updateFailed');
  } finally {
    isSubmitting.value = false;
  }
};

const cancel = () => {
  requestLeave(() => {
    if (article.value?.board?.slug) {
      router.push(`/b/${article.value.board.slug}/articles/${article.value.id}`);
      return;
    }
    router.push('/');
  });
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
        const message = error instanceof ApiError ? error.message : t('article.upsert.uploadFailed');
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

const applyImportedMetadata = (metadata: MarkdownImportMetadata) => {
  if (metadata.title) {
    title.value = metadata.title;
  }
  applyAllowedVisibility(metadata.visibility);
  applyImportedCategory(metadata.categoryName);
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
    :board-title="article?.board?.boardName ?? t('board.defaults.communityName')"
    :board-description="article?.board?.description ?? t('board.defaults.noDescription')"
    :board-image-file="article?.board?.boardImage ?? null"
    :board-link-to="article?.board?.slug ? `/b/${article.board.slug}` : undefined"
    :error-message="errorMessage"
    :is-loading="isLoading"
    :loading-message="t('article.upsert.loadingArticle')"
  >
    <ArticleUpsertForm
      v-model:title="title"
      v-model:content-source="contentSource"
      v-model:content-format="contentFormat"
      v-model:visibility="visibility"
      v-model:selected-category-id="selectedCategoryId"
      :board-slug="article?.board?.slug"
      :allow-board-slug-import="false"
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
      :submit-permission-message="!isAuthor ? t('article.upsert.noEditPermission') : isAttachmentUploading ? t('article.upsert.waitForUpload') : ''"
      @add-attachments="addAttachments"
      @remove-attachment="removeAttachment"
      @apply-import-metadata="applyImportedMetadata"
      @submit="submit"
      @cancel="cancel"
    />
  </ArticleUpsertPageLayout>

  <ConfirmModal
    :open="isLeaveModalOpen"
    :title="t('article.upsert.leaveConfirm.title')"
    :description="t('article.upsert.leaveConfirm.description')"
    :confirm-label="t('article.upsert.leaveConfirm.confirm')"
    :cancel-label="t('article.upsert.leaveConfirm.cancel')"
    confirm-variant="danger"
    @close="cancelLeave"
    @confirm="confirmLeave"
  />
</template>
