<script setup lang="ts">
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

const visibilityOptions = [
  { value: 'PUBLIC', label: '전체 공개' },
  { value: 'GROUP', label: '회원 공개' },
  { value: 'PRIVATE', label: '비공개' },
  { value: 'UNLISTED', label: '비공개(링크 공개)' },
];
const visibilityFilterOptions: Array<BoardVisibility | 'ALL'> = ['ALL', 'PUBLIC', 'GROUP', 'PRIVATE', 'UNLISTED'];
const sortOptions: Array<{ value: 'DESC' | 'ASC'; label: string }> = [
  { value: 'DESC', label: '최신순' },
  { value: 'ASC', label: '오래된 순' },
];
const sortByOptions: Array<{ value: 'CREATED_AT' | 'UPDATED_AT'; label: string }> = [
  { value: 'CREATED_AT', label: '생성일' },
  { value: 'UPDATED_AT', label: '수정일' },
];

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

const visibilityLabel = (value: string) => {
  if (value === 'PUBLIC') {
    return '전체 공개';
  }
  if (value === 'GROUP') {
    return '회원 공개';
  }
  if (value === 'PRIVATE') {
    return '비공개';
  }
  return '비공개(링크 공개)';
};

const filterSummary = computed(() => {
  const parts: string[] = [];
  if (visibilityFilter.value !== 'ALL') {
    parts.push(`공개 범위 ${visibilityLabel(visibilityFilter.value)}`);
  }
  if (includeDeleted.value) {
    parts.push('삭제 포함');
  }
  const sortLabel = sortOrder.value === 'DESC' ? '최신순' : '오래된 순';
  const sortByLabel = sortBy.value === 'UPDATED_AT' ? '수정일' : '생성일';
  parts.push(`정렬 ${sortByLabel} ${sortLabel}`);
  if (keyword.value.trim()) {
    parts.push(`검색 ${keyword.value.trim()}`);
  }
  return parts.length ? parts.join(' · ') : '전체 게시판';
});

const resolveBoardErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    if (error.message.includes('uq_tb_boards_slug')) {
      return '이미 사용 중인 슬러그입니다.';
    }
    if (error.message.includes('uq_tb_boards_board_name')) {
      return '이미 사용 중인 게시판명입니다.';
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
    listError.value = error instanceof ApiError ? error.message : '게시판 목록을 불러오지 못했습니다.';
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
  if (!window.confirm(`"${selectedBoard.value.boardName}" 게시판을 삭제할까요?`)) {
    return;
  }
  editError.value = '';
  editSuccess.value = '';
  isUpdating.value = true;
  try {
    await deleteAdminBoard(selectedBoard.value.id);
    editSuccess.value = '게시판이 삭제되었습니다.';
    await loadBoards();
    selectedBoardId.value = null;
  } catch (error) {
    editError.value = resolveBoardErrorMessage(error, '게시판 삭제에 실패했습니다.');
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
    createError.value = '게시판명을 입력해주세요.';
    return;
  }
  if (!slug) {
    createError.value = '슬러그를 입력해주세요.';
    return;
  }
  if (boardName.length > 255) {
    createError.value = '게시판명은 255자 이하로 입력해주세요.';
    return;
  }
  if (slug.length > 80) {
    createError.value = '슬러그는 80자 이하로 입력해주세요.';
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
        createError.value = error instanceof ApiError ? error.message : '게시판은 생성됐지만 대표 이미지 업로드에 실패했습니다.';
      }
    }

    createSuccess.value = '게시판이 생성되었습니다.';
    createForm.boardName = '';
    createForm.slug = '';
    createForm.description = '';
    createForm.visibility = 'PUBLIC';
    resetCreateImage();
    page.value = 0;
    await loadBoards();
    selectedBoardId.value = created.id;
  } catch (error) {
    createError.value = resolveBoardErrorMessage(error, '게시판 생성에 실패했습니다.');
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
    editError.value = '게시판명을 입력해주세요.';
    return;
  }
  if (!slug) {
    editError.value = '슬러그를 입력해주세요.';
    return;
  }
  if (boardName.length > 255) {
    editError.value = '게시판명은 255자 이하로 입력해주세요.';
    return;
  }
  if (slug.length > 80) {
    editError.value = '슬러그는 80자 이하로 입력해주세요.';
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
    editSuccess.value = '게시판 정보가 저장되었습니다.';
  } catch (error) {
    editError.value = resolveBoardErrorMessage(error, '게시판 수정에 실패했습니다.');
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
    imageSuccess.value = '대표 이미지가 업로드되었습니다.';
    resetEditImage();
  } catch (error) {
    imageError.value = resolveBoardErrorMessage(error, '대표 이미지 업로드에 실패했습니다.');
  } finally {
    isUploading.value = false;
  }
};

