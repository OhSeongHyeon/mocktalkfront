<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import ArticleUpsertForm from '../widgets/article/ArticleUpsertForm.vue';
import { validateAttachmentFile } from '../entities/file/lib/attachmentPolicy';
import ArticleUpsertPageLayout from '../widgets/article/ArticleUpsertPageLayout.vue';
import { ApiError } from '../shared/lib/http/api';
import { canWriteArticle, resolveWriteUnavailableReason } from '../entities/board/lib/boardWritePolicy';
import { extractFileIdsFromContent } from '../features/editor/lib/contentFiles';
import { hasMeaningfulArticleContent } from '../features/editor/lib/articleContent';
import { mergeManagedMarkdownFrontmatter } from '../features/editor/lib/markdownFrontmatter';
import type { ArticleContentFormat, ArticleCreateRequest } from '../entities/article';
import { createArticle } from '../entities/article';
import type { MarkdownImportMetadata } from '../features/editor/lib/markdownImport';
import type { BoardCategoryResponse } from '../entities/board';
import { getBoardCategories } from '../entities/board';
import type { BoardDetailResponse } from '../entities/board';
import { getBoardBySlug } from '../entities/board';
import type { UserProfileResponse } from '../entities/user';
import { getMyProfile } from '../entities/user';
import type { FileResponse } from '../entities/file';
import { uploadArticleAttachmentFile } from '../entities/file';
import ConfirmModal from '../shared/ui/ConfirmModal.vue';
import { isArticleUpsertDirty } from '../shared/lib/articleUpsertDirty';
import { useUnsavedChangesGuard } from '../shared/lib/useUnsavedChangesGuard';
import { useAuthStore } from '../stores/auth';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const slug = computed(() => String(route.params.slug ?? ''));
const authStore = useAuthStore();
const { isAdmin, isAuthenticated } = storeToRefs(authStore);

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
const pendingImportedVisibility = ref<string | null>(null);
const pendingImportedCategoryName = ref<string | null>(null);

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

const canWrite = computed(() => {
  return canWriteArticle(board.value, isAuthenticated.value, isAdmin.value);
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
  return isArticleUpsertDirty(upsertFormState.value, null, 'create');
});

const { allowLeaveWithoutConfirm, cancelLeave, confirmLeave, isLeaveModalOpen, requestLeave } = useUnsavedChangesGuard({
  isDirty,
  shouldBypassRouteLeave: (to, from) => from.name === 'article-create' && to.name === 'article-create',
});

const applyAllowedVisibility = (nextVisibility?: string | null) => {
  const allowedValues = visibilityOptions.value.map((option) => option.value);
  if (nextVisibility && allowedValues.includes(nextVisibility)) {
    visibility.value = nextVisibility;
    return;
  }
  if (allowedValues.includes(visibility.value)) {
    return;
  }
  visibility.value = allowedValues[0] ?? 'PUBLIC';
};

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

const loadBoard = async (slugValue = slug.value) => {
  if (!slugValue) {
    errorMessage.value = t('article.upsert.invalidBoard');
    board.value = null;
    return;
  }
  isLoading.value = true;
  errorMessage.value = '';
  try {
    board.value = await getBoardBySlug(slugValue);
  } catch (error) {
    board.value = null;
    if (error instanceof ApiError && error.status === 404) {
      errorMessage.value = t('board.errors.notFound');
      return;
    }
    if (error instanceof ApiError && error.status === 403) {
      errorMessage.value = t('board.errors.forbidden');
      return;
    }
    errorMessage.value = error instanceof ApiError ? error.message : t('board.errors.loadFailed');
  } finally {
    isLoading.value = false;
  }
};

const loadProfile = async () => {
  try {
    profile.value = await getMyProfile();
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : t('article.upsert.loadProfileFailed');
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
    categoryErrorMessage.value = error instanceof ApiError ? error.message : t('article.upsert.loadCategoriesFailed');
  } finally {
    isCategoryLoading.value = false;
  }
};

