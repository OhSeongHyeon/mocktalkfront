<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute } from 'vue-router';

import BoardAdminNav from '../widgets/layout/BoardAdminNav.vue';
import FileImage from '../entities/file/ui/FileImage.vue';
import { ApiError } from '../shared/lib/http/api';
import { BOARD_ARTICLE_WRITE_POLICY_VALUES, type BoardArticleWritePolicy } from '../entities/board/lib/boardWritePolicy';
import { resolveBoardVisibilityOptions, type BoardVisibility } from '../entities/board/lib/boardVisibility';
import type { BoardCategoryResponse } from '../entities/board';
import { getBoardCategories } from '../entities/board';
import { getBoardBySlug } from '../entities/board';
import type { BoardDetailResponse, BoardMemberStatus, BoardResponse } from '../entities/board';
import { deleteBoardAdminImage, updateBoardSettings, uploadBoardAdminImage } from '../features/admin/board';
import { useAuthStore } from '../stores/auth';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const route = useRoute();
const { t } = useI18n();
const authStore = useAuthStore();
const { isAdmin } = storeToRefs(authStore);
const board = ref<BoardDetailResponse | null>(null);
const boardError = ref('');
const formError = ref('');
const formSuccess = ref('');
const imageError = ref('');
const imageSuccess = ref('');
const isSaving = ref(false);
const isUploading = ref(false);
const isRemoving = ref(false);
const categories = ref<BoardCategoryResponse[]>([]);
const isCategoryLoading = ref(false);
const categoryError = ref('');
const previewUrl = ref<string | null>(null);
const imageFile = ref<File | null>(null);
const fileInputKey = ref(0);

const form = reactive({
  boardName: '',
  description: '',
  visibility: 'PUBLIC' as BoardVisibility,
  articleWritePolicy: 'ALL_AUTHENTICATED' as BoardArticleWritePolicy,
});
const visibilityOptions = computed(() => resolveBoardVisibilityOptions(isAdmin.value, form.visibility));
const articleWritePolicyOptions = computed(() =>
  BOARD_ARTICLE_WRITE_POLICY_VALUES.map((value) => ({
    value,
    label: t(`board.writePolicy.option.${value}`),
  })),
);

const isAllowedMember = (memberStatus: BoardMemberStatus | null) => memberStatus === 'OWNER' || memberStatus === 'MODERATOR';

const hasPermission = computed(() => isAdmin.value || (board.value ? isAllowedMember(board.value.memberStatus) : false));

const boardSlug = computed(() => String(route.params.slug ?? ''));
const boardName = computed(() => board.value?.boardName ?? t('admin.common.defaultBoardName'));

const resetImageInput = () => {
  fileInputKey.value += 1;
};

const clearPreviewUrl = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = null;
};

const handleImageChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0] ?? null;
  clearPreviewUrl();
  previewUrl.value = file ? URL.createObjectURL(file) : null;
  imageFile.value = file;
};

const clearSelectedImage = () => {
  clearPreviewUrl();
  imageFile.value = null;
  resetImageInput();
};

const applyBoardUpdate = (updated: BoardResponse) => {
  if (!board.value) {
    return;
  }
  board.value = { ...board.value, ...updated };
  form.boardName = updated.boardName;
  form.description = updated.description ?? '';
  form.visibility = updated.visibility as BoardVisibility;
  form.articleWritePolicy = updated.articleWritePolicy;
};

const loadBoard = async () => {
  boardError.value = '';
  try {
    board.value = await getBoardBySlug(boardSlug.value);
    if (!hasPermission.value) {
      boardError.value = t('admin.common.noBoardAdmin');
      return;
    }
    form.boardName = board.value.boardName;
    form.description = board.value.description ?? '';
    form.visibility = board.value.visibility as BoardVisibility;
    form.articleWritePolicy = board.value.articleWritePolicy;
  } catch (error) {
    boardError.value = error instanceof ApiError ? error.message : t('admin.common.loadBoardFailed');
  }
};

const loadCategories = async () => {
  if (!board.value || !hasPermission.value) {
    categories.value = [];
    categoryError.value = '';
    return;
  }
  isCategoryLoading.value = true;
  categoryError.value = '';
  try {
    categories.value = await getBoardCategories(board.value.id);
  } catch (error) {
    categories.value = [];
    categoryError.value = error instanceof ApiError ? error.message : t('admin.boardAdmin.settings.errors.loadCategories');
  } finally {
    isCategoryLoading.value = false;
  }
};

const submitSettings = async () => {
  formError.value = '';
  formSuccess.value = '';
  if (!board.value) {
    return;
  }
  const boardNameValue = form.boardName.trim();
  if (!boardNameValue) {
    formError.value = t('admin.boardForm.errors.nameRequired');
    return;
  }
  if (boardNameValue.length > 255) {
    formError.value = t('admin.boardForm.errors.nameMaxLength');
    return;
  }
  isSaving.value = true;
  try {
    const updated = await updateBoardSettings(board.value.id, {
      boardName: boardNameValue,
      description: form.description.trim() ? form.description.trim() : null,
      visibility: form.visibility,
      articleWritePolicy: form.articleWritePolicy,
    });
    applyBoardUpdate(updated);
    formSuccess.value = t('admin.boardForm.success.settingsSaved');
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : t('admin.boardForm.errors.saveFailed');
  } finally {
    isSaving.value = false;
  }
};

