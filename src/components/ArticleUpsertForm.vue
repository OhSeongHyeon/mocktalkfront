<script setup lang="ts">
import { computed } from 'vue';

import ArticleEditor from './ArticleEditor.vue';
import type { BoardCategoryResponse } from '../services/boardCategories';

interface VisibilityOption {
  value: string;
  label: string;
}

interface ArticleUpsertFormProps {
  title: string;
  content: string;
  visibility: string;
  selectedCategoryId: number | null;
  categories: BoardCategoryResponse[];
  visibilityOptions: VisibilityOption[];
  isCategoryLoading: boolean;
  isCategoryAccessDenied: boolean;
  categoryErrorMessage: string;
  canManageCategories: boolean;
  isSubmitting: boolean;
  isInvalid: boolean;
  isSubmitBlocked: boolean;
  submitPermissionMessage?: string;
}

const props = defineProps<ArticleUpsertFormProps>();

const emit = defineEmits<{
  (event: 'update:title', value: string): void;
  (event: 'update:content', value: string): void;
  (event: 'update:visibility', value: string): void;
  (event: 'update:selectedCategoryId', value: number | null): void;
  (event: 'submit'): void;
  (event: 'cancel'): void;
}>();

const titleModel = computed({
  get: () => props.title,
  set: (value: string) => emit('update:title', value),
});

const contentModel = computed({
  get: () => props.content,
  set: (value: string) => emit('update:content', value),
});

const visibilityModel = computed({
  get: () => props.visibility,
  set: (value: string) => emit('update:visibility', value),
});

const categoryIdModel = computed({
  get: () => props.selectedCategoryId,
  set: (value: number | null) => emit('update:selectedCategoryId', value),
});

const hasPermissionMessage = computed(() => {
  return Boolean(props.submitPermissionMessage && props.submitPermissionMessage.trim());
});
</script>

<template>
  <div class="mt-6 space-y-6">
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div class="flex flex-col gap-4">
        <label class="text-sm font-semibold text-slate-700 dark:text-slate-200">
          제목
          <input
            v-model="titleModel"
            type="text"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            placeholder="제목을 입력하세요"
          />
        </label>

        <div class="flex flex-col gap-4">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-200">
            카테고리
            <select
              v-model="categoryIdModel"
              class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              :disabled="isCategoryLoading || isCategoryAccessDenied || categories.length === 0"
            >
              <option :value="null">선택 안 함</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.categoryName }}
              </option>
            </select>
            <p v-if="isCategoryLoading" class="mt-1 text-xs text-slate-500 dark:text-slate-400">카테고리 목록을 불러오는 중입니다...</p>
            <p v-else-if="isCategoryAccessDenied" class="mt-1 text-xs text-slate-500 dark:text-slate-400">카테고리 목록을 조회할 수 없습니다.</p>
            <p v-else-if="categoryErrorMessage" class="mt-1 text-xs text-rose-500">{{ categoryErrorMessage }}</p>
            <p v-else-if="categories.length === 0" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              등록된 카테고리가 없습니다.
              <span v-if="canManageCategories">커뮤니티 관리에서 카테고리를 등록해 주세요.</span>
            </p>
          </label>

          <label class="text-sm font-semibold text-slate-700 dark:text-slate-200">
            공개 범위
            <select
              v-model="visibilityModel"
              class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option v-for="option in visibilityOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>
      </div>
    </section>

    <section>
      <ArticleEditor v-model="contentModel" placeholder="본문을 입력하세요." />
    </section>

    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isSubmitting || isInvalid || isSubmitBlocked"
        @click="$emit('submit')"
      >
        저장
      </button>
      <button
        type="button"
        class="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
        @click="$emit('cancel')"
      >
        취소
      </button>
      <span v-if="hasPermissionMessage" class="text-xs text-rose-500">
        {{ submitPermissionMessage }}
      </span>
    </div>
  </div>
</template>
