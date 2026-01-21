<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import BookmarkList from '../components/BookmarkList.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { deleteAllArticleBookmarks, deleteArticleBookmarks, getArticleBookmarks } from '../services/articles';
import type { ArticleBookmarkItemResponse } from '../services/articles';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

const router = useRouter();

const isMobileMenuOpen = ref(false);
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
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-6xl">
          <div class="flex flex-col gap-2">
            <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">보관함</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400">북마크한 게시글을 모아볼 수 있습니다.</p>
          </div>

          <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>선택 {{ selectedIds.length }}개</span>
              <button
                type="button"
                class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                :disabled="!hasSelection || isLoading"
                @click="openDeleteModal('selected')"
              >
                선택 삭제
              </button>
            </div>
            <button
              type="button"
              class="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/70"
              :disabled="bookmarks.length === 0 || isLoading"
              @click="openDeleteModal('all')"
            >
              전체 삭제
            </button>
          </div>

          <div
            v-if="listError"
            class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ listError }}
          </div>

          <div v-if="isInitialLoading" class="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
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
      </main>
    </div>

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
  </div>
</template>
