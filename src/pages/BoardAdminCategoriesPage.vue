<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import BoardAdminNav from '../widgets/layout/BoardAdminNav.vue';
import { ApiError } from '../shared/lib/http/api';
import { getBoardBySlug } from '../entities/board';
import type { BoardDetailResponse, BoardMemberStatus } from '../entities/board';
import { createBoardCategory, deleteBoardCategory, getBoardCategories, updateBoardCategory } from '../entities/board';
import type { BoardCategoryResponse } from '../entities/board';
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

const categories = ref<BoardCategoryResponse[]>([]);
const listError = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);
const createName = ref('');
const editingId = ref<number | null>(null);
const editName = ref('');

const isAllowedMember = (memberStatus: BoardMemberStatus | null) => memberStatus === 'OWNER' || memberStatus === 'MODERATOR';

const hasPermission = computed(() => isAdmin.value || (board.value ? isAllowedMember(board.value.memberStatus) : false));

const boardSlug = computed(() => String(route.params.slug ?? ''));
const boardName = computed(() => board.value?.boardName ?? t('admin.common.defaultBoardName'));

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

const loadBoard = async () => {
  boardError.value = '';
  try {
    board.value = await getBoardBySlug(boardSlug.value);
    if (!hasPermission.value) {
      boardError.value = t('admin.common.noBoardAdmin');
    }
  } catch (error) {
    boardError.value = error instanceof ApiError ? error.message : t('admin.common.loadBoardFailed');
  }
};

const loadCategories = async () => {
  if (!board.value || !hasPermission.value) {
    return;
  }
  listError.value = '';
  isLoading.value = true;
  try {
    categories.value = await getBoardCategories(board.value.id);
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : t('admin.boardAdmin.categories.errors.loadList');
  } finally {
    isLoading.value = false;
  }
};

const submitCreate = async () => {
  if (!board.value) {
    return;
  }
  const name = createName.value.trim();
  if (!name) {
    listError.value = t('admin.boardAdmin.categories.errors.nameRequired');
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    const created = await createBoardCategory(board.value.id, { categoryName: name });
    categories.value = [...categories.value, created].sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'ko'));
    createName.value = '';
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : t('admin.boardAdmin.categories.errors.createFailed');
  } finally {
    isSubmitting.value = false;
  }
};

const startEdit = (category: BoardCategoryResponse) => {
  editingId.value = category.id;
  editName.value = category.categoryName;
};

const cancelEdit = () => {
  editingId.value = null;
  editName.value = '';
};

const submitEdit = async (category: BoardCategoryResponse) => {
  if (!board.value) {
    return;
  }
  const name = editName.value.trim();
  if (!name) {
    listError.value = t('admin.boardAdmin.categories.errors.nameRequired');
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    const updated = await updateBoardCategory(board.value.id, category.id, { categoryName: name });
    categories.value = categories.value
      .map((item) => (item.id === updated.id ? updated : item))
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'ko'));
    cancelEdit();
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : t('admin.boardAdmin.categories.errors.updateFailed');
  } finally {
    isSubmitting.value = false;
  }
};

