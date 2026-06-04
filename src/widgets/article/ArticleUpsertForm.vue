<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ArticleContentEditor from '../../features/editor/ui/ArticleContentEditor.vue';
import type { MarkdownImportMetadata } from '../../features/editor/lib/markdownImport';
import type { ArticleContentFormat } from '../../entities/article';
import { ATTACHMENT_ALLOWED_EXTENSION_LABEL, ATTACHMENT_FILE_ACCEPT } from '../../entities/file/lib/attachmentPolicy';
import type { BoardCategoryResponse } from '../../entities/board';
import type { FileResponse } from '../../entities/file';

interface VisibilityOption {
  value: string;
  label: string;
}

interface ArticleUpsertFormProps {
  title: string;
  contentSource: string;
  contentFormat: ArticleContentFormat;
  visibility: string;
  boardSlug?: string;
  allowBoardSlugImport?: boolean;
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
const { t } = useI18n();

const emit = defineEmits<{
  (event: 'update:title', value: string): void;
  (event: 'update:contentSource', value: string): void;
  (event: 'update:contentFormat', value: ArticleContentFormat): void;
  (event: 'update:visibility', value: string): void;
  (event: 'update:selectedCategoryId', value: number | null): void;
  (event: 'addAttachments', files: File[]): void;
  (event: 'removeAttachment', fileId: number): void;
  (event: 'apply-import-metadata', payload: MarkdownImportMetadata): void;
  (event: 'submit'): void;
  (event: 'cancel'): void;
}>();

const titleModel = computed({
  get: () => props.title,
  set: (value: string) => emit('update:title', value),
});

const contentSourceModel = computed({
  get: () => props.contentSource,
  set: (value: string) => emit('update:contentSource', value),
});

const contentFormatModel = computed({
  get: () => props.contentFormat,
  set: (value: ArticleContentFormat) => emit('update:contentFormat', value),
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

const applyImportedMetadata = (metadata: MarkdownImportMetadata) => {
  emit('apply-import-metadata', metadata);
};
</script>

<template>
  <div class="mt-6 space-y-6">
    <section class="ui-panel p-5">
      <div class="flex flex-col gap-4">
        <label class="text-sm font-semibold text-ink">
          {{ t('editor.upsert.title') }}
          <input
            v-model="titleModel"
            type="text"
            class="mt-2 w-full rounded-xl border border-line bg-surface px-4 py-2 text-sm text-ink focus:border-[color:var(--accent-strong)] focus:outline-none dark:border-line"
            :placeholder="t('editor.upsert.titlePlaceholder')"
          />
        </label>

        <div class="flex flex-col gap-4">
          <label class="text-sm font-semibold text-ink">
            {{ t('editor.upsert.category') }}
            <select
              v-model="categoryIdModel"
              class="mt-2 w-full rounded-xl border border-line bg-surface px-4 py-2 text-sm text-ink focus:border-[color:var(--accent-strong)] focus:outline-none dark:border-line"
              :disabled="isCategoryLoading || isCategoryAccessDenied || categories.length === 0"
            >
              <option :value="null">{{ t('editor.upsert.categoryNone') }}</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.categoryName }}
              </option>
            </select>
            <p v-if="isCategoryLoading" class="mt-1 text-xs text-muted">{{ t('editor.upsert.categoryLoading') }}</p>
            <p v-else-if="isCategoryAccessDenied" class="mt-1 text-xs text-muted">{{ t('editor.upsert.categoryAccessDenied') }}</p>
            <p v-else-if="categoryErrorMessage" class="mt-1 text-xs text-danger">{{ categoryErrorMessage }}</p>
            <p v-else-if="categories.length === 0" class="mt-1 text-xs text-muted">
              {{ t('editor.upsert.categoryEmpty') }}
              <span v-if="canManageCategories">{{ t('editor.upsert.categoryManageHint') }}</span>
            </p>
          </label>

          <label class="text-sm font-semibold text-ink">
            {{ t('editor.upsert.visibility') }}
            <select
              v-model="visibilityModel"
              class="mt-2 w-full rounded-xl border border-line bg-surface px-4 py-2 text-sm text-ink focus:border-[color:var(--accent-strong)] focus:outline-none dark:border-line"
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
      <ArticleContentEditor
        v-model="contentSourceModel"
        v-model:content-format="contentFormatModel"
        :board-slug="boardSlug"
        :available-visibilities="visibilityOptions.map((option) => option.value)"
        :allow-board-slug-import="allowBoardSlugImport"
        :placeholder="t('editor.placeholder.body')"
        @apply-import-metadata="applyImportedMetadata"
      />
    </section>

    <section class="ui-panel p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-line hover:bg-surface-soft dark:border-line"
          :aria-expanded="isAttachmentExpanded ? 'true' : 'false'"
          aria-controls="article-upsert-attachment-panel"
          @click="isAttachmentExpanded = !isAttachmentExpanded"
        >
          <span>{{ t('editor.upsert.attachments', { count: attachments.length }) }}</span>
          <span>{{ isAttachmentExpanded ? t('editor.upsert.collapse') : t('editor.upsert.expand') }}</span>
        </button>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-ink transition hover:border-line hover:bg-surface-soft dark:border-line"
            :disabled="isSubmitting || isAttachmentUploading"
            @click="openAttachmentPicker"
          >
            {{ t('editor.upsert.addFile') }}
          </button>
        </div>
      </div>
      <div v-show="isAttachmentExpanded" id="article-upsert-attachment-panel" class="mt-2">
        <p class="text-xs text-muted">{{ t('editor.upload.maxSize') }}</p>
        <p class="mt-1 text-xs text-muted">{{ t('editor.upsert.allowedExtensions', { extensions: ATTACHMENT_ALLOWED_EXTENSION_LABEL }) }}</p>
        <p class="mt-1 text-xs font-medium text-amber-600 dark:text-amber-300">
          {{ t('editor.upsert.attachmentPrivacy') }}
        </p>
        <p v-if="isAttachmentUploading" class="mt-2 text-xs font-semibold text-success">{{ t('editor.upsert.attachmentUploading') }}</p>
        <p v-if="attachmentErrorMessage" class="mt-2 text-xs font-semibold text-danger">{{ attachmentErrorMessage }}</p>
        <div
          v-if="attachments.length === 0"
          class="mt-3 rounded-xl border border-dashed border-line px-4 py-4 text-sm text-muted dark:border-line dark:text-subtle"
        >
          {{ t('editor.upsert.attachmentEmpty') }}
        </div>
        <div v-else class="mt-3 space-y-2">
          <div
            v-for="file in attachments"
            :key="file.id"
            class="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm dark:border-line"
          >
            <div class="min-w-0">
              <p class="truncate font-medium text-ink">{{ file.fileName }}</p>
              <p class="text-xs text-muted">{{ file.mimeType }} · {{ formatFileSize(file.fileSize) }}</p>
            </div>
            <button
              type="button"
              class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
              :disabled="isSubmitting || isAttachmentUploading"
              @click="removeAttachment(file.id)"
            >
              {{ t('editor.upsert.remove') }}
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
        {{ t('editor.upsert.save') }}
      </button>
      <button
        type="button"
        class="rounded-full border border-line px-5 py-2 text-sm font-semibold text-muted transition hover:border-line hover:text-ink dark:border-line dark:text-subtle dark:hover:text-ink"
        @click="$emit('cancel')"
      >
        {{ t('editor.upsert.cancel') }}
      </button>
      <span v-if="hasPermissionMessage" class="text-xs text-danger">
        {{ submitPermissionMessage }}
      </span>
    </div>
  </div>
</template>