const uploadImage = async () => {
  imageError.value = '';
  imageSuccess.value = '';
  if (!board.value || !imageFile.value) {
    return;
  }
  isUploading.value = true;
  try {
    const updated = await uploadBoardAdminImage(board.value.id, imageFile.value);
    applyBoardUpdate(updated);
    imageSuccess.value = t('admin.boardForm.success.imageUploaded');
    clearSelectedImage();
  } catch (error) {
    imageError.value = error instanceof ApiError ? error.message : t('admin.boardForm.errors.imageUploadFailed');
  } finally {
    isUploading.value = false;
  }
};

const removeImage = async () => {
  imageError.value = '';
  imageSuccess.value = '';
  if (!board.value || !board.value.boardImage) {
    return;
  }
  if (!window.confirm(t('admin.boardForm.confirm.deleteImage'))) {
    return;
  }
  isRemoving.value = true;
  try {
    const updated = await deleteBoardAdminImage(board.value.id);
    applyBoardUpdate(updated);
    imageSuccess.value = t('admin.boardForm.success.imageDeleted');
    clearSelectedImage();
  } catch (error) {
    imageError.value = error instanceof ApiError ? error.message : t('admin.boardForm.errors.imageDeleteFailed');
  } finally {
    isRemoving.value = false;
  }
};

onMounted(async () => {
  await nextTick();
  await loadBoard();
  await loadCategories();
});

