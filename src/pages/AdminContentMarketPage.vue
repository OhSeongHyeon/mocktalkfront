<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import type { MarketInstrumentCode } from '../entities/content';
import { importContentMarketSnapshots, refreshContentMarket } from '../features/admin/system';
import type { AdminContentMarketImportResponse, AdminContentMarketRefreshResponse } from '../features/admin/system';
import { ApiError } from '../shared/lib/http/api';
import PageContainer from '../shared/ui/PageContainer.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const { t } = useI18n();

type ImportMode = 'UNIFIED' | 'SINGLE';

const importMode = ref<ImportMode>('UNIFIED');
const selectedInstrument = ref<MarketInstrumentCode>('USD_KRW');
const selectedFile = ref<File | null>(null);
const fileInputKey = ref(0);
const isRefreshLoading = ref(false);
const isImportLoading = ref(false);
const actionErrorMessage = ref('');
const actionSuccessMessage = ref('');
const refreshResult = ref<AdminContentMarketRefreshResponse | null>(null);
const importResult = ref<AdminContentMarketImportResponse | null>(null);

const instrumentOptions = computed<Array<{ value: MarketInstrumentCode; label: string }>>(() => [
  { value: 'USD_KRW', label: 'USD/KRW' },
  { value: 'EUR_KRW', label: 'EUR/KRW' },
  { value: 'JPY_KRW', label: 'JPY/KRW' },
  { value: 'XAU_USD', label: t('admin.contentMarket.instrumentXauUsd') },
  { value: 'XAU_KRW', label: t('admin.contentMarket.instrumentXauKrw') },
]);

const selectedFileName = computed(() => selectedFile.value?.name ?? t('admin.contentMarket.noFileSelected'));
const canImport = computed(() => Boolean(selectedFile.value) && !isImportLoading.value && !isRefreshLoading.value);

const resolveErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  return fallback;
};

const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const resetFileSelection = () => {
  selectedFile.value = null;
  fileInputKey.value += 1;
};

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  selectedFile.value = target?.files?.[0] ?? null;
  importResult.value = null;
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  if (target) {
    target.value = '';
  }
};

const handleRefresh = async () => {
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  isRefreshLoading.value = true;

  try {
    refreshResult.value = await refreshContentMarket();
    actionSuccessMessage.value = t('admin.contentMarket.refreshSuccess', {
      created: refreshResult.value.createdCount,
      updated: refreshResult.value.updatedCount,
    });
  } catch (error) {
    actionErrorMessage.value = resolveErrorMessage(error, t('admin.contentMarket.errors.refreshFailed'));
  } finally {
    isRefreshLoading.value = false;
  }
};