const loadBoardContext = async (slugValue = slug.value) => {
  await loadBoard(slugValue);
  await loadCategories();
  applyAllowedVisibility(pendingImportedVisibility.value);
  applyImportedCategory(pendingImportedCategoryName.value);
  pendingImportedVisibility.value = null;
  pendingImportedCategoryName.value = null;
};

const applyImportedMetadata = async (metadata: MarkdownImportMetadata) => {
  if (metadata.title) {
    title.value = metadata.title;
  }

  if (metadata.boardSlug && metadata.boardSlug !== slug.value) {
    try {
      errorMessage.value = '';
      await getBoardBySlug(metadata.boardSlug);
      pendingImportedVisibility.value = metadata.visibility ?? null;
      pendingImportedCategoryName.value = metadata.categoryName ?? null;
      selectedCategoryId.value = null;
      await router.replace(`/b/${metadata.boardSlug}/articles/new`);
    } catch (error) {
      errorMessage.value = error instanceof ApiError ? error.message : t('article.upsert.importBoardFailed');
      pendingImportedVisibility.value = null;
      pendingImportedCategoryName.value = null;
    }
    return;
  }

  applyAllowedVisibility(metadata.visibility);
  applyImportedCategory(metadata.categoryName);
};

const submit = async () => {
  if (!board.value || !profile.value) {
    errorMessage.value = t('article.upsert.loadContextFailed');
    return;
  }
  if (!canWrite.value) {
    errorMessage.value = t('article.upsert.noWritePermission');
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
      ? mergeManagedMarkdownFrontmatter(contentSource.value, {
          title: normalizedTitle,
          boardSlug: board.value.slug,
          visibility: visibility.value,
          categoryName: selectedCategoryName.value,
        })
      : contentSource.value;
  const payload: ArticleCreateRequest = {
    boardId: board.value.id,
    userId: profile.value.userId,
    categoryId: selectedCategoryId.value,
    visibility: visibility.value,
    title: normalizedTitle,
    contentSource: normalizedContentSource,
    contentFormat: contentFormat.value,
    notice: false,
    fileIds,
  };
  try {
    const response = await createArticle(payload);
    allowLeaveWithoutConfirm();
    router.push(`/b/${board.value.slug}/articles/${response.id}`);
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : t('article.upsert.saveFailed');
  } finally {
    isSubmitting.value = false;
  }
};

const cancel = () => {
  requestLeave(() => {
    if (!board.value) {
      router.push('/');
      return;
    }
    router.push(`/b/${board.value.slug}`);
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

onMounted(async () => {
  await loadBoardContext();
  await loadProfile();
});

watch(
  () => route.params.slug,
  async (nextSlug, previousSlug) => {
    if (nextSlug === previousSlug) {
      return;
    }
    selectedCategoryId.value = null;
    await loadBoardContext(String(nextSlug ?? ''));
  },
);
</script>

<template>
  <ArticleUpsertPageLayout
    :board-title="board?.boardName ?? t('board.defaults.communityName')"
    :board-description="board?.description ?? t('board.defaults.noDescription')"
    :board-image-file="board?.boardImage ?? null"
    :board-link-to="board ? `/b/${board.slug}` : undefined"
    :error-message="errorMessage"
    :is-loading="isLoading"
    :loading-message="t('article.upsert.loadingBoard')"
  >
    <ArticleUpsertForm
      v-model:title="title"
      v-model:content-source="contentSource"
      v-model:content-format="contentFormat"
      v-model:visibility="visibility"
      v-model:selected-category-id="selectedCategoryId"
      :board-slug="board?.slug"
      :allow-board-slug-import="true"
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
      :is-submit-blocked="isAttachmentUploading || !canWrite"
      :submit-permission-message="
        !canWrite ? resolveWriteUnavailableReason(board, isAuthenticated, isAdmin) : isAttachmentUploading ? t('article.upsert.waitForUpload') : ''
      "
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
