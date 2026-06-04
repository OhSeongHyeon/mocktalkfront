<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import { ApiError } from '../shared/lib/http/api';
import FileImage from '../entities/file/ui/FileImage.vue';
import {
  createAdminBoard,
  deleteAdminBoard,
  deleteAdminBoardImage,
  getAdminBoards,
  updateAdminBoard,
  uploadAdminBoardImage,
} from '../features/admin/system';
import type { BoardResponse } from '../entities/board';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import AppShell from '../widgets/layout/AppShell.vue';

type BoardVisibility = 'PUBLIC' | 'GROUP' | 'PRIVATE' | 'UNLISTED';

const page = ref(0);
const { t } = useI18n();
const size = ref(10);
const totalPages = ref(0);
const boards = ref<BoardResponse[]>([]);
const listError = ref('');
const isLoading = ref(false);
const keyword = ref('');
const visibilityFilter = ref<BoardVisibility | 'ALL'>('ALL');
const includeDeleted = ref(false);
const sortOrder = ref<'DESC' | 'ASC'>('DESC');
const sortBy = ref<'CREATED_AT' | 'UPDATED_AT'>('CREATED_AT');

const selectedBoardId = ref<number | null>(null);
const selectedBoard = computed(() => boards.value.find((board) => board.id === selectedBoardId.value) ?? null);

const createForm = reactive({
  boardName: '',
  slug: '',
  description: '',
  visibility: 'PUBLIC' as BoardVisibility,
});

const editForm = reactive({
  boardName: '',
  slug: '',
  description: '',
  visibility: 'PUBLIC' as BoardVisibility,
});

const createError = ref('');
const createSuccess = ref('');
const editError = ref('');
const editSuccess = ref('');
const imageError = ref('');
const imageSuccess = ref('');
const isCreating = ref(false);
const isUpdating = ref(false);
const isUploading = ref(false);
const isRemoving = ref(false);

const createImageFile = ref<File | null>(null);
const editImageFile = ref<File | null>(null);
const createPreviewUrl = ref<string | null>(null);
const editPreviewUrl = ref<string | null>(null);
const createFileInputKey = ref(0);
const editFileInputKey = ref(0);

const visibilityOptions = computed(() =>
  (['PUBLIC', 'GROUP', 'PRIVATE', 'UNLISTED'] as BoardVisibility[]).map((value) => ({
    value,
    label: t(`admin.visibility.${value}`),
  })),
);
const visibilityFilterOptions: Array<BoardVisibility | 'ALL'> = ['ALL', 'PUBLIC', 'GROUP', 'PRIVATE', 'UNLISTED'];
const sortOptions = computed(() => [
  { value: 'DESC' as const, label: t('admin.common.sortNewest') },
  { value: 'ASC' as const, label: t('admin.common.sortOldest') },
]);
const sortByOptions = computed(() => [
  { value: 'CREATED_AT' as const, label: t('admin.common.sortByCreated') },
  { value: 'UPDATED_AT' as const, label: t('admin.common.sortByUpdated') },
]);

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

const visibilityLabel = (value: string) => {
  if (value === 'ALL') {
    return t('admin.visibility.allScope');
  }
  if (value === 'PUBLIC' || value === 'GROUP' || value === 'PRIVATE' || value === 'UNLISTED') {
    return t(`admin.visibility.${value}`);
  }
  return value;
};

const filterSummary = computed(() => {
  const parts: string[] = [];
  if (visibilityFilter.value !== 'ALL') {
    parts.push(t('admin.common.visibilitySummary', { visibility: visibilityLabel(visibilityFilter.value) }));
  }
  if (includeDeleted.value) {
    parts.push(t('admin.common.includeDeleted'));
  }
  const sortLabel = sortOrder.value === 'DESC' ? t('admin.common.sortNewest') : t('admin.common.sortOldest');
  const sortByLabel = sortBy.value === 'UPDATED_AT' ? t('admin.common.sortByUpdated') : t('admin.common.sortByCreated');
  parts.push(t('admin.common.sortSummary', { sortBy: sortByLabel, sortOrder: sortLabel }));
  if (keyword.value.trim()) {
    parts.push(t('admin.common.filterSummarySearch', { keyword: keyword.value.trim() }));
  }
  return parts.length ? parts.join(' · ') : t('admin.common.allBoards');
});

const resolveBoardErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    if (error.message.includes('uq_tb_boards_slug')) {
      return t('admin.boards.errors.slugDuplicate');
    }
    if (error.message.includes('uq_tb_boards_board_name')) {
      return t('admin.boards.errors.nameDuplicate');
    }
    return error.message || fallback;
  }
  return fallback;
};

const clearPreviewUrl = (target: 'create' | 'edit') => {
  if (target === 'create') {
    if (createPreviewUrl.value) {
      URL.revokeObjectURL(createPreviewUrl.value);
    }
    createPreviewUrl.value = null;
    return;
  }
  if (editPreviewUrl.value) {
    URL.revokeObjectURL(editPreviewUrl.value);
  }
  editPreviewUrl.value = null;
};

const resetCreateImage = () => {
  clearPreviewUrl('create');
  createImageFile.value = null;
  createFileInputKey.value += 1;
};

const resetEditImage = () => {
  clearPreviewUrl('edit');
  editImageFile.value = null;
  editFileInputKey.value += 1;
};

const handleCreateImageChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0] ?? null;
  clearPreviewUrl('create');
  createPreviewUrl.value = file ? URL.createObjectURL(file) : null;
  createImageFile.value = file;
};

const handleEditImageChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0] ?? null;
  clearPreviewUrl('edit');
  editPreviewUrl.value = file ? URL.createObjectURL(file) : null;
  editImageFile.value = file;
};

const applyBoardUpdate = (updated: BoardResponse) => {
  boards.value = boards.value.map((item) => (item.id === updated.id ? updated : item));
};

const loadBoards = async () => {
  listError.value = '';
  isLoading.value = true;
  try {
    const response = await getAdminBoards({
      page: page.value,
      size: size.value,
      keyword: keyword.value.trim() || undefined,
      visibility: visibilityFilter.value === 'ALL' ? undefined : visibilityFilter.value,
      includeDeleted: includeDeleted.value,
      sort: sortOrder.value,
      sortBy: sortBy.value,
    });
    boards.value = response.items;
    totalPages.value = response.totalPages;
    if (selectedBoardId.value && !boards.value.some((board) => board.id === selectedBoardId.value)) {
      selectedBoardId.value = null;
    }
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : t('admin.boards.errors.loadList');
  } finally {
    isLoading.value = false;
  }
};

const movePage = async (delta: number) => {
  const next = page.value + delta;
  if (next < 0 || next >= totalPages.value) {
    return;
  }
  page.value = next;
  await loadBoards();
};

const applyFilters = async () => {
  page.value = 0;
  await loadBoards();
};

const deleteBoard = async () => {
  if (!selectedBoard.value) {
    return;
  }
  if (!window.confirm(t('admin.boards.confirm.deleteBoard', { name: selectedBoard.value.boardName }))) {
    return;
  }
  editError.value = '';
  editSuccess.value = '';
  isUpdating.value = true;
  try {
    await deleteAdminBoard(selectedBoard.value.id);
    editSuccess.value = t('admin.boards.success.deleted');
    await loadBoards();
    selectedBoardId.value = null;
  } catch (error) {
    editError.value = resolveBoardErrorMessage(error, t('admin.boards.errors.deleteFailed'));
  } finally {
    isUpdating.value = false;
  }
};

const selectBoard = (boardId: number) => {
  selectedBoardId.value = boardId;
  editSuccess.value = '';
  editError.value = '';
  imageError.value = '';
  imageSuccess.value = '';
};

const syncEditForm = (board: BoardResponse | null) => {
  if (!board) {
    editForm.boardName = '';
    editForm.slug = '';
    editForm.description = '';
    editForm.visibility = 'PUBLIC';
    resetEditImage();
    return;
  }
  editForm.boardName = board.boardName;
  editForm.slug = board.slug;
  editForm.description = board.description ?? '';
  editForm.visibility = board.visibility as BoardVisibility;
  resetEditImage();
};

