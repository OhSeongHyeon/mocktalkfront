<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { executeArticleImport, previewArticleImport } from '../features/admin/system';
import type { ArticleImportExecuteResponse, ArticleImportPreviewResponse } from '../features/admin/system';
import { ApiError } from '../shared/lib/http/api';
import PageContainer from '../shared/ui/PageContainer.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const { t, tm } = useI18n();

const selectedZipFile = ref<File | null>(null);
const fileInputKey = ref(0);
const isPreviewLoading = ref(false);
const isExecuteLoading = ref(false);
const actionErrorMessage = ref('');
const actionSuccessMessage = ref('');
const previewResult = ref<ArticleImportPreviewResponse | null>(null);
const executeResult = ref<ArticleImportExecuteResponse | null>(null);
const autoCreateMissingCategories = ref(true);

const importSteps = computed(() => (tm('admin.articleImports.steps') as string[]) ?? []);
const metadataRules = computed(() => (tm('admin.articleImports.metadataRules') as string[]) ?? []);
const unsupportedNotes = computed(() => (tm('admin.articleImports.limitations') as string[]) ?? []);

const sampleZipStructure = `batch-import.zip
├─ manifest.yml # 선택
├─ posts/
│ ├─ post-1.md
│ └─ post-2.md
└─ assets/
 ├─ cover.png
 └─ demo.mp4`;

const sampleManifest = `defaults:
 boardSlug: dev
 categoryName: "백엔드"
 visibility: PUBLIC

articles:
 - file: posts/post-1.md
 - file: posts/post-2.md
 title: "manifest 제목 우선"
 boardSlug: notice
 categoryName: "공지"
 visibility: MEMBERS`;

const sampleMarkdown = `---
title: "Mermaid 사용기"
boardSlug: "dev"
categoryName: "백엔드"
visibility: "PUBLIC"
---

# 본문 시작

![대표 이미지](../assets/cover.png)

!youtube[dQw4w9WgXcQ]

<video controls src="../assets/demo.mp4"></video>`;

const formatPreviewAssetSummary = (item: ArticleImportPreviewResponse['items'][number]) => {
  const parts = [
    t('admin.articleImports.assetCounts', {
      images: item.relativeImageCount,
      videos: item.relativeVideoCount,
      youtube: item.youtubeEmbedCount,
    }),
  ];
  const issues: string[] = [];
  if (item.missingAssetCount > 0) {
    issues.push(t('admin.articleImports.missingAssets', { count: item.missingAssetCount }));
  }
  if (item.oversizedAssetCount > 0) {
    issues.push(t('admin.articleImports.oversizedAssets', { count: item.oversizedAssetCount }));
  }
  if (item.unsupportedAssetCount > 0) {
    issues.push(t('admin.articleImports.unsupportedAssets', { count: item.unsupportedAssetCount }));
  }
  return issues.length > 0 ? `${parts.join(' · ')} / ${issues.join(' · ')}` : parts.join(' · ');
};

const formatExecuteAssetSummary = (item: ArticleImportExecuteResponse['items'][number]) =>
  t('admin.articleImports.assetSummary', {
    images: item.uploadedImageCount,
    videos: item.uploadedVideoCount,
    youtube: item.youtubeEmbedCount,
  });

const resolveCreatedArticlePath = (item: ArticleImportExecuteResponse['items'][number]) => {
  if (!item.created || !item.articleId || !item.boardSlug) {
    return null;
  }
  return `/b/${item.boardSlug}/articles/${item.articleId}`;
};

const resolveExecuteCardClass = (item: ArticleImportExecuteResponse['items'][number]) => {
  if (item.created && item.articleId && item.boardSlug) {
    return 'border-emerald-200 bg-emerald-50/60 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/10 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20';
  }
  return 'border-rose-200 bg-rose-50/40 dark:border-rose-900/60 dark:bg-rose-950/10';
};

const selectedFileName = computed(() => selectedZipFile.value?.name ?? t('admin.articleImports.noZipSelected'));

const canExecute = computed(() => {
  return Boolean(selectedZipFile.value && previewResult.value?.canExecute && !isPreviewLoading.value && !isExecuteLoading.value);
});

const resolveErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  return fallback;
};

