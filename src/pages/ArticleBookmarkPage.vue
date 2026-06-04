<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import BookmarkList from '../widgets/article/BookmarkList.vue';
import ConfirmModal from '../shared/ui/ConfirmModal.vue';
import { ApiError } from '../shared/lib/http/api';
import { deleteAllArticleBookmarks, deleteArticleBookmarks, getArticleBookmarks } from '../entities/article';
import type { ArticleBookmarkItemResponse } from '../entities/article';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const router = useRouter();

const isLoading = ref(false);
const listError = ref('');
const bookmarks = ref<ArticleBookmarkItemResponse[]>([]);
const selectedIds = ref<number[]>([]);
const page = ref(0);
const totalPages = ref(0);
const hasNext = ref(false);
const hasPrevious = ref(false);
const pageSize = 10;
const isDeleting = ref(false);
const deleteError = ref('');
const showDeleteModal = ref(false);
const deleteMode = ref<'selected' | 'all' | null>(null);

const isInitialLoading = computed(() => isLoading.value && bookmarks.value.length === 0);
const hasSelection = computed(() => selectedIds.value.length > 0);

const loadPage = async (pageIndex: number) => {
  if (isLoading.value) {
    return;
  }
  listError.value = '';
  isLoading.value = true;
  try {
    const data = await getArticleBookmarks(pageIndex, pageSize);
    bookmarks.value = data.items;
    page.value = data.page;
    totalPages.value = data.totalPages;
    hasNext.value = data.hasNext;
    hasPrevious.value = data.hasPrevious;
    selectedIds.value = [];
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '북마크 목록을 불러오지 못했습니다.';
  } finally {
    isLoading.value = false;
  }
};

const handlePageChange = (pageIndex: number) => {
  if (pageIndex < 0 || pageIndex >= totalPages.value) {
    return;
  }
  loadPage(pageIndex);
};

const handleSelect = (articleId: number) => {
  const target = bookmarks.value.find((item) => item.id === articleId);
  if (!target) {
    return;
  }
  router.push(`/b/${target.boardSlug}/articles/${articleId}`);
};

const toggleSelection = (articleId: number) => {
  if (selectedIds.value.includes(articleId)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== articleId);
    return;
  }
  selectedIds.value = [...selectedIds.value, articleId];
};

const toggleAllSelection = (checked: boolean) => {
  if (checked) {
    selectedIds.value = bookmarks.value.map((item) => item.id);
    return;
  }
  selectedIds.value = [];
};

const openDeleteModal = (mode: 'selected' | 'all') => {
  deleteError.value = '';
  deleteMode.value = mode;
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  if (isDeleting.value) {
    return;
  }
  showDeleteModal.value = false;
  deleteMode.value = null;
};

const confirmDelete = async () => {
  if (!deleteMode.value) {
    return;
  }
  if (deleteMode.value === 'selected' && selectedIds.value.length === 0) {
    return;
  }
  isDeleting.value = true;
  deleteError.value = '';
  try {
    if (deleteMode.value === 'all') {
      await deleteAllArticleBookmarks();
    } else {
      await deleteArticleBookmarks(selectedIds.value);
    }
    showDeleteModal.value = false;
    deleteMode.value = null;
    await loadPage(0);
  } catch (error) {
    deleteError.value = error instanceof ApiError ? error.message : '북마크 삭제에 실패했습니다.';
  } finally {
    isDeleting.value = false;
  }
};

onMounted(() => {
  loadPage(0);
});
</script>

<template>
  <AppShell>
    <PageContainer width="auto">
      <div class="space-y-6">
        <PageHeader title="보관함" description="북마크한 게시글을 모아볼 수 있습니다." />

        <div class="ui-toolbar justify-between gap-3 px-4 py-3">
          <div class="flex items-center gap-2 text-xs text-muted">
            <span class="ui-badge ui-badge-muted">선택 {{ selectedIds.length }}개</span>
            <button
              type="button"
              class="ui-button-ghost h-8 px-3 text-xs"
              :disabled="!hasSelection || isLoading"
              @click="openDeleteModal('selected')"
            >
              선택 삭제
            </button>
          </div>
          <button
            type="button"
            class="ui-button-danger h-8 px-3 text-xs"
            :disabled="bookmarks.length === 0 || isLoading"
            @click="openDeleteModal('all')"
          >
            전체 삭제
          </button>
        </div>

        <div v-if="listError" class="ui-state ui-state-danger">
          {{ listError }}
        </div>

        <div v-if="isInitialLoading" class="flex items-center gap-2 text-sm text-muted">
          <span class="dark:bg-surface-soft0 h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)]"></span>
          북마크 목록을 불러오는 중입니다.
        </div>

        <BookmarkList
          v-if="!isInitialLoading"
          :items="bookmarks"
          :selected-ids="selectedIds"
          :is-loading="isLoading"
          :page="page"
          :total-pages="totalPages"
          :has-next="hasNext"
          :has-previous="hasPrevious"
          @select="handleSelect"
          @toggle="toggleSelection"
          @toggle-all="toggleAllSelection"
          @update:page="handlePageChange"
        />
      </div>
    </PageContainer>

    <ConfirmModal
      :open="showDeleteModal"
      title="북마크 삭제"
      :description="deleteMode === 'all' ? '모든 북마크를 삭제할까요?' : '선택한 북마크를 삭제할까요?'"
      confirm-label="삭제"
      confirm-variant="danger"
      :confirm-disabled="isDeleting"
      :cancel-disabled="isDeleting"
      @close="closeDeleteModal"
      @confirm="confirmDelete"
    >
      <p
        v-if="deleteError"
        class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200"
        role="alert"
      >
        {{ deleteError }}
      </p>
    </ConfirmModal>
  </AppShell>
</template>