const submitCreate = async () => {
  createError.value = '';
  createSuccess.value = '';
  const boardName = createForm.boardName.trim();
  const slug = createForm.slug.trim();
  const description = createForm.description.trim();
  if (!boardName) {
    createError.value = t('admin.boardForm.errors.nameRequired');
    return;
  }
  if (!slug) {
    createError.value = t('admin.boardForm.errors.slugRequired');
    return;
  }
  if (boardName.length > 255) {
    createError.value = t('admin.boardForm.errors.nameMaxLength');
    return;
  }
  if (slug.length > 80) {
    createError.value = t('admin.boardForm.errors.slugMaxLength');
    return;
  }
  isCreating.value = true;
  try {
    const created = await createAdminBoard({
      boardName,
      slug,
      description: description ? description : null,
      visibility: createForm.visibility,
    });

    if (createImageFile.value) {
      try {
        await uploadAdminBoardImage(created.id, createImageFile.value);
      } catch (error) {
        createError.value = error instanceof ApiError ? error.message : t('admin.boardForm.errors.createImageUploadFailed');
      }
    }

    createSuccess.value = t('admin.boards.success.created');
    createForm.boardName = '';
    createForm.slug = '';
    createForm.description = '';
    createForm.visibility = 'PUBLIC';
    resetCreateImage();
    page.value = 0;
    await loadBoards();
    selectedBoardId.value = created.id;
  } catch (error) {
    createError.value = resolveBoardErrorMessage(error, t('admin.boards.errors.createFailed'));
  } finally {
    isCreating.value = false;
  }
};

const submitUpdate = async () => {
  if (!selectedBoard.value) {
    return;
  }
  editError.value = '';
  editSuccess.value = '';
  const boardName = editForm.boardName.trim();
  const slug = editForm.slug.trim();
  const description = editForm.description.trim();
  if (!boardName) {
    editError.value = t('admin.boardForm.errors.nameRequired');
    return;
  }
  if (!slug) {
    editError.value = t('admin.boardForm.errors.slugRequired');
    return;
  }
  if (boardName.length > 255) {
    editError.value = t('admin.boardForm.errors.nameMaxLength');
    return;
  }
  if (slug.length > 80) {
    editError.value = t('admin.boardForm.errors.slugMaxLength');
    return;
  }
  isUpdating.value = true;
  try {
    const updated = await updateAdminBoard(selectedBoard.value.id, {
      boardName,
      slug,
      description: description ? description : null,
      visibility: editForm.visibility,
    });
    applyBoardUpdate(updated);
    editSuccess.value = t('admin.boards.success.updated');
  } catch (error) {
    editError.value = resolveBoardErrorMessage(error, t('admin.boards.errors.updateFailed'));
  } finally {
    isUpdating.value = false;
  }
};

const uploadImage = async () => {
  if (!selectedBoard.value || !editImageFile.value) {
    return;
  }
  imageError.value = '';
  imageSuccess.value = '';
  isUploading.value = true;
  try {
    const updated = await uploadAdminBoardImage(selectedBoard.value.id, editImageFile.value);
    applyBoardUpdate(updated);
    imageSuccess.value = t('admin.boardForm.success.imageUploaded');
    resetEditImage();
  } catch (error) {
    imageError.value = resolveBoardErrorMessage(error, t('admin.boards.errors.imageUploadFailed'));
  } finally {
    isUploading.value = false;
  }
};

const deleteImage = async () => {
  if (!selectedBoard.value || !selectedBoard.value.boardImage) {
    return;
  }
  if (!window.confirm(t('admin.boardForm.confirm.deleteImage'))) {
    return;
  }
  imageError.value = '';
  imageSuccess.value = '';
  isRemoving.value = true;
  try {
    const updated = await deleteAdminBoardImage(selectedBoard.value.id);
    applyBoardUpdate(updated);
    imageSuccess.value = t('admin.boardForm.success.imageDeleted');
    resetEditImage();
  } catch (error) {
    imageError.value = resolveBoardErrorMessage(error, t('admin.boards.errors.imageDeleteFailed'));
  } finally {
    isRemoving.value = false;
  }
};

onMounted(async () => {
  await nextTick();
  await loadBoards();
});

watch(selectedBoard, (value) => {
  syncEditForm(value);
});