const deleteImage = async () => {
  if (!selectedBoard.value || !selectedBoard.value.boardImage) {
    return;
  }
  if (!window.confirm('대표 이미지를 삭제할까요?')) {
    return;
  }
  imageError.value = '';
  imageSuccess.value = '';
  isRemoving.value = true;
  try {
    const updated = await deleteAdminBoardImage(selectedBoard.value.id);
    applyBoardUpdate(updated);
    imageSuccess.value = '대표 이미지가 삭제되었습니다.';
    resetEditImage();
  } catch (error) {
    imageError.value = resolveBoardErrorMessage(error, '대표 이미지 삭제에 실패했습니다.');
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
        <PageHeader eyebrow="Admin Boards" title="게시판 관리" description="전체 게시판 목록, 생성, 수정, 대표 이미지 관리를 한 화면에서 처리합니다.">
          <template #meta>
            <span class="ui-badge ui-badge-muted">현재 페이지 {{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
            <span class="ui-badge ui-badge-accent">표시 {{ boards.length }}건</span>
            <span class="text-xs text-muted">{{ filterSummary }}</span>
          </template>
          <div class="grid gap-3 md:grid-cols-3">
            <div class="ui-data-panel p-4">
              <p class="ui-eyebrow">Filter</p>
              <p class="bbs-row-title mt-2 text-sm">
                {{ visibilityFilter === 'ALL' ? '전체 공개 범위' : visibilityLabel(visibilityFilter) }}
              </p>
              <p class="mt-1 text-xs text-muted">
                삭제 포함 {{ includeDeleted ? 'ON' : 'OFF' }} · 정렬 {{ sortBy === 'UPDATED_AT' ? '수정일' : '생성일' }}
              </p>
            </div>
            <div class="ui-data-panel p-4">
              <p class="ui-eyebrow">Selected</p>
              <p class="bbs-row-title mt-2 text-sm">
                {{ selectedBoard ? selectedBoard.boardName : '게시판 미선택' }}
              </p>
              <p class="mt-1 text-xs text-muted">우측 편집 패널은 선택한 게시판 기준으로 동작합니다.</p>
            </div>
            <div class="ui-data-panel p-4">
              <p class="ui-eyebrow">Create</p>
              <p class="bbs-row-title mt-2 text-sm">새 게시판 생성</p>
              <p class="mt-1 text-xs text-muted">슬러그와 공개 범위를 지정한 뒤 바로 생성할 수 있습니다.</p>
            </div>
          </div>
        </PageHeader>

        <div class="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <section class="ui-panel p-5">
            <div class="bg-surface-soft flex items-center justify-between gap-3 border border-b border-line pb-3 dark:border-line">
              <div>
                <h2 class="bbs-row-title text-lg">게시판 목록</h2>
                <p class="mt-1 text-sm text-muted">필터와 검색을 적용한 결과만 좌측 큐에 표시합니다.</p>
              </div>
              <span class="ui-badge ui-badge-muted">총 {{ boards.length }}건</span>
            </div>

            <div class="ui-toolbar mt-4">
              <select v-model="visibilityFilter" class="ui-select min-w-[10rem]">
                <option v-for="option in visibilityFilterOptions" :key="option" :value="option">
                  {{ option === 'ALL' ? '전체 공개 범위' : visibilityLabel(option) }}
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
                삭제 포함
              </label>
              <input v-model="keyword" type="search" class="ui-input min-w-[13rem] flex-1" placeholder="게시판명 또는 슬러그 검색" />
              <button type="button" class="ui-button-primary h-10 px-4 text-xs" @click="applyFilters">적용</button>
            </div>
            <p class="mt-2 text-xs text-subtle">{{ filterSummary }}</p>

            <div v-if="listError" class="ui-state ui-state-danger mt-4">
              {{ listError }}
            </div>

            <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-muted">
              <span class="dark:bg-surface-soft0 h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)]"></span>
              불러오는 중...
            </div>

            <div v-else class="mt-4 flex flex-col gap-3">
              <button
                v-for="item in boards"
                :key="item.id"
                type="button"
                class="ui-list-row text-left"
                :class="[item.id === selectedBoardId ? '/80 border-[color:var(--line-strong)] bg-white/95 shadow-sm' : '']"
                @click="selectBoard(item.id)"
              >
                <div class="grid gap-3 md:grid-cols-[3.5rem_minmax(0,1fr)_auto] md:items-start">
                  <div class="bg-surface-soft h-14 overflow-hidden rounded-2xl">
                    <FileImage
                      v-if="item.boardImage"
                      :file="item.boardImage"
                      variant="thumb"
                      alt="게시판 대표 이미지"
                      class="h-full w-full object-cover"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center text-xs font-semibold text-subtle">NO</div>
                  </div>

                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span :class="item.deletedAt ? 'ui-badge ui-badge-danger' : 'ui-badge ui-badge-success'">
                        {{ item.deletedAt ? '삭제됨' : '활성' }}
                      </span>
                      <span class="ui-badge ui-badge-muted">{{ visibilityLabel(item.visibility) }}</span>
                      <span>ID {{ item.id }}</span>
                    </div>

                    <div class="mt-2 flex flex-wrap items-center gap-2">
                      <span class="bbs-row-title text-sm">{{ item.boardName }}</span>
                      <span class="text-xs text-subtle">/b/{{ item.slug }}</span>
                    </div>
                    <p class="mt-2 line-clamp-2 text-xs leading-5 text-muted">{{ item.description || '설명이 없습니다.' }}</p>
                  </div>

                  <div class="text-xs text-subtle md:text-right">
                    <p>생성 {{ formatDate(item.createdAt) }}</p>
                    <p class="mt-1">수정 {{ formatDate(item.updatedAt) }}</p>
                  </div>
                </div>
              </button>

              <div v-if="boards.length === 0" class="ui-state ui-state-empty px-4 py-10">등록된 게시판이 없습니다.</div>
            </div>

            <div class="ui-toolbar mt-4 justify-between text-sm text-muted">
              <button type="button" class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-40" :disabled="page === 0" @click="movePage(-1)">
                이전
              </button>
              <span>{{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
              <button
                type="button"
                class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-40"
                :disabled="page + 1 >= totalPages"
                @click="movePage(1)"
              >
                다음
              </button>
            </div>
          </section>

          <div class="flex flex-col gap-6">
            <section class="ui-panel p-5">
              <div class="bg-surface-soft flex items-center justify-between gap-3 border border-b border-line pb-3 dark:border-line">
                <div>
                  <p class="ui-eyebrow">Create</p>
                  <h2 class="bbs-row-title mt-1 text-lg">새 게시판 생성</h2>
                </div>
              </div>

              <form class="mt-6 space-y-4" @submit.prevent="submitCreate">
                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  게시판명
                  <input v-model="createForm.boardName" type="text" maxlength="255" class="ui-input" placeholder="게시판 이름을 입력하세요" />
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  슬러그
                  <input v-model="createForm.slug" type="text" maxlength="80" class="ui-input" placeholder="예: notice" />
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  공개 범위
                  <select v-model="createForm.visibility" class="ui-select">
                    <option v-for="option in visibilityOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  게시판 설명
                  <textarea v-model="createForm.description" rows="3" class="ui-textarea" placeholder="게시판 소개를 입력하세요"></textarea>
                </label>

                <div class="bg-surface-soft/70 rounded-2xl border border-dashed border-line p-4 dark:border-line">
                  <div class="flex items-center justify-between text-sm font-semibold text-muted">
                    대표 이미지(선택)
                    <span class="text-xs text-subtle">생성 후 업로드</span>
                  </div>
                  <div class="mt-3 flex flex-col gap-3">
                    <div class="bg-surface-soft overflow-hidden rounded-2xl">
                      <img v-if="createPreviewUrl" :src="createPreviewUrl" alt="대표 이미지 미리보기" class="h-40 w-full object-cover" />
                      <div v-else class="flex h-40 items-center justify-center text-sm text-subtle">선택된 이미지가 없습니다.</div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <label class="ui-button-ghost h-10 cursor-pointer px-4 text-xs" :for="`admin-create-image-${createFileInputKey}`">
                        이미지 선택
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
                        선택 취소
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="createError" class="ui-state ui-state-danger">
                  {{ createError }}
                </div>
                <div
                  v-if="createSuccess"
                  class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  {{ createSuccess }}
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <button type="submit" class="ui-button-accent h-11 px-6 text-sm disabled:opacity-60" :disabled="isCreating">
                    {{ isCreating ? '생성 중...' : '게시판 생성' }}
                  </button>
                </div>
              </form>
            </section>

            <section class="ui-panel p-5">
              <div class="bg-surface-soft flex items-center justify-between gap-3 border border-b border-line pb-3 dark:border-line">
                <div>
                  <p class="ui-eyebrow">Edit</p>
                  <h2 class="bbs-row-title mt-1 text-lg">선택 게시판 수정</h2>
                </div>
                <span v-if="selectedBoard" class="ui-badge ui-badge-muted">ID {{ selectedBoard.id }}</span>
              </div>

              <div v-if="!selectedBoard" class="ui-state ui-state-empty mt-6 px-4 py-10">목록에서 게시판을 선택해주세요.</div>

              <form v-else class="mt-6 space-y-4" @submit.prevent="submitUpdate">
                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  게시판명
                  <input v-model="editForm.boardName" type="text" maxlength="255" class="ui-input" />
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  슬러그
                  <input v-model="editForm.slug" type="text" maxlength="80" class="ui-input" />
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  공개 범위
                  <select v-model="editForm.visibility" class="ui-select">
                    <option v-for="option in visibilityOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                  게시판 설명
                  <textarea v-model="editForm.description" rows="3" class="ui-textarea"></textarea>
                </label>

                <div class="bg-surface-soft/70 rounded-2xl border border-dashed border-line p-4 dark:border-line">
                  <div class="flex items-center justify-between text-sm font-semibold text-muted">
                    대표 이미지
                    <span class="text-xs text-subtle">{{ selectedBoard.boardImage ? '설정됨' : '없음' }}</span>
                  </div>
                  <div class="mt-3 grid gap-3">
                    <div class="bg-surface-soft overflow-hidden rounded-2xl">
                      <img v-if="editPreviewUrl" :src="editPreviewUrl" alt="대표 이미지 미리보기" class="h-40 w-full object-cover" />
                      <FileImage
                        v-else-if="selectedBoard?.boardImage"
                        :file="selectedBoard.boardImage"
                        variant="medium"
                        alt="대표 이미지 미리보기"
                        class="h-40 w-full object-cover"
                      />
                      <div v-else class="flex h-40 items-center justify-center text-sm text-subtle">대표 이미지가 없습니다.</div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <label class="ui-button-ghost h-10 cursor-pointer px-4 text-xs" :for="`admin-edit-image-${editFileInputKey}`">
                        이미지 선택
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
                        {{ isUploading ? '업로드 중...' : '업로드' }}
                      </button>
                      <button
                        type="button"
                        class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-50"
                        :disabled="!editImageFile"
                        @click="resetEditImage"
                      >
                        선택 취소
                      </button>
                      <button
                        type="button"
                        class="ui-button-danger h-10 px-4 text-xs disabled:opacity-50"
                        :disabled="!selectedBoard.boardImage || isRemoving"
                        @click="deleteImage"
                      >
                        {{ isRemoving ? '삭제 중...' : '이미지 삭제' }}
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="editError" class="ui-state ui-state-danger">
                  {{ editError }}
                </div>
                <div
                  v-if="editSuccess"
                  class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  {{ editSuccess }}
                </div>
                <div v-if="imageError" class="ui-state ui-state-danger">
                  {{ imageError }}
                </div>
                <div
                  v-if="imageSuccess"
                  class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  {{ imageSuccess }}
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <button type="submit" class="ui-button-accent h-11 px-6 text-sm disabled:opacity-60" :disabled="isUpdating">
                    {{ isUpdating ? '저장 중...' : '게시판 저장' }}
                  </button>
                  <button type="button" class="ui-button-danger h-11 px-6 text-sm disabled:opacity-50" :disabled="isUpdating" @click="deleteBoard">
                    게시판 삭제
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