onBeforeUnmount(() => {
  clearPreviewUrl();
});
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <div class="space-y-6">
        <BoardAdminNav v-if="board && hasPermission" :slug="board.slug" :board-name="boardName" active="settings" />

        <div v-if="boardError" class="ui-state ui-state-danger">
          {{ boardError }}
        </div>

        <div v-if="board && hasPermission" class="space-y-6">
          <PageHeader
            eyebrow="Board Settings"
            :title="t('admin.boardAdmin.settings.title', { boardName })"
            :description="t('admin.boardAdmin.settings.description')"
          >
            <template #meta>
              <span class="ui-badge ui-badge-muted">{{ t('admin.boardAdmin.settings.boardId', { id: board.id }) }}</span>
              <span class="ui-badge ui-badge-accent">{{ form.visibility }}</span>
              <span class="text-xs text-muted">{{ t('admin.boardAdmin.settings.writePolicy', { policy: form.articleWritePolicy }) }}</span>
            </template>
            <div class="grid gap-3 md:grid-cols-3">
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Profile</p>
                <p class="bbs-row-title mt-2 text-sm">{{ boardName }}</p>
                <p class="mt-1 text-xs text-muted">{{ board.description || t('admin.common.noDescription') }}</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Image</p>
                <p class="bbs-row-title mt-2 text-sm">
                  {{ board.boardImage ? t('admin.boardAdmin.settings.featuredImageSet') : t('admin.boardAdmin.settings.featuredImageNone') }}
                </p>
                <p class="mt-1 text-xs text-muted">{{ t('admin.boardAdmin.settings.featuredImagePanelHint') }}</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Categories</p>
                <p class="bbs-row-title mt-2 text-sm">{{ t('admin.boardAdmin.settings.categoryCount', { count: categories.length }) }}</p>
                <p class="mt-1 text-xs text-muted">{{ t('admin.boardAdmin.settings.categoryPanelHint') }}</p>
              </div>
            </div>
          </PageHeader>

          <section class="ui-panel p-6">
            <div class="flex items-center justify-between gap-3 border border-b border-line bg-surface-soft pb-3 dark:border-line">
              <h2 class="bbs-row-title text-lg">{{ t('admin.boardAdmin.settings.basicInfo') }}</h2>
              <span class="ui-badge ui-badge-muted">{{ t('admin.boardAdmin.settings.boardId', { id: board.id }) }}</span>
            </div>

            <form class="mt-6 grid gap-4 md:grid-cols-2" @submit.prevent="submitSettings">
              <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                {{ t('admin.boardForm.boardName') }}
                <input
                  v-model="form.boardName"
                  type="text"
                  maxlength="255"
                  class="ui-input"
                  :placeholder="t('admin.boardAdmin.settings.boardNamePlaceholder')"
                />
              </label>

              <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                {{ t('admin.boardForm.visibility') }}
                <select v-model="form.visibility" class="ui-select">
                  <option v-for="option in visibilityOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                {{ t('admin.boardForm.articleWritePolicy') }}
                <select v-model="form.articleWritePolicy" class="ui-select">
                  <option v-for="option in articleWritePolicyOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label class="flex flex-col gap-2 text-sm font-medium text-ink md:col-span-2">
                {{ t('admin.boardAdmin.settings.boardDescription') }}
                <textarea
                  v-model="form.description"
                  rows="4"
                  class="ui-textarea"
                  :placeholder="t('admin.boardForm.descriptionPlaceholder')"
                ></textarea>
              </label>

              <div v-if="formError" class="ui-state ui-state-danger md:col-span-2">
                {{ formError }}
              </div>
              <div
                v-if="formSuccess"
                class="rounded-ui border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 md:col-span-2 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                {{ formSuccess }}
              </div>

              <div class="flex flex-wrap items-center gap-3 md:col-span-2">
                <button type="submit" class="ui-button-accent h-11 px-6 text-sm disabled:opacity-60" :disabled="isSaving">
                  {{ isSaving ? t('admin.boardForm.saving') : t('admin.boardForm.saveSettings') }}
                </button>
              </div>
            </form>
          </section>

          <section class="ui-panel p-6">
            <div class="flex items-center justify-between gap-3 border border-b border-line bg-surface-soft pb-3 dark:border-line">
              <h2 class="bbs-row-title text-lg">{{ t('admin.boardForm.featuredImage') }}</h2>
              <span class="ui-badge ui-badge-muted">{{
                t('admin.boardAdmin.settings.featuredCurrent', {
                  state: board.boardImage ? t('admin.boardAdmin.settings.featuredSet') : t('admin.boardAdmin.settings.featuredUnset'),
                })
              }}</span>
            </div>

            <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
              <div class="ui-card border-dashed">
                <div class="relative overflow-hidden rounded-ui bg-surface-soft">
                  <img v-if="previewUrl" :src="previewUrl" :alt="t('admin.boardForm.featuredImagePreview')" class="h-48 w-full object-cover" />
                  <FileImage
                    v-else-if="board?.boardImage"
                    :file="board.boardImage"
                    variant="medium"
                    :alt="t('admin.boardForm.featuredImagePreview')"
                    class="h-48 w-full object-cover"
                  />
                  <div v-else class="flex h-48 items-center justify-center text-sm text-subtle">{{ t('admin.boardForm.noFeaturedImage') }}</div>
                </div>
              </div>

              <div class="flex flex-col gap-4">
                <p class="text-sm text-muted">{{ t('admin.boardForm.featuredImageExposure') }}</p>

                <div class="flex flex-wrap gap-2">
                  <label class="ui-button-ghost h-10 cursor-pointer px-4 text-xs" :for="`board-admin-image-${fileInputKey}`">
                    {{ t('admin.boardForm.selectImage') }}
                  </label>
                  <input
                    :id="`board-admin-image-${fileInputKey}`"
                    :key="fileInputKey"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleImageChange"
                  />
                  <button
                    type="button"
                    class="ui-button-accent h-10 px-4 text-xs disabled:opacity-60"
                    :disabled="!imageFile || isUploading"
                    @click="uploadImage"
                  >
                    {{ isUploading ? t('admin.common.uploading') : t('admin.boardAdmin.settings.upload') }}
                  </button>
                  <button
                    type="button"
                    class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-50"
                    :disabled="!imageFile"
                    @click="clearSelectedImage"
                  >
                    {{ t('admin.boardForm.cancelSelection') }}
                  </button>
                  <button
                    type="button"
                    class="ui-button-danger h-10 px-4 text-xs disabled:opacity-50"
                    :disabled="!board.boardImage || isRemoving"
                    @click="removeImage"
                  >
                    {{ isRemoving ? t('admin.common.removing') : t('admin.boardForm.deleteImage') }}
                  </button>
                </div>

                <div v-if="imageError" class="ui-state ui-state-danger">
                  {{ imageError }}
                </div>
                <div
                  v-if="imageSuccess"
                  class="rounded-ui border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  {{ imageSuccess }}
                </div>
              </div>
            </div>
          </section>

          <section class="ui-panel p-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="bbs-row-title text-lg">{{ t('admin.boardAdmin.settings.categoriesTitle') }}</h2>
                <p class="mt-1 text-sm text-muted">{{ t('admin.boardAdmin.settings.categoriesDescription') }}</p>
              </div>
              <RouterLink :to="`/b/${board.slug}/admin/categories`" class="ui-button-accent h-10 px-4 text-xs">
                {{ t('admin.boardAdmin.settings.goCategories') }}
              </RouterLink>
            </div>

            <div v-if="isCategoryLoading" class="mt-4 text-sm text-muted">{{ t('admin.boardAdmin.settings.loadingCategories') }}</div>
            <div v-else-if="categoryError" class="ui-state ui-state-danger mt-4">
              {{ categoryError }}
            </div>
            <div v-else-if="categories.length === 0" class="ui-state ui-state-empty mt-4">{{ t('admin.boardAdmin.settings.emptyCategories') }}</div>
            <div v-else class="mt-4">
              <div class="flex flex-wrap gap-2">
                <span v-for="category in categories.slice(0, 10)" :key="category.id" class="ui-badge ui-badge-muted">
                  {{ category.categoryName }}
                </span>
              </div>
              <p v-if="categories.length > 10" class="mt-2 text-xs text-muted">
                {{ t('admin.common.moreCategories', { count: categories.length - 10 }) }}
              </p>
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>
