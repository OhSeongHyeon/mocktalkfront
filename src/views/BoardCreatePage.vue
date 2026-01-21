<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { createBoard, uploadBoardImage } from '../services/boards';
import { isAdmin } from '../stores/auth';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';
import boardPlaceholderIcon from '../assets/icons/icon-board-placeholder.svg';

const router = useRouter();
const isMobileMenuOpen = ref(false);

type BoardVisibility = 'PUBLIC' | 'GROUP' | 'PRIVATE' | 'UNLISTED';

const form = reactive({
  boardName: '',
  slug: '',
  description: '',
  visibility: 'PUBLIC' as BoardVisibility,
  boardImage: null as File | null,
});

const previewUrl = ref<string | null>(null);
const errorMessage = ref('');
const successMessage = ref('');
const isSubmitting = ref(false);

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

const handleImageChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0] ?? null;
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = file ? URL.createObjectURL(file) : null;
  form.boardImage = file;
};

const clearImage = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = null;
  form.boardImage = null;
};

const handleSubmit = async () => {
  errorMessage.value = '';
  successMessage.value = '';

  const boardName = form.boardName.trim();
  const slug = form.slug.trim();
  const description = form.description.trim();

  if (!boardName) {
    errorMessage.value = '게시판명을 입력해주세요.';
    return;
  }
  if (!slug) {
    errorMessage.value = '슬러그를 입력해주세요.';
    return;
  }
  if (boardName.length > 255) {
    errorMessage.value = '게시판명은 255자 이하로 입력해주세요.';
    return;
  }
  if (slug.length > 80) {
    errorMessage.value = '슬러그는 80자 이하로 입력해주세요.';
    return;
  }

  isSubmitting.value = true;
  try {
    const created = await createBoard({
      boardName,
      slug,
      description: description ? description : null,
      visibility: form.visibility,
    });

    if (form.boardImage) {
      try {
        await uploadBoardImage(created.id, form.boardImage);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await router.push('/login');
          return;
        }
        errorMessage.value = error instanceof ApiError ? error.message : '게시판은 생성됐지만 대표 이미지 업로드에 실패했습니다.';
        return;
      }
    }

    successMessage.value = '게시판이 생성되었습니다.';
    await router.push(`/b/${created.slug}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await router.push('/login');
      return;
    }
    errorMessage.value = error instanceof ApiError ? error.message : '게시판 생성에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};

onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-3xl">
          <div class="flex flex-col gap-2">
            <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">커뮤니티 개설</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400">게시판을 개설하면 1,000 포인트가 차감됩니다.</p>
          </div>

          <form class="mt-8 flex flex-col gap-6" @submit.prevent="handleSubmit">
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div class="flex flex-col gap-5">
                <div>
                  <label for="board-name" class="text-sm font-medium text-slate-800 dark:text-slate-100"> 게시판명 </label>
                  <input
                    id="board-name"
                    v-model="form.boardName"
                    type="text"
                    placeholder="예: 자유게시판"
                    class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label for="board-slug" class="text-sm font-medium text-slate-800 dark:text-slate-100"> 슬러그 </label>
                  <input
                    id="board-slug"
                    v-model="form.slug"
                    type="text"
                    placeholder="예: free-talk"
                    class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
                  />
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">영문 소문자, 숫자, 하이픈 사용을 권장합니다.</p>
                </div>

                <div>
                  <label for="board-description" class="text-sm font-medium text-slate-800 dark:text-slate-100"> 설명 </label>
                  <textarea
                    id="board-description"
                    v-model="form.description"
                    rows="4"
                    placeholder="게시판 소개를 입력하세요."
                    class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
                  ></textarea>
                </div>

                <div>
                  <label for="board-visibility" class="text-sm font-medium text-slate-800 dark:text-slate-100"> 공개 범위 </label>
                  <select
                    id="board-visibility"
                    v-model="form.visibility"
                    class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
                  >
                    <option value="PUBLIC">공개</option>
                    <option value="GROUP">구독 멤버만</option>
                    <option value="PRIVATE">소유자만</option>
                    <option v-if="isAdmin" value="UNLISTED">운영자만</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-slate-800 dark:text-slate-100">대표 이미지</p>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">JPG/PNG 등 이미지 파일만 업로드 가능합니다.</p>
                  </div>
                  <button
                    v-if="form.boardImage"
                    type="button"
                    class="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    @click="clearImage"
                  >
                    선택 해제
                  </button>
                </div>
                <div class="flex flex-col gap-4 sm:flex-row">
                  <div class="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900 sm:w-60">
                    <img v-if="previewUrl" :src="previewUrl" alt="대표 이미지 미리보기" class="h-full w-full object-cover" />
                    <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                      <img :src="boardPlaceholderIcon" alt="" aria-hidden="true" class="h-6 w-6" />
                      <span class="text-xs">이미지 미리보기</span>
                    </div>
                  </div>
                  <div class="flex flex-1 flex-col justify-center gap-2">
                    <input
                      id="board-image"
                      type="file"
                      accept="image/*"
                      class="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-100 dark:hover:file:bg-slate-700"
                      aria-label="대표 이미지 업로드"
                      @change="handleImageChange"
                    />
                    <p class="text-xs text-slate-500 dark:text-slate-400">파일 크기는 50MB 이하여야 합니다.</p>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="errorMessage"
              class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {{ errorMessage }}
            </div>
            <div
              v-if="successMessage"
              class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              {{ successMessage }}
            </div>

            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="submit"
                class="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isSubmitting"
              >
                {{ isSubmitting ? '개설 중...' : '커뮤니티 개설' }}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  </div>
</template>
