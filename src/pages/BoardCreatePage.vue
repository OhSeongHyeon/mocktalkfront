<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ApiError } from '../shared/lib/http/api';
import { BOARD_ARTICLE_WRITE_POLICY_OPTIONS, type BoardArticleWritePolicy } from '../entities/board/lib/boardWritePolicy';
import { resolveBoardVisibilityOptions, type BoardVisibility } from '../entities/board/lib/boardVisibility';
import { createBoard, uploadBoardImage } from '../entities/board';
import { isAdmin } from '../stores/auth';
import PageContainer from '../shared/ui/PageContainer.vue';
import AppShell from '../widgets/layout/AppShell.vue';
import boardPlaceholderIcon from '../assets/icons/icon-board-placeholder.svg';

const router = useRouter();

const form = reactive({
  boardName: '',
  slug: '',
  description: '',
  visibility: 'PUBLIC' as BoardVisibility,
  articleWritePolicy: 'ALL_AUTHENTICATED' as BoardArticleWritePolicy,
  boardImage: null as File | null,
});

const previewUrl = ref<string | null>(null);
const errorMessage = ref('');
const successMessage = ref('');
const isSubmitting = ref(false);
const visibilityOptions = computed(() => resolveBoardVisibilityOptions(isAdmin.value));

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
      articleWritePolicy: form.articleWritePolicy,
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
  <AppShell>
    <PageContainer width="narrow">
      <div class="space-y-6">
        <section class="ui-panel p-6 sm:p-7">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-2">
              <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">커뮤니티 개설</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">게시판명, 슬러그, 공개 범위를 설정하고 필요하면 대표 이미지를 등록하세요.</p>
            </div>
            <span
              class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
            >
              개설 시 20,000P 차감
            </span>
          </div>
        </section>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <section class="ui-panel p-6 sm:p-7">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">기본 정보</h2>
              <span class="text-xs text-slate-400">필수 항목</span>
            </div>

            <div class="mt-5 grid gap-5 md:grid-cols-2">
              <label for="board-name" class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                게시판명
                <input id="board-name" v-model="form.boardName" type="text" placeholder="예: 자유게시판" class="ui-input" />
              </label>

              <label for="board-slug" class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                슬러그
                <input id="board-slug" v-model="form.slug" type="text" placeholder="예: free-talk" class="ui-input" />
                <span class="text-xs font-normal text-slate-500 dark:text-slate-400">영문 소문자, 숫자, 하이픈 사용을 권장합니다.</span>
              </label>

              <label for="board-visibility" class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                공개 범위
                <select id="board-visibility" v-model="form.visibility" class="ui-input">
                  <option v-for="option in visibilityOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label for="board-article-write-policy" class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                게시글 작성 권한
                <select id="board-article-write-policy" v-model="form.articleWritePolicy" class="ui-input">
                  <option v-for="option in BOARD_ARTICLE_WRITE_POLICY_OPTIONS" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label for="board-description" class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
                설명
                <textarea
                  id="board-description"
                  v-model="form.description"
                  rows="4"
                  placeholder="게시판 소개를 입력하세요."
                  class="ui-textarea"
                ></textarea>
              </label>
            </div>
          </section>

          <section class="ui-panel p-6 sm:p-7">
            <div class="flex items-center justify-between gap-2">
              <div>
                <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">대표 이미지</h2>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">JPG/PNG 등 이미지 파일만 업로드 가능합니다.</p>
              </div>
              <button v-if="form.boardImage" type="button" class="ui-chip-button ui-chip-button-muted" @click="clearImage">선택 해제</button>
            </div>

            <div class="mt-5 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
              <div class="ui-sub-panel aspect-[4/3] overflow-hidden p-2">
                <div class="h-full w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                  <img v-if="previewUrl" :src="previewUrl" alt="대표 이미지 미리보기" class="h-full w-full object-cover" />
                  <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                    <img :src="boardPlaceholderIcon" alt="" aria-hidden="true" class="h-6 w-6" />
                    <span class="text-xs">이미지 미리보기</span>
                  </div>
                </div>
              </div>

              <div class="ui-sub-panel flex flex-col justify-center gap-3 p-4">
                <input
                  id="board-image"
                  type="file"
                  accept="image/*"
                  class="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border file:border-slate-200 file:bg-slate-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:border-slate-300 hover:file:bg-slate-100 dark:text-slate-300 dark:file:border-slate-700 dark:file:bg-slate-800 dark:file:text-slate-100 dark:hover:file:border-slate-600 dark:hover:file:bg-slate-700"
                  aria-label="대표 이미지 업로드"
                  @change="handleImageChange"
                />
                <p class="text-xs text-slate-500 dark:text-slate-400">파일 크기는 50MB 이하여야 합니다.</p>
              </div>
            </div>
          </section>

          <p v-if="errorMessage" class="ui-state ui-state-danger" role="alert">
            {{ errorMessage }}
          </p>
          <p
            v-if="successMessage"
            class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
          >
            {{ successMessage }}
          </p>

          <div class="flex items-center justify-end">
            <button
              type="submit"
              class="ui-chip-button border-slate-900 bg-slate-900 px-6 py-3 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? '개설 중...' : '커뮤니티 개설' }}
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  </AppShell>
</template>