const resetSelection = () => {
  selectedZipFile.value = null;
  previewResult.value = null;
  executeResult.value = null;
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  fileInputKey.value += 1;
};

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0] ?? null;
  selectedZipFile.value = file;
  previewResult.value = null;
  executeResult.value = null;
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  if (target) {
    target.value = '';
  }
};

const runPreview = async () => {
  if (!selectedZipFile.value) {
    actionErrorMessage.value = t('admin.articleImports.errors.zipRequiredPreview');
    return;
  }
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  previewResult.value = null;
  executeResult.value = null;
  isPreviewLoading.value = true;
  try {
    previewResult.value = await previewArticleImport(selectedZipFile.value, autoCreateMissingCategories.value);
  } catch (error) {
    actionErrorMessage.value = resolveErrorMessage(error, t('admin.articleImports.errors.previewFailed'));
  } finally {
    isPreviewLoading.value = false;
  }
};

const runExecute = async () => {
  if (!selectedZipFile.value) {
    actionErrorMessage.value = t('admin.articleImports.errors.zipRequiredExecute');
    return;
  }
  if (!previewResult.value?.canExecute) {
    actionErrorMessage.value = t('admin.articleImports.errors.noExecutable');
    return;
  }
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  isExecuteLoading.value = true;
  try {
    const response = await executeArticleImport(selectedZipFile.value, autoCreateMissingCategories.value);
    executeResult.value = response;
    actionSuccessMessage.value = t('admin.articleImports.success.executed', { success: response.successCount, failed: response.failedCount });
  } catch (error) {
    actionErrorMessage.value = resolveErrorMessage(error, t('admin.articleImports.errors.executeFailed'));
  } finally {
    isExecuteLoading.value = false;
  }
};

