<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';

import BoardAdminNav from '../components/BoardAdminNav.vue';
import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { resolveFileUrl } from '../lib/files';
import { getBoardBySlug } from '../services/boards';
import type { BoardDetailResponse, BoardMemberStatus, BoardResponse } from '../services/boards';
import { deleteBoardAdminImage, updateBoardSettings, uploadBoardAdminImage } from '../services/boardSettings';
import { isAdmin } from '../stores/auth';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

type BoardVisibility = 'PUBLIC' | 'GROUP' | 'PRIVATE' | 'UNLISTED';

const route = useRoute();
const isMobileMenuOpen = ref(false);
const board = ref<BoardDetailResponse | null>(null);
const boardError = ref('');
const formError = ref('');
const formSuccess = ref('');
const imageError = ref('');
const imageSuccess = ref('');
const isSaving = ref(false);
const isUploading = ref(false);
const isRemoving = ref(false);
const previewUrl = ref<string | null>(null);
const imageFile = ref<File | null>(null);
const fileInputKey = ref(0);

const form = reactive({
  boardName: '',
  description: '',
  visibility: 'PUBLIC' as BoardVisibility,
});

const visibilityOptions = [
  { value: 'PUBLIC', label: '전체 공개' },
  { value: 'GROUP', label: '회원 공개' },
  { value: 'PRIVATE', label: '비공개' },
  { value: 'UNLISTED', label: '비공개(링크 공개)' },
];

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

const currentImageUrl = computed(() => resolveFileUrl(board.value?.boardImage?.storageKey ?? null));
const previewImageUrl = computed(() => previewUrl.value ?? currentImageUrl.value);

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
};

const loadBoard = async () => {
  boardError.value = '';
  try {
    board.value = await getBoardBySlug(boardSlug.value);
    if (!hasPermission.value) {
      boardError.value = '게시판 관리자 권한이 없습니다.';
      return;
    }
    form.boardName = board.value.boardName;
    form.description = board.value.description ?? '';
    form.visibility = board.value.visibility as BoardVisibility;
  } catch (error) {
    boardError.value = error instanceof ApiError ? error.message : '게시판 정보를 불러오지 못했습니다.';
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
    formError.value = '게시판명을 입력해주세요.';
    return;
  }
  if (boardNameValue.length > 255) {
    formError.value = '게시판명은 255자 이하로 입력해주세요.';
    return;
  }
  isSaving.value = true;
  try {
    const updated = await updateBoardSettings(board.value.id, {
      boardName: boardNameValue,
      description: form.description.trim() ? form.description.trim() : null,
      visibility: form.visibility,
    });
    applyBoardUpdate(updated);
    formSuccess.value = '게시판 설정이 저장되었습니다.';
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : '게시판 설정 저장에 실패했습니다.';
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
    imageSuccess.value = '대표 이미지가 업로드되었습니다.';
    clearSelectedImage();
  } catch (error) {
    imageError.value = error instanceof ApiError ? error.message : '대표 이미지 업로드에 실패했습니다.';
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
  if (!window.confirm('대표 이미지를 삭제할까요?')) {
    return;
  }
  isRemoving.value = true;
  try {
    const updated = await deleteBoardAdminImage(board.value.id);
    applyBoardUpdate(updated);
    imageSuccess.value = '대표 이미지가 삭제되었습니다.';
    clearSelectedImage();
  } catch (error) {
    imageError.value = error instanceof ApiError ? error.message : '대표 이미지 삭제에 실패했습니다.';
  } finally {
    isRemoving.value = false;
  }
};

onMounted(async () => {
  await nextTick();
  await loadBoard();
});

onBeforeUnmount(() => {
  clearPreviewUrl();
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-6xl space-y-6">
          <BoardAdminNav v-if="board && hasPermission" :slug="board.slug" :board-name="boardName" active="settings" />

          <div
            v-if="boardError"
            class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ boardError }}
          </div>

          <div v-if="board && hasPermission" class="space-y-6">
            <div>
              <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">게시판 설정</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">게시판의 기본 정보와 대표 이미지를 관리합니다.</p>
            </div>

            <section class="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">기본 정보</h2>
                <span class="text-xs text-slate-400">게시판 ID {{ board.id }}</span>
              </div>

              <form class="mt-6 grid gap-4 md:grid-cols-2" @submit.prevent="submitSettings">
                <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  게시판명
                  <input
                    v-model="form.boardName"
                    type="text"
                    maxlength="255"
                    class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="게시판 이름을 입력하세요"
                  />
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  공개 범위
                  <select
                    v-model="form.visibility"
                    class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option v-for="option in visibilityOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
                  게시판 설명
                  <textarea
                    v-model="form.description"
                    rows="4"
                    class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="게시판 소개를 입력하세요"
                  ></textarea>
                </label>

                <div
                  v-if="formError"
                  class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 md:col-span-2"
                >
                  {{ formError }}
                </div>
                <div
                  v-if="formSuccess"
                  class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 md:col-span-2"
                >
                  {{ formSuccess }}
                </div>

                <div class="flex flex-wrap items-center gap-3 md:col-span-2">
                  <button
                    type="submit"
                    class="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
                    :disabled="isSaving"
                  >
                    {{ isSaving ? '저장 중...' : '설정 저장' }}
                  </button>
                </div>
              </form>
            </section>

            <section class="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">대표 이미지</h2>
                <span class="text-xs text-slate-400">현재 {{ board.boardImage ? '설정됨' : '없음' }}</span>
              </div>

              <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
                <div class="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <div class="relative overflow-hidden rounded-2xl bg-slate-100">
                    <img v-if="previewImageUrl" :src="previewImageUrl" alt="대표 이미지 미리보기" class="h-48 w-full object-cover" />
                    <div v-else class="flex h-48 items-center justify-center text-sm text-slate-400">대표 이미지가 없습니다.</div>
                  </div>
                </div>

                <div class="flex flex-col gap-4">
                  <p class="text-sm text-slate-600 dark:text-slate-300">
                    대표 이미지는 게시판 카드와 상단 헤더에 노출됩니다. 이미지를 교체하면 이전 이미지는 삭제됩니다.
                  </p>

                  <div class="flex flex-wrap gap-2">
                    <label
                      class="cursor-pointer rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
                      :for="`board-admin-image-${fileInputKey}`"
                    >
                      이미지 선택
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
                      class="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
                      :disabled="!imageFile || isUploading"
                      @click="uploadImage"
                    >
                      {{ isUploading ? '업로드 중...' : '업로드' }}
                    </button>
                    <button
                      type="button"
                      class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                      :disabled="!imageFile"
                      @click="clearSelectedImage"
                    >
                      선택 취소
                    </button>
                    <button
                      type="button"
                      class="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:opacity-50 dark:border-rose-900/60 dark:text-rose-200"
                      :disabled="!board.boardImage || isRemoving"
                      @click="removeImage"
                    >
                      {{ isRemoving ? '삭제 중...' : '이미지 삭제' }}
                    </button>
                  </div>

                  <div
                    v-if="imageError"
                    class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
                  >
                    {{ imageError }}
                  </div>
                  <div
                    v-if="imageSuccess"
                    class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
                  >
                    {{ imageSuccess }}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
