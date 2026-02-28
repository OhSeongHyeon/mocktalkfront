<script setup lang="ts">
import { computed, ref } from 'vue';

import ArticleEditor from './ArticleEditor.vue';
import { ATTACHMENT_ALLOWED_EXTENSION_LABEL, ATTACHMENT_FILE_ACCEPT } from '../lib/attachments/attachmentPolicy';
import type { BoardCategoryResponse } from '../services/boardCategories';
import type { FileResponse } from '../services/files';

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
  attachments: FileResponse[];
  isAttachmentUploading: boolean;
  attachmentErrorMessage: string;
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
  (event: 'addAttachments', files: File[]): void;
  (event: 'removeAttachment', fileId: number): void;
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

const attachmentInputRef = ref<HTMLInputElement | null>(null);
const isAttachmentExpanded = ref(true);

const formatFileSize = (size: number) => {
  if (!Number.isFinite(size)) {
    return '-';
  }
  if (size < 1024) {
    return `${size}B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)}KB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  }
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)}GB`;
};

const openAttachmentPicker = () => {
  attachmentInputRef.value?.click();
};

const onAttachmentPicked = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const files = target?.files ? Array.from(target.files) : [];
  if (files.length > 0) {
    emit('addAttachments', files);
  }
  if (target) {
    target.value = '';
  }
};

const removeAttachment = (fileId: number) => {
  emit('removeAttachment', fileId);
};
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

    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          :aria-expanded="isAttachmentExpanded ? 'true' : 'false'"
          aria-controls="article-upsert-attachment-panel"
          @click="isAttachmentExpanded = !isAttachmentExpanded"
        >
          <span>첨부파일 {{ attachments.length }}개</span>
          <span>{{ isAttachmentExpanded ? '접기' : '펼치기' }}</span>
        </button>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
            :disabled="isSubmitting || isAttachmentUploading"
            @click="openAttachmentPicker"
          >
            파일 추가
          </button>
        </div>
      </div>
      <div v-show="isAttachmentExpanded" id="article-upsert-attachment-panel" class="mt-2">
        <p class="text-xs text-slate-500 dark:text-slate-400">최대 50MB</p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">허용 확장자: {{ ATTACHMENT_ALLOWED_EXTENSION_LABEL }}</p>
        <p class="mt-1 text-xs font-medium text-amber-600 dark:text-amber-300">
          첨부파일 업로드 시 원본 파일을 저장하기 때문에 메타데이터가 보존됩니다. 민감정보에 유의하세요.
        </p>
        <p v-if="isAttachmentUploading" class="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-300">첨부파일 업로드 중...</p>
        <p v-if="attachmentErrorMessage" class="mt-2 text-xs font-semibold text-rose-500">{{ attachmentErrorMessage }}</p>
        <div
          v-if="attachments.length === 0"
          class="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
        >
          첨부파일이 없습니다.
        </div>
        <div v-else class="mt-3 space-y-2">
          <div
            v-for="file in attachments"
            :key="file.id"
            class="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
          >
            <div class="min-w-0">
              <p class="truncate font-medium text-slate-800 dark:text-slate-100">{{ file.fileName }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ file.mimeType }} · {{ formatFileSize(file.fileSize) }}</p>
            </div>
            <button
              type="button"
              class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
              :disabled="isSubmitting || isAttachmentUploading"
              @click="removeAttachment(file.id)"
            >
              제거
            </button>
          </div>
        </div>
      </div>
      <input ref="attachmentInputRef" type="file" class="hidden" :accept="ATTACHMENT_FILE_ACCEPT" multiple @change="onAttachmentPicked" />
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