const removeCategory = async (category: BoardCategoryResponse) => {
  if (!board.value) {
    return;
  }
  if (!window.confirm(t('admin.boardAdmin.categories.confirmDelete', { name: category.categoryName }))) {
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    await deleteBoardCategory(board.value.id, category.id);
    categories.value = categories.value.filter((item) => item.id !== category.id);
    if (editingId.value === category.id) {
      cancelEdit();
    }
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : t('admin.boardAdmin.categories.errors.deleteFailed');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  await nextTick();
  await loadBoard();
  await loadCategories();
});
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <div class="space-y-6">
        <BoardAdminNav v-if="board && hasPermission" :slug="board.slug" :board-name="boardName" active="categories" />

        <div v-if="boardError" class="ui-state ui-state-danger">
          {{ boardError }}
        </div>

        <div v-if="board && hasPermission" class="space-y-6">
          <PageHeader
            eyebrow="Board Categories"
            :title="t('admin.boardAdmin.categories.title', { boardName })"
            :description="t('admin.boardAdmin.categories.description')"
          >
            <template #meta>
              <span class="ui-badge ui-badge-muted">{{ t('admin.boardAdmin.categories.countBadge', { count: categories.length }) }}</span>
              <span class="text-xs text-muted">{{ t('admin.boardAdmin.categories.sortHint') }}</span>
            </template>
            <div class="grid gap-3 md:grid-cols-3">
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Board</p>
                <p class="bbs-row-title mt-2 text-sm">{{ boardName }}</p>
                <p class="mt-1 text-xs text-muted">{{ t('admin.boardAdmin.categories.queueHint') }}</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Create</p>
                <p class="bbs-row-title mt-2 text-sm">{{ t('admin.boardAdmin.categories.addTitle') }}</p>
                <p class="mt-1 text-xs text-muted">{{ t('admin.boardAdmin.categories.addHint') }}</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Edit</p>
                <p class="bbs-row-title mt-2 text-sm">{{ t('admin.boardAdmin.categories.inlineEditTitle') }}</p>
                <p class="mt-1 text-xs text-muted">{{ t('admin.boardAdmin.categories.inlineEditHint') }}</p>
              </div>
            </div>
          </PageHeader>

          <div v-if="listError" class="ui-state ui-state-danger">
            {{ listError }}
          </div>

          <div class="grid gap-6 xl:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
            <section class="ui-panel p-5">
              <div class="dark:border-line/80 flex items-center justify-between gap-3 border border-b border-line bg-surface-soft pb-3">
                <div>
                  <h2 class="bbs-row-title text-lg">{{ t('admin.boardAdmin.categories.listTitle') }}</h2>
                  <p class="mt-1 text-sm text-muted">{{ t('admin.boardAdmin.categories.listDescription') }}</p>
                </div>
                <span class="ui-badge ui-badge-muted">{{ t('admin.common.totalCount', { count: categories.length }) }}</span>
              </div>

              <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-muted">
                <span class="h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)] dark:bg-surface-2"></span>
                {{ t('common.loading') }}
              </div>

              <div v-else class="mt-4 flex flex-col gap-3">
                <div v-for="category in categories" :key="category.id" class="ui-list-row">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="bbs-row-title text-sm">{{ category.categoryName }}</span>
                        <span class="ui-badge ui-badge-muted">#{{ category.id }}</span>
                      </div>
                      <p class="mt-2 text-xs text-muted">{{ t('admin.boardAdmin.categories.registeredAt') }} {{ formatDate(category.createdAt) }}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        v-if="editingId !== category.id"
                        type="button"
                        class="ui-button-ghost h-9 px-4 text-xs disabled:opacity-40"
                        :disabled="isSubmitting"
                        @click="startEdit(category)"
                      >
                        {{ t('common.edit') }}
                      </button>
                      <button
                        type="button"
                        class="ui-button-danger h-9 px-4 text-xs disabled:opacity-40"
                        :disabled="isSubmitting"
                        @click="removeCategory(category)"
                      >
                        {{ t('common.delete') }}
                      </button>
                    </div>
                  </div>

                  <div v-if="editingId === category.id" class="ui-toolbar justify-between">
                    <input
                      v-model="editName"
                      type="text"
                      class="ui-input min-w-[12rem] flex-1"
                      :placeholder="t('admin.boardAdmin.categories.editPlaceholder')"
                    />
                    <div class="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        class="ui-button-accent h-10 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                        :disabled="isSubmitting"
                        @click="submitEdit(category)"
                      >
                        {{ t('common.save') }}
                      </button>
                      <button type="button" class="ui-button-ghost h-10 px-4 text-xs" :disabled="isSubmitting" @click="cancelEdit">
                        {{ t('common.cancel') }}
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="categories.length === 0" class="ui-state ui-state-empty px-4 py-10">{{ t('admin.boardAdmin.categories.empty') }}</div>
              </div>
            </section>

            <section class="ui-panel p-5">
              <div class="dark:border-line/80 flex items-center justify-between gap-3 border border-b border-line bg-surface-soft pb-3">
                <div>
                  <p class="ui-eyebrow">Create</p>
                  <h2 class="bbs-row-title mt-1 text-lg">{{ t('admin.boardAdmin.categories.addFormTitle') }}</h2>
                </div>
              </div>

              <div class="mt-6 grid gap-4">
                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  {{ t('admin.boardAdmin.categories.nameLabel') }}
                  <input v-model="createName" type="text" class="ui-input" :placeholder="t('admin.boardAdmin.categories.namePlaceholder')" />
                </label>
              </div>

              <div class="ui-toolbar mt-5 justify-between text-xs text-muted">
                <span>{{ t('admin.boardAdmin.categories.registerReflectHint') }}</span>
                <button
                  type="button"
                  class="ui-button-accent h-11 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isSubmitting"
                  @click="submitCreate"
                >
                  {{ isSubmitting ? t('admin.common.registerSubmitting') : t('admin.boardAdmin.categories.registerSubmit') }}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>
