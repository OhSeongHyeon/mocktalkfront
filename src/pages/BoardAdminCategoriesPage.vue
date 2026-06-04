<script setup lang="ts">
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
            :title="`${boardName} 카테고리 관리`"
            description="게시판 분류 체계를 빠르게 추가, 수정, 삭제합니다."
          >
            <template #meta>
              <span class="ui-badge ui-badge-muted">카테고리 {{ categories.length }}건</span>
              <span class="text-xs text-muted">정렬 기준: 이름 오름차순</span>
            </template>
            <div class="grid gap-3 md:grid-cols-3">
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Board</p>
                <p class="bbs-row-title mt-2 text-sm">{{ boardName }}</p>
                <p class="mt-1 text-xs text-muted">현재 게시판 분류만 표시합니다.</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Create</p>
                <p class="bbs-row-title mt-2 text-sm">새 카테고리 등록</p>
                <p class="mt-1 text-xs text-muted">간단한 이름만 입력하면 바로 생성됩니다.</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Edit</p>
                <p class="bbs-row-title mt-2 text-sm">인라인 수정</p>
                <p class="mt-1 text-xs text-muted">목록에서 바로 이름을 바꾸고 저장할 수 있습니다.</p>
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
                  <h2 class="bbs-row-title text-lg">카테고리 목록</h2>
                  <p class="mt-1 text-sm text-muted">등록 시각과 수정 액션을 한 줄에서 확인합니다.</p>
                </div>
                <span class="ui-badge ui-badge-muted">총 {{ categories.length }}건</span>
              </div>

              <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-muted">
                <span class="h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)] dark:bg-surface-2"></span>
                불러오는 중...
              </div>

              <div v-else class="mt-4 flex flex-col gap-3">
                <div v-for="category in categories" :key="category.id" class="ui-list-row">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="bbs-row-title text-sm">{{ category.categoryName }}</span>
                        <span class="ui-badge ui-badge-muted">#{{ category.id }}</span>
                      </div>
                      <p class="mt-2 text-xs text-muted">등록 {{ formatDate(category.createdAt) }}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        v-if="editingId !== category.id"
                        type="button"
                        class="ui-button-ghost h-9 px-4 text-xs disabled:opacity-40"
                        :disabled="isSubmitting"
                        @click="startEdit(category)"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        class="ui-button-danger h-9 px-4 text-xs disabled:opacity-40"
                        :disabled="isSubmitting"
                        @click="removeCategory(category)"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  <div v-if="editingId === category.id" class="ui-toolbar justify-between">
                    <input v-model="editName" type="text" class="ui-input min-w-[12rem] flex-1" placeholder="카테고리명 수정" />
                    <div class="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        class="ui-button-accent h-10 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                        :disabled="isSubmitting"
                        @click="submitEdit(category)"
                      >
                        저장
                      </button>
                      <button type="button" class="ui-button-ghost h-10 px-4 text-xs" :disabled="isSubmitting" @click="cancelEdit">취소</button>
                    </div>
                  </div>
                </div>

                <div v-if="categories.length === 0" class="ui-state ui-state-empty px-4 py-10">등록된 카테고리가 없습니다.</div>
              </div>
            </section>

            <section class="ui-panel p-5">
              <div class="dark:border-line/80 flex items-center justify-between gap-3 border border-b border-line bg-surface-soft pb-3">
                <div>
                  <p class="ui-eyebrow">Create</p>
                  <h2 class="bbs-row-title mt-1 text-lg">카테고리 추가</h2>
                </div>
              </div>

              <div class="mt-6 grid gap-4">
                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  카테고리명
                  <input v-model="createName" type="text" class="ui-input" placeholder="예: 자유" />
                </label>
              </div>

              <div class="ui-toolbar mt-5 justify-between text-xs text-muted">
                <span>등록 후 목록에 즉시 반영됩니다.</span>
                <button
                  type="button"
                  class="ui-button-accent h-11 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
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
    </PageContainer>
  </AppShell>
</template>