const handleImport = async () => {
  if (!selectedFile.value) {
    actionErrorMessage.value = t('admin.contentMarket.errors.fileRequired');
    return;
  }

  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  isImportLoading.value = true;

  try {
    importResult.value = await importContentMarketSnapshots(selectedFile.value, importMode.value === 'SINGLE' ? selectedInstrument.value : undefined);
    actionSuccessMessage.value = t('admin.contentMarket.importSuccess', {
      created: importResult.value.createdCount,
      updated: importResult.value.updatedCount,
      failed: importResult.value.failedCount,
    });
  } catch (error) {
    actionErrorMessage.value = resolveErrorMessage(error, t('admin.contentMarket.errors.importFailed'));
  } finally {
    isImportLoading.value = false;
  }
};
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <div>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="ui-heading-page">{{ t('admin.contentMarket.title') }}</h1>
            <p class="mt-1 text-sm text-muted">
              {{ t('admin.contentMarket.description') }}
            </p>
          </div>
          <RouterLink
            to="/admin"
            class="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-line hover:bg-surface-soft"
          >
            {{ t('admin.common.backofficeHome') }}
          </RouterLink>
        </div>

        <div v-if="actionErrorMessage" class="ui-state ui-state-danger mt-6">
          {{ actionErrorMessage }}
        </div>
        <div v-if="actionSuccessMessage" class="ui-state ui-state-success mt-6">
          {{ actionSuccessMessage }}
        </div>

        <section class="ui-panel mt-6 p-5">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-ink">{{ t('admin.contentMarket.refreshTitle') }}</h2>
              <p class="mt-1 text-sm text-muted">{{ t('admin.contentMarket.refreshDescription') }}</p>
            </div>
            <button
              type="button"
              class="rounded-full bg-[color:var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-surface-soft dark:text-ink dark:hover:bg-surface-1"
              :disabled="isRefreshLoading || isImportLoading"
              @click="handleRefresh"
            >
              {{ isRefreshLoading ? t('admin.contentMarket.refreshSubmitting') : t('admin.contentMarket.refreshSubmit') }}
            </button>
          </div>

          <div v-if="refreshResult" class="mt-5 grid gap-3 md:grid-cols-4">
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">{{ t('admin.contentMarket.executedAt') }}</p>
              <p class="mt-2 text-sm font-semibold text-ink">{{ formatDateTime(refreshResult.executedAt) }}</p>
            </div>
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">{{ t('admin.contentMarket.created') }}</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ refreshResult.createdCount }}</p>
            </div>
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">{{ t('admin.contentMarket.updated') }}</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ refreshResult.updatedCount }}</p>
            </div>
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">{{ t('admin.contentMarket.skipped') }}</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ refreshResult.skippedCount }}</p>
            </div>
          </div>
        </section>

        <section class="ui-panel mt-6 p-5">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-ink">{{ t('admin.contentMarket.importTitle') }}</h2>
              <p class="mt-1 text-sm text-muted">{{ t('admin.contentMarket.importDescription') }}</p>
            </div>
            <button
              type="button"
              class="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-line hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="!selectedFile || isImportLoading"
              @click="resetFileSelection"
            >
              {{ t('admin.contentMarket.resetFile') }}
            </button>
          </div>

          <div class="mt-5 space-y-5">
            <div class="inline-flex rounded-full border border-line bg-surface-soft/80 p-1 dark:border-line">
              <button
                type="button"
                class="ui-chip-button px-4 py-2 text-sm"
                :class="
                  importMode === 'UNIFIED'
                    ? 'border-[color:var(--accent-strong)] bg-surface text-ink shadow-sm dark:border-line'
                    : 'ui-chip-button-muted border-transparent text-muted'
                "
                @click="importMode = 'UNIFIED'"
              >
                {{ t('admin.contentMarket.unifiedFile') }}
              </button>
              <button
                type="button"
                class="ui-chip-button px-4 py-2 text-sm"
                :class="
                  importMode === 'SINGLE'
                    ? 'border-[color:var(--accent-strong)] bg-surface text-ink shadow-sm dark:border-line'
                    : 'ui-chip-button-muted border-transparent text-muted'
                "
                @click="importMode = 'SINGLE'"
              >
                {{ t('admin.contentMarket.perInstrumentFile') }}
              </button>
            </div>

            <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div class="ui-card">
                <h3 class="text-sm font-semibold text-ink">{{ t('admin.contentMarket.uploadGuideTitle') }}</h3>
                <ul class="mt-3 space-y-2 text-sm leading-6 text-muted">
                  <li>{{ t('admin.contentMarket.uploadGuideRequired') }}</li>
                  <li>{{ t('admin.contentMarket.uploadGuidePerInstrument') }}</li>
                  <li>{{ t('admin.contentMarket.uploadGuideObservedAt') }}</li>
                  <li>{{ t('admin.contentMarket.uploadGuideDuplicate') }}</li>
                </ul>
              </div>

              <div class="ui-card">
                <p class="text-sm font-semibold text-ink">{{ t('admin.contentMarket.selectedFile') }}</p>
                <p class="mt-2 text-sm text-muted">{{ selectedFileName }}</p>
                <div class="mt-4 flex flex-wrap gap-3">
                  <label
                    class="inline-flex cursor-pointer items-center rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-line hover:bg-surface-soft"
                  >
                    {{ t('admin.contentMarket.selectCsvXlsx') }}
                    <input :key="fileInputKey" type="file" class="hidden" accept=".csv,.xlsx" @change="onFileChange" />
                  </label>
                  <button
                    type="button"
                    class="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="!canImport"
                    @click="handleImport"
                  >
                    {{ isImportLoading ? t('admin.contentMarket.importSubmitting') : t('admin.contentMarket.importSubmit') }}
                  </button>
                </div>

                <label v-if="importMode === 'SINGLE'" class="mt-5 block space-y-2 text-sm text-muted">
                  <span class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">{{
                    t('admin.contentMarket.instrumentSelect')
                  }}</span>
                  <select
                    v-model="selectedInstrument"
                    class="ui-panel w-full px-4 py-3 text-sm text-ink transition outline-none focus:border-cyan-400"
                  >
                    <option v-for="option in instrumentOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div v-if="importResult" class="mt-6 grid gap-3 md:grid-cols-5">
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">{{ t('admin.contentMarket.totalRows') }}</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ importResult.totalCount }}</p>
            </div>
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">{{ t('admin.contentMarket.created') }}</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ importResult.createdCount }}</p>
            </div>
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">{{ t('admin.contentMarket.updated') }}</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ importResult.updatedCount }}</p>
            </div>
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">{{ t('admin.contentMarket.skipped') }}</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ importResult.skippedCount }}</p>
            </div>
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">{{ t('admin.contentMarket.failed') }}</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ importResult.failedCount }}</p>
            </div>
          </div>

          <div v-if="importResult?.failures.length" class="ui-card mt-5 border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/20">
            <h3 class="text-sm font-semibold text-rose-900 dark:text-rose-100">{{ t('admin.contentMarket.failedRows') }}</h3>
            <ul class="mt-3 space-y-2 text-sm leading-6 text-rose-700 dark:text-rose-200">
              <li v-for="failure in importResult.failures.slice(0, 20)" :key="`${failure.rowNumber}-${failure.message}`">
                {{ t('admin.contentMarket.failedRowLine', { row: failure.rowNumber, message: failure.message }) }}
              </li>
            </ul>
            <p v-if="importResult.failures.length > 20" class="mt-2 text-xs text-rose-600 dark:text-rose-300">
              {{ t('admin.contentMarket.failedRowsTruncated') }}
            </p>
          </div>
        </section>
      </div>
    </PageContainer>
  </AppShell>
</template>