const resolveStatusBadgeClass = (executable: boolean) => {
  return executable
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300';
};
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <div>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="ui-heading-page">{{ t('admin.articleImports.title') }}</h1>
            <p class="text-sm text-muted">{{ t('admin.articleImports.description') }}</p>
            <p class="mt-1 text-sm text-muted">{{ t('admin.articleImports.contentSourceNote') }}</p>
          </div>
        </div>

        <section class="ui-panel mt-6 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-ink">{{ t('admin.articleImports.guideTitle') }}</h2>
              <p class="mt-1 text-sm text-muted">
                {{ t('admin.articleImports.guideRole') }}
                <span class="mt-1 block">{{ t('admin.articleImports.guideAutoCategory') }}</span>
              </p>
            </div>
            <span class="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted dark:text-subtle">
              preview → execute
            </span>
          </div>

          <div class="mt-5 grid gap-4 xl:grid-cols-2">
            <div class="ui-card">
              <h3 class="text-sm font-semibold text-ink">{{ t('admin.articleImports.zipStructureTitle') }}</h3>
              <pre class="ui-code-block ui-scrollbar mt-3 rounded-ui"><code>{{ sampleZipStructure }}</code></pre>
              <p class="mt-3 text-xs leading-6 text-muted">{{ t('admin.articleImports.zipStructureHint') }}</p>
            </div>

            <div class="ui-card">
              <h3 class="text-sm font-semibold text-ink">{{ t('admin.articleImports.stepsTitle') }}</h3>
              <ul class="mt-3 space-y-2 text-sm leading-6 text-muted">
                <li v-for="step in importSteps" :key="step">{{ step }}</li>
              </ul>
            </div>

            <div class="ui-card">
              <h3 class="text-sm font-semibold text-ink">{{ t('admin.articleImports.metadataTitle') }}</h3>
              <ul class="mt-3 space-y-2 text-sm leading-6 text-muted">
                <li v-for="rule in metadataRules" :key="rule">{{ rule }}</li>
              </ul>
            </div>

            <div class="ui-card">
              <h3 class="text-sm font-semibold text-ink">{{ t('admin.articleImports.manifestExampleTitle') }}</h3>
              <pre class="ui-code-block ui-scrollbar mt-3"><code>{{ sampleManifest }}</code></pre>
            </div>

            <div class="ui-card">
              <h3 class="text-sm font-semibold text-ink">{{ t('admin.articleImports.markdownExampleTitle') }}</h3>
              <pre class="ui-code-block ui-scrollbar mt-3"><code>{{ sampleMarkdown }}</code></pre>
              <p class="mt-3 text-xs leading-6 text-muted">{{ t('admin.articleImports.markdownSaveNote') }}</p>
            </div>
          </div>

          <div class="ui-card mt-4 border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/20">
            <h3 class="text-sm font-semibold text-amber-900 dark:text-amber-100">{{ t('admin.articleImports.limitationsTitle') }}</h3>
            <ul class="mt-3 space-y-2 text-sm leading-6 text-amber-800 dark:text-amber-200">
              <li v-for="note in unsupportedNotes" :key="note">{{ note }}</li>
            </ul>
          </div>
        </section>

        <section class="ui-panel mt-6 p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="space-y-2">
              <p class="text-sm font-semibold text-ink">{{ t('admin.articleImports.uploadTitle') }}</p>
              <p class="text-sm text-muted">{{ selectedFileName }}</p>
              <p class="text-xs text-subtle">{{ t('admin.articleImports.zipStructureHint') }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <label class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink">
                <input
                  v-model="autoCreateMissingCategories"
                  type="checkbox"
                  class="h-4 w-4 rounded border-line text-emerald-500 focus:ring-emerald-500 dark:border-line"
                />
                <span>{{ t('admin.articleImports.autoCreateCategory') }}</span>
              </label>
              <label
                class="inline-flex cursor-pointer items-center rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-line hover:bg-surface-soft"
              >
                {{ t('admin.articleImports.selectZip') }}
                <input
                  :key="fileInputKey"
                  type="file"
                  class="hidden"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  @change="onFileChange"
                />
              </label>
              <button
                type="button"
                class="rounded-full bg-[color:var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-surface-soft dark:text-ink dark:hover:bg-surface-1"
                :disabled="!selectedZipFile || isPreviewLoading || isExecuteLoading"
                @click="runPreview"
              >
                {{ isPreviewLoading ? t('admin.articleImports.previewSubmitting') : t('admin.articleImports.preview') }}
              </button>
              <button
                type="button"
                class="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!canExecute"
                @click="runExecute"
              >
                {{ isExecuteLoading ? t('admin.articleImports.executeSubmitting') : t('admin.articleImports.bulkCreate') }}
              </button>
              <button
                type="button"
                class="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:border-line hover:text-ink dark:text-subtle"
                :disabled="isPreviewLoading || isExecuteLoading"
                @click="resetSelection"
              >
                {{ t('admin.common.reset') }}
              </button>
            </div>
          </div>
        </section>

        <div v-if="actionErrorMessage" class="ui-state ui-state-danger mt-6">
          {{ actionErrorMessage }}
        </div>
        <div v-if="actionSuccessMessage" class="ui-state ui-state-success mt-6">
          {{ actionSuccessMessage }}
        </div>

        <section v-if="previewResult" class="ui-panel mt-6 p-5">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-ink">{{ t('admin.articleImports.previewResultTitle') }}</h2>
              <p class="text-sm text-muted">
                {{
                  t('admin.articleImports.previewSummary', {
                    total: previewResult.totalCount,
                    executable: previewResult.executableCount,
                    invalid: previewResult.invalidCount,
                  })
                }}
              </p>
            </div>
            <span class="rounded-full border px-3 py-1 text-xs font-semibold" :class="resolveStatusBadgeClass(previewResult.canExecute)">
              {{ previewResult.canExecute ? t('admin.articleImports.executable') : t('admin.articleImports.notExecutable') }}
            </span>
          </div>

          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full divide-y divide-[color:var(--line-subtle)] text-sm">
              <thead>
                <tr class="text-left text-xs font-semibold tracking-[0.12em] text-subtle uppercase">
                  <th class="px-3 py-3">{{ t('admin.articleImports.tableFile') }}</th>
                  <th class="px-3 py-3">{{ t('admin.articleImports.tableTitle') }}</th>
                  <th class="px-3 py-3">{{ t('admin.articleImports.tableBoard') }}</th>
                  <th class="px-3 py-3">{{ t('admin.articleImports.tableCategory') }}</th>
                  <th class="px-3 py-3">{{ t('admin.articleImports.tableVisibility') }}</th>
                  <th class="px-3 py-3">{{ t('admin.articleImports.tableAssets') }}</th>
                  <th class="px-3 py-3">{{ t('admin.articleImports.tableStatus') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[color:var(--line-subtle)]">
                <tr v-for="item in previewResult.items" :key="item.filePath">
                  <td class="px-3 py-4 align-top text-muted">{{ item.filePath }}</td>
                  <td class="px-3 py-4 align-top font-medium text-ink">{{ item.title ?? '-' }}</td>
                  <td class="px-3 py-4 align-top text-muted">{{ item.boardSlug ?? '-' }}</td>
                  <td class="px-3 py-4 align-top text-muted">{{ item.categoryName ?? '-' }}</td>
                  <td class="px-3 py-4 align-top text-muted">{{ item.visibility ?? '-' }}</td>
                  <td class="px-3 py-4 align-top text-xs text-muted">
                    {{ formatPreviewAssetSummary(item) }}
                  </td>
                  <td class="px-3 py-4 align-top">
                    <span class="rounded-full border px-2.5 py-1 text-xs font-semibold" :class="resolveStatusBadgeClass(item.executable)">
                      {{ item.executable ? t('admin.articleImports.executable') : t('admin.articleImports.needsReview') }}
                    </span>
                    <ul v-if="item.warnings.length > 0" class="mt-2 space-y-1 text-xs text-amber-600 dark:text-amber-300">
                      <li v-for="warning in item.warnings" :key="`${item.filePath}-${warning}`">{{ warning }}</li>
                    </ul>
                    <ul v-if="item.errors.length > 0" class="mt-2 space-y-1 text-xs text-rose-600 dark:text-rose-300">
                      <li v-for="error in item.errors" :key="`${item.filePath}-${error}`">{{ error }}</li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="executeResult" class="ui-panel mt-6 p-5">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-ink">{{ t('admin.articleImports.executeResultTitle') }}</h2>
              <p class="text-sm text-muted">
                {{
                  t('admin.articleImports.executeSummary', {
                    total: executeResult.totalCount,
                    success: executeResult.successCount,
                    failed: executeResult.failedCount,
                  })
                }}
              </p>
            </div>
          </div>

          <div class="mt-4 space-y-3">
            <component
              :is="resolveCreatedArticlePath(item) ? RouterLink : 'div'"
              v-for="item in executeResult.items"
              :key="`${item.filePath}-${item.articleId ?? 'failed'}`"
              :to="resolveCreatedArticlePath(item) ?? undefined"
              class="ui-card block"
              :class="resolveExecuteCardClass(item)"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-sm font-semibold text-ink">{{ item.title ?? item.filePath }}</p>
                    <span
                      v-if="resolveCreatedArticlePath(item)"
                      class="rounded-full border border-emerald-200 bg-surface px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
                    >
                      {{ t('admin.articleImports.viewArticle') }}
                    </span>
                  </div>
                  <p class="mt-1 text-xs text-muted">
                    {{ item.filePath }} · {{ item.boardSlug ?? '-' }} · {{ item.categoryName ?? '-' }} · {{ item.visibility ?? '-' }}
                  </p>
                  <p class="mt-1 text-xs text-muted">
                    {{ formatExecuteAssetSummary(item) }}
                  </p>
                </div>
                <span class="rounded-full border px-2.5 py-1 text-xs font-semibold" :class="resolveStatusBadgeClass(item.created)">
                  {{ item.created ? t('admin.articleImports.createdSuccess', { id: item.articleId }) : t('admin.articleImports.createFailed') }}
                </span>
              </div>
              <ul v-if="item.warnings.length > 0" class="mt-3 space-y-1 text-xs text-amber-600 dark:text-amber-300">
                <li v-for="warning in item.warnings" :key="`${item.filePath}-warn-${warning}`">{{ warning }}</li>
              </ul>
              <ul v-if="item.errors.length > 0" class="mt-3 space-y-1 text-xs text-rose-600 dark:text-rose-300">
                <li v-for="error in item.errors" :key="`${item.filePath}-err-${error}`">{{ error }}</li>
              </ul>
            </component>
          </div>
        </section>
      </div>
    </PageContainer>
  </AppShell>
</template>