onBeforeUnmount(() => {
  clearPreviewUrl('create');
  clearPreviewUrl('edit');
});
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <div class="space-y-6">
        <PageHeader eyebrow="Admin Boards" :title="t('admin.boards.title')" :description="t('admin.boards.description')">
          <template #meta>
            <span class="ui-badge ui-badge-muted">{{ t('admin.common.currentPage', { current: page + 1, total: Math.max(totalPages, 1) }) }}</span>
            <span class="ui-badge ui-badge-accent">{{ t('admin.common.displayCount', { count: boards.length }) }}</span>
            <span class="text-xs text-muted">{{ filterSummary }}</span>
          </template>
          <div class="grid gap-3 md:grid-cols-3">
            <div class="ui-data-panel p-4">
              <p class="ui-eyebrow">Filter</p>
              <p class="bbs-row-title mt-2 text-sm">
                {{ visibilityLabel(visibilityFilter) }}
              </p>
              <p class="mt-1 text-xs text-muted">
                {{
                  t('admin.boards.includeDeletedSummary', {
                    state: includeDeleted ? t('admin.common.on') : t('admin.common.off'),
                    sortBy: sortBy === 'UPDATED_AT' ? t('admin.common.sortByUpdated') : t('admin.common.sortByCreated'),
                  })
                }}
              </p>
            </div>
            <div class="ui-data-panel p-4">
              <p class="ui-eyebrow">Selected</p>
              <p class="bbs-row-title mt-2 text-sm">
                {{ selectedBoard ? selectedBoard.boardName : t('admin.common.boardNotSelected') }}
              </p>
              <p class="mt-1 text-xs text-muted">{{ t('admin.common.editPanelHint') }}</p>
            </div>
            <div class="ui-data-panel p-4">
              <p class="ui-eyebrow">Create</p>
              <p class="bbs-row-title mt-2 text-sm">{{ t('admin.boards.createTitle') }}</p>
              <p class="mt-1 text-xs text-muted">{{ t('admin.boards.createHint') }}</p>
            </div>
          </div>
        </PageHeader>

        <div class="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <section class="ui-panel p-5">
            <div class="flex items-center justify-between gap-3 border border-b border-line bg-surface-soft pb-3 dark:border-line">
              <div>
                <h2 class="bbs-row-title text-lg">{{ t('admin.boards.listTitle') }}</h2>
                <p class="mt-1 text-sm text-muted">{{ t('admin.boards.listDescription') }}</p>
              </div>
              <span class="ui-badge ui-badge-muted">{{ t('admin.common.totalCount', { count: boards.length }) }}</span>
            </div>

            <div class="ui-toolbar mt-4">
              <select v-model="visibilityFilter" class="ui-select min-w-[10rem]">
                <option v-for="option in visibilityFilterOptions" :key="option" :value="option">
                  {{ visibilityLabel(option) }}
                </option>
              </select>
              <select v-model="sortBy" class="ui-select min-w-[8.5rem]">
                <option v-for="option in sortByOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <select v-model="sortOrder" class="ui-select min-w-[8.5rem]">
                <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <label class="flex items-center gap-2 text-xs font-semibold text-muted">
                <input v-model="includeDeleted" type="checkbox" class="h-4 w-4 rounded border-line text-ink focus:ring-[color:var(--accent-ring)]" />
                {{ t('admin.common.includeDeleted') }}
              </label>
              <input v-model="keyword" type="search" class="ui-input min-w-[13rem] flex-1" :placeholder="t('admin.common.searchBoardPlaceholder')" />
              <button type="button" class="ui-button-primary h-10 px-4 text-xs" @click="applyFilters">{{ t('admin.common.apply') }}</button>
            </div>
            <p class="mt-2 text-xs text-subtle">{{ filterSummary }}</p>

            <div v-if="listError" class="ui-state ui-state-danger mt-4">
              {{ listError }}
            </div>

            <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-muted">
              <span class="h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)] dark:bg-surface-2"></span>
              {{ t('common.loading') }}
            </div>

            <div v-else class="mt-4 flex flex-col gap-3">
              <button
                v-for="item in boards"
                :key="item.id"
                type="button"
                class="ui-list-row text-left"
                :class="[item.id === selectedBoardId ? 'border-[color:var(--line-strong)] bg-surface shadow-sm' : '']"
                @click="selectBoard(item.id)"
              >
                <div class="grid gap-3 md:grid-cols-[3.5rem_minmax(0,1fr)_auto] md:items-start">
                  <div class="h-14 overflow-hidden rounded-ui bg-surface-soft">
                    <FileImage
                      v-if="item.boardImage"
                      :file="item.boardImage"
                      variant="thumb"
                      :alt="t('admin.boards.boardImageAlt')"
                      class="h-full w-full object-cover"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center text-xs font-semibold text-subtle">NO</div>
                  </div>

                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span :class="item.deletedAt ? 'ui-badge ui-badge-danger' : 'ui-badge ui-badge-success'">
                        {{ item.deletedAt ? t('admin.common.deleted') : t('admin.common.active') }}
                      </span>
                      <span class="ui-badge ui-badge-muted">{{ visibilityLabel(item.visibility) }}</span>
                      <span>ID {{ item.id }}</span>
                    </div>

                    <div class="mt-2 flex flex-wrap items-center gap-2">
                      <span class="bbs-row-title text-sm">{{ item.boardName }}</span>
                      <span class="text-xs text-subtle">/b/{{ item.slug }}</span>
                    </div>
                    <p class="mt-2 line-clamp-2 text-xs leading-5 text-muted">{{ item.description || t('admin.common.noDescription') }}</p>
                  </div>

                  <div class="text-xs text-subtle md:text-right">
                    <p>{{ t('admin.common.createdAt') }} {{ formatDate(item.createdAt) }}</p>
                    <p class="mt-1">{{ t('admin.common.updatedAt') }} {{ formatDate(item.updatedAt) }}</p>
                  </div>
                </div>
              </button>

              <div v-if="boards.length === 0" class="ui-state ui-state-empty px-4 py-10">{{ t('admin.boards.empty') }}</div>
            </div>

            <div class="ui-toolbar mt-4 justify-between text-sm text-muted">
              <button type="button" class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-40" :disabled="page === 0" @click="movePage(-1)">
                {{ t('common.previous') }}
              </button>
              <span>{{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
              <button
                type="button"
                class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-40"
                :disabled="page + 1 >= totalPages"
                @click="movePage(1)"
              >
                {{ t('common.next') }}
              </button>
            </div>
          </section>

          <div class="flex flex-col gap-6">
            <section class="ui-panel p-5">
              <div class="flex items-center justify-between gap-3 border border-b border-line bg-surface-soft pb-3 dark:border-line">
                <div>
                  <p class="ui-eyebrow">Create</p>
                  <h2 class="bbs-row-title mt-1 text-lg">{{ t('admin.boards.createTitle') }}</h2>
                </div>
              </div>

              <form class="mt-6 space-y-4" @submit.prevent="submitCreate">
                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  {{ t('admin.boardForm.boardName') }}
                  <input
                    v-model="createForm.boardName"
                    type="text"
                    maxlength="255"
                    class="ui-input"
                    :placeholder="t('admin.boardAdmin.settings.boardNamePlaceholder')"
                  />
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  {{ t('admin.boardForm.slug') }}
                  <input v-model="createForm.slug" type="text" maxlength="80" class="ui-input" :placeholder="t('admin.boardForm.slugPlaceholder')" />
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  {{ t('admin.boardForm.visibility') }}
                  <select v-model="createForm.visibility" class="ui-select">
                    <option v-for="option in visibilityOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  {{ t('admin.boards.boardDescription') }}
                  <textarea
                    v-model="createForm.description"
                    rows="3"
                    class="ui-textarea"
                    :placeholder="t('admin.boardForm.descriptionPlaceholder')"
                  ></textarea>
                </label>

                <div class="rounded-ui border border-dashed border-line bg-surface-soft/70 p-4 dark:border-line">
                  <div class="flex items-center justify-between text-sm font-semibold text-muted">
                    {{ t('admin.boards.featuredImageOptional') }}
                    <span class="text-xs text-subtle">{{ t('admin.boards.uploadAfterCreate') }}</span>
                  </div>
                  <div class="mt-3 flex flex-col gap-3">
                    <div class="overflow-hidden rounded-ui bg-surface-soft">
                      <img
                        v-if="createPreviewUrl"
                        :src="createPreviewUrl"
                        :alt="t('admin.boardForm.featuredImagePreview')"
                        class="h-40 w-full object-cover"
                      />
                      <div v-else class="flex h-40 items-center justify-center text-sm text-subtle">{{ t('admin.boards.noImageSelected') }}</div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <label class="ui-button-ghost h-10 cursor-pointer px-4 text-xs" :for="`admin-create-image-${createFileInputKey}`">
                        {{ t('admin.boardForm.selectImage') }}
                      </label>
                      <input
                        :id="`admin-create-image-${createFileInputKey}`"
                        :key="createFileInputKey"
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="handleCreateImageChange"
                      />
                      <button
                        type="button"
                        class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-50"
                        :disabled="!createImageFile"
                        @click="resetCreateImage"
                      >
                        {{ t('admin.boardForm.cancelSelection') }}
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="createError" class="ui-state ui-state-danger">
                  {{ createError }}
                </div>
                <div
                  v-if="createSuccess"
                  class="rounded-ui border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  {{ createSuccess }}
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <button type="submit" class="ui-button-accent h-11 px-6 text-sm disabled:opacity-60" :disabled="isCreating">
                    {{ isCreating ? t('admin.boards.creating') : t('admin.boards.createSubmit') }}
                  </button>
                </div>
              </form>
            </section>

            <section class="ui-panel p-5">
              <div class="flex items-center justify-between gap-3 border border-b border-line bg-surface-soft pb-3 dark:border-line">
                <div>
                  <p class="ui-eyebrow">Edit</p>
                  <h2 class="bbs-row-title mt-1 text-lg">{{ t('admin.boards.editSelectedTitle') }}</h2>
                </div>
                <span v-if="selectedBoard" class="ui-badge ui-badge-muted">ID {{ selectedBoard.id }}</span>
              </div>

              <div v-if="!selectedBoard" class="ui-state ui-state-empty mt-6 px-4 py-10">{{ t('admin.boards.selectFromList') }}</div>

              <form v-else class="mt-6 space-y-4" @submit.prevent="submitUpdate">
                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  {{ t('admin.boardForm.boardName') }}
                  <input v-model="editForm.boardName" type="text" maxlength="255" class="ui-input" />
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  {{ t('admin.boardForm.slug') }}
                  <input v-model="editForm.slug" type="text" maxlength="80" class="ui-input" />
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  {{ t('admin.boardForm.visibility') }}
                  <select v-model="editForm.visibility" class="ui-select">
                    <option v-for="option in visibilityOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  {{ t('admin.boards.boardDescription') }}
                  <textarea v-model="editForm.description" rows="3" class="ui-textarea"></textarea>
                </label>

                <div class="rounded-ui border border-dashed border-line bg-surface-soft/70 p-4 dark:border-line">
                  <div class="flex items-center justify-between text-sm font-semibold text-muted">
                    {{ t('admin.boardForm.featuredImage') }}
                    <span class="text-xs text-subtle">{{
                      selectedBoard.boardImage ? t('admin.boardAdmin.settings.featuredSet') : t('admin.boardAdmin.settings.featuredUnset')
                    }}</span>
                  </div>
                  <div class="mt-3 grid gap-3">
                    <div class="overflow-hidden rounded-ui bg-surface-soft">
                      <img
                        v-if="editPreviewUrl"
                        :src="editPreviewUrl"
                        :alt="t('admin.boardForm.featuredImagePreview')"
                        class="h-40 w-full object-cover"
                      />
                      <FileImage
                        v-else-if="selectedBoard?.boardImage"
                        :file="selectedBoard.boardImage"
                        variant="medium"
                        :alt="t('admin.boardForm.featuredImagePreview')"
                        class="h-40 w-full object-cover"
                      />
                      <div v-else class="flex h-40 items-center justify-center text-sm text-subtle">{{ t('admin.boardForm.noFeaturedImage') }}</div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <label class="ui-button-ghost h-10 cursor-pointer px-4 text-xs" :for="`admin-edit-image-${editFileInputKey}`">
                        {{ t('admin.boardForm.selectImage') }}
                      </label>
                      <input
                        :id="`admin-edit-image-${editFileInputKey}`"
                        :key="editFileInputKey"
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="handleEditImageChange"
                      />
                      <button
                        type="button"
                        class="ui-button-accent h-10 px-4 text-xs disabled:opacity-60"
                        :disabled="!editImageFile || isUploading"
                        @click="uploadImage"
                      >
                        {{ isUploading ? t('admin.common.uploading') : t('admin.boards.upload') }}
                      </button>
                      <button
                        type="button"
                        class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-50"
                        :disabled="!editImageFile"
                        @click="resetEditImage"
                      >
                        {{ t('admin.boardForm.cancelSelection') }}
                      </button>
                      <button
                        type="button"
                        class="ui-button-danger h-10 px-4 text-xs disabled:opacity-50"
                        :disabled="!selectedBoard.boardImage || isRemoving"
                        @click="deleteImage"
                      >
                        {{ isRemoving ? t('admin.common.removing') : t('admin.boardForm.deleteImage') }}
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="editError" class="ui-state ui-state-danger">
                  {{ editError }}
                </div>
                <div
                  v-if="editSuccess"
                  class="rounded-ui border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  {{ editSuccess }}
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

                <div class="flex flex-wrap items-center gap-3">
                  <button type="submit" class="ui-button-accent h-11 px-6 text-sm disabled:opacity-60" :disabled="isUpdating">
                    {{ isUpdating ? t('admin.boardForm.saving') : t('admin.boards.saveSubmit') }}
                  </button>
                  <button type="button" class="ui-button-danger h-11 px-6 text-sm disabled:opacity-50" :disabled="isUpdating" @click="deleteBoard">
                    {{ t('admin.boards.deleteBoard') }}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>
