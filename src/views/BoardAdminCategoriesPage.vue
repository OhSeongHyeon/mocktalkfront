<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import BoardAdminNav from '../components/BoardAdminNav.vue';
import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { getBoardBySlug } from '../services/boards';
import type { BoardDetailResponse, BoardMemberStatus } from '../services/boards';
import { createBoardCategory, deleteBoardCategory, getBoardCategories, updateBoardCategory } from '../services/boardCategories';
import type { BoardCategoryResponse } from '../services/boardCategories';
import { isAdmin } from '../stores/auth';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

const route = useRoute();
const isMobileMenuOpen = ref(false);
const board = ref<BoardDetailResponse | null>(null);
const boardError = ref('');

const categories = ref<BoardCategoryResponse[]>([]);
const listError = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);
const createName = ref('');
const editingId = ref<number | null>(null);
const editName = ref('');

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

const isAllowedMember = (memberStatus: BoardMemberStatus | null) => memberStatus === 'OWNER' || memberStatus === 'MODERATOR';

const hasPermission = computed(() => isAdmin.value || (board.value ? isAllowedMember(board.value.memberStatus) : false));

const boardSlug = computed(() => String(route.params.slug ?? ''));
const boardName = computed(() => board.value?.boardName ?? '게시판');

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

const loadBoard = async () => {
  boardError.value = '';
  try {
    board.value = await getBoardBySlug(boardSlug.value);
    if (!hasPermission.value) {
      boardError.value = '게시판 관리자 권한이 없습니다.';
    }
  } catch (error) {
    boardError.value = error instanceof ApiError ? error.message : '게시판 정보를 불러오지 못했습니다.';
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
    listError.value = error instanceof ApiError ? error.message : '카테고리 목록을 불러오지 못했습니다.';
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
    listError.value = '카테고리명을 입력해주세요.';
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    const created = await createBoardCategory(board.value.id, { categoryName: name });
    categories.value = [...categories.value, created].sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'ko'));
    createName.value = '';
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '카테고리 생성에 실패했습니다.';
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
    listError.value = '카테고리명을 입력해주세요.';
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
    listError.value = error instanceof ApiError ? error.message : '카테고리 수정에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};

const removeCategory = async (category: BoardCategoryResponse) => {
  if (!board.value) {
    return;
  }
  if (!window.confirm(`"${category.categoryName}" 카테고리를 삭제할까요?`)) {
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
    listError.value = error instanceof ApiError ? error.message : '카테고리 삭제에 실패했습니다.';
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
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-6xl space-y-6">
          <BoardAdminNav v-if="board && hasPermission" :slug="board.slug" :board-name="boardName" active="categories" />

          <div
            v-if="boardError"
            class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ boardError }}
          </div>

          <div v-if="board && hasPermission" class="space-y-6">
            <div>
              <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">카테고리 관리</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">게시판 카테고리를 관리합니다.</p>
            </div>

            <div
              v-if="listError"
              class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {{ listError }}
            </div>

            <div class="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <section class="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
                <div class="flex items-center justify-between">
                  <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">카테고리 목록</h2>
                  <span class="text-xs text-slate-400">총 {{ categories.length }}건</span>
                </div>

                <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
                  불러오는 중...
                </div>

                <div v-else class="mt-4 flex flex-col gap-3">
                  <div
                    v-for="category in categories"
                    :key="category.id"
                    class="rounded-2xl border border-slate-200 px-4 py-3 text-left transition dark:border-slate-800"
                  >
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {{ category.categoryName }}
                        </div>
                        <p class="mt-1 text-xs text-slate-400">등록 {{ formatDate(category.createdAt) }}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          v-if="editingId !== category.id"
                          type="button"
                          class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                          :disabled="isSubmitting"
                          @click="startEdit(category)"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:opacity-40 dark:border-rose-700 dark:text-rose-300"
                          :disabled="isSubmitting"
                          @click="removeCategory(category)"
                        >
                          삭제
                        </button>
                      </div>
                    </div>

                    <div v-if="editingId === category.id" class="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        v-model="editName"
                        type="text"
                        class="h-10 flex-1 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        placeholder="카테고리명 수정"
                      />
                      <button
                        type="button"
                        class="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
                        :disabled="isSubmitting"
                        @click="submitEdit(category)"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
                        :disabled="isSubmitting"
                        @click="cancelEdit"
                      >
                        취소
                      </button>
                    </div>
                  </div>

                  <div
                    v-if="categories.length === 0"
                    class="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
                  >
                    등록된 카테고리가 없습니다.
                  </div>
                </div>
              </section>

              <section class="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Create</p>
                    <h2 class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">카테고리 추가</h2>
                  </div>
                </div>

                <div class="mt-6 flex flex-col gap-4">
                  <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">카테고리명</label>
                  <input
                    v-model="createName"
                    type="text"
                    class="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    placeholder="예: 자유"
                  />
                  <button
                    type="button"
                    class="mt-2 inline-flex items-center justify-center rounded-2xl bg-[color:var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="isSubmitting"
                    @click="submitCreate"
                  >
                    {{ isSubmitting ? '등록 중...' : '카테고리 등록' }}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
