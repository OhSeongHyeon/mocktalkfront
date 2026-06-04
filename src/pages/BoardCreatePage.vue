<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { ApiError } from '../shared/lib/http/api';
import { BOARD_ARTICLE_WRITE_POLICY_VALUES, type BoardArticleWritePolicy } from '../entities/board/lib/boardWritePolicy';
import { resolveBoardVisibilityOptions, type BoardVisibility } from '../entities/board/lib/boardVisibility';
import { createBoard, uploadBoardImage } from '../entities/board';
import { useAuthStore } from '../stores/auth';
import PageContainer from '../shared/ui/PageContainer.vue';
import { LayoutGrid } from '@lucide/vue';

import AppIcon from '../shared/ui/AppIcon.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const { isAdmin } = storeToRefs(authStore);

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
const articleWritePolicyOptions = computed(() =>
  BOARD_ARTICLE_WRITE_POLICY_VALUES.map((value) => ({
    value,
    label: t(`board.writePolicy.option.${value}`),
  })),
);

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
    errorMessage.value = t('admin.boardForm.errors.nameRequired');
    return;
  }
  if (!slug) {
    errorMessage.value = t('admin.boardForm.errors.slugRequired');
    return;
  }
  if (boardName.length > 255) {
    errorMessage.value = t('admin.boardForm.errors.nameMaxLength');
    return;
  }
  if (slug.length > 80) {
    errorMessage.value = t('admin.boardForm.errors.slugMaxLength');
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
        errorMessage.value = error instanceof ApiError ? error.message : t('admin.boardForm.errors.createImageUploadFailed');
        return;
      }
    }

    successMessage.value = t('admin.boardForm.success.created');
    await router.push(`/b/${created.slug}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await router.push('/login');
      return;
    }
    errorMessage.value = error instanceof ApiError ? error.message : t('admin.boardForm.errors.createFailed');
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
              <h1 class="ui-heading-page">{{ t('admin.boardCreate.title') }}</h1>
              <p class="ui-lead">{{ t('admin.boardCreate.description') }}</p>
            </div>
            <span
              class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
            >
              {{ t('admin.boardCreate.pointsCost') }}
            </span>
          </div>
        </section>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <section class="ui-panel p-6 sm:p-7">
            <div class="flex items-center justify-between">
              <h2 class="ui-heading-section">{{ t('admin.boardCreate.basicInfo') }}</h2>
              <span class="ui-caption">{{ t('admin.boardCreate.requiredFields') }}</span>
            </div>

            <div class="mt-5 grid gap-5 md:grid-cols-2">
              <label for="board-name" class="ui-field-label flex flex-col gap-2">
                {{ t('admin.boardForm.boardName') }}
                <input
                  id="board-name"
                  v-model="form.boardName"
                  type="text"
                  :placeholder="t('admin.boardForm.boardNamePlaceholder')"
                  class="ui-input"
                />
              </label>

              <label for="board-slug" class="ui-field-label flex flex-col gap-2">
                {{ t('admin.boardForm.slug') }}
                <input id="board-slug" v-model="form.slug" type="text" :placeholder="t('admin.boardForm.slugPlaceholder')" class="ui-input" />
                <span class="ui-caption font-normal">{{ t('admin.boardForm.slugHint') }}</span>
              </label>

              <label for="board-visibility" class="ui-field-label flex flex-col gap-2">
                {{ t('admin.boardForm.visibility') }}
                <select id="board-visibility" v-model="form.visibility" class="ui-input">
                  <option v-for="option in visibilityOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label for="board-article-write-policy" class="ui-field-label flex flex-col gap-2">
                {{ t('admin.boardForm.articleWritePolicy') }}
                <select id="board-article-write-policy" v-model="form.articleWritePolicy" class="ui-input">
                  <option v-for="option in articleWritePolicyOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label for="board-description" class="ui-field-label flex flex-col gap-2 md:col-span-2">
                {{ t('admin.boardForm.description') }}
                <textarea
                  id="board-description"
                  v-model="form.description"
                  rows="4"
                  :placeholder="t('admin.boardForm.descriptionPlaceholderDot')"
                  class="ui-textarea"
                ></textarea>
              </label>
            </div>
          </section>

          <section class="ui-panel p-6 sm:p-7">
            <div class="flex items-center justify-between gap-2">
              <div>
                <h2 class="ui-heading-section">{{ t('admin.boardForm.featuredImage') }}</h2>
                <p class="ui-caption mt-1">{{ t('admin.boardForm.featuredImageHint') }}</p>
              </div>
              <button v-if="form.boardImage" type="button" class="ui-chip-button ui-chip-button-muted" @click="clearImage">
                {{ t('admin.boardForm.clearSelection') }}
              </button>
            </div>

            <div class="mt-5 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
              <div class="ui-sub-panel aspect-[4/3] overflow-hidden p-2">
                <div class="h-full w-full overflow-hidden rounded-[var(--radius-md)] bg-surface-soft">
                  <img v-if="previewUrl" :src="previewUrl" :alt="t('admin.boardForm.featuredImagePreview')" class="h-full w-full object-cover" />
                  <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-subtle">
                    <AppIcon :icon="LayoutGrid" :size="24" icon-class="text-muted" />
                    <span class="text-xs">{{ t('admin.boardForm.imagePreview') }}</span>
                  </div>
                </div>
              </div>

              <div class="ui-sub-panel flex flex-col justify-center gap-3 p-4">
                <input
                  id="board-image"
                  type="file"
                  accept="image/*"
                  class="block w-full text-sm text-muted file:mr-3 file:rounded-[var(--radius-sm)] file:border file:border-line file:bg-surface-1 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:bg-surface-soft"
                  :aria-label="t('admin.boardForm.featuredImageUploadAria')"
                  @change="handleImageChange"
                />
                <p class="ui-caption">{{ t('admin.boardForm.fileSizeHint') }}</p>
              </div>
            </div>
          </section>

          <p v-if="errorMessage" class="ui-state ui-state-danger" role="alert">
            {{ errorMessage }}
          </p>
          <p
            v-if="successMessage"
            class="rounded-ui border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
          >
            {{ successMessage }}
          </p>

          <div class="flex items-center justify-end">
            <button type="submit" class="ui-button-accent h-10 px-6 text-sm disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSubmitting">
              {{ isSubmitting ? t('admin.boardCreate.submitting') : t('admin.boardCreate.submit') }}
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  </AppShell>
</template>
