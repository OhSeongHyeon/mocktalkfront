<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import type { MarketInstrumentCode } from '../entities/content';
import { importContentMarketSnapshots, refreshContentMarket } from '../features/admin/system';
import type { AdminContentMarketImportResponse, AdminContentMarketRefreshResponse } from '../features/admin/system';
import { ApiError } from '../shared/lib/http/api';
import PageContainer from '../shared/ui/PageContainer.vue';
import AppShell from '../widgets/layout/AppShell.vue';

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

const instrumentOptions: Array<{ value: MarketInstrumentCode; label: string }> = [
  { value: 'USD_KRW', label: 'USD/KRW' },
  { value: 'EUR_KRW', label: 'EUR/KRW' },
  { value: 'JPY_KRW', label: 'JPY/KRW' },
  { value: 'XAU_USD', label: '금 시세 (USD)' },
  { value: 'XAU_KRW', label: '금 시세 (KRW)' },
];

const selectedFileName = computed(() => selectedFile.value?.name ?? '선택된 파일이 없습니다.');
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
    actionSuccessMessage.value = `최신화가 완료되었습니다. 생성 ${refreshResult.value.createdCount}건, 갱신 ${refreshResult.value.updatedCount}건입니다.`;
  } catch (error) {
    actionErrorMessage.value = resolveErrorMessage(error, '시세 최신화에 실패했습니다.');
  } finally {
    isRefreshLoading.value = false;
  }
};

const handleImport = async () => {
  if (!selectedFile.value) {
    actionErrorMessage.value = '업로드할 CSV 또는 XLSX 파일을 먼저 선택해 주세요.';
    return;
  }

  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  isImportLoading.value = true;

  try {
    importResult.value = await importContentMarketSnapshots(selectedFile.value, importMode.value === 'SINGLE' ? selectedInstrument.value : undefined);
    actionSuccessMessage.value = `임포트가 완료되었습니다. 생성 ${importResult.value.createdCount}건, 갱신 ${importResult.value.updatedCount}건, 실패 ${importResult.value.failedCount}건입니다.`;
  } catch (error) {
    actionErrorMessage.value = resolveErrorMessage(error, '시세 데이터 임포트에 실패했습니다.');
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
            <h1 class="ui-heading-page">콘텐츠 시세 운영</h1>
            <p class="mt-1 text-sm text-muted">
              공개 콘텐츠에서 사용하는 환율/금 시세를 수동으로 최신화하거나 CSV/XLSX 파일로 과거 데이터를 반영합니다.
            </p>
          </div>
          <RouterLink
            to="/admin"
            class="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-line hover:bg-surface-soft"
          >
            백오피스 홈
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
              <h2 class="text-lg font-semibold text-ink">지금 최신화</h2>
              <p class="mt-1 text-sm text-muted">외부 시세 공급자에서 현재 값을 다시 읽어와 스냅샷을 즉시 갱신합니다.</p>
            </div>
            <button
              type="button"
              class="rounded-full bg-[color:var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-surface-soft dark:text-ink dark:hover:bg-surface-1"
              :disabled="isRefreshLoading || isImportLoading"
              @click="handleRefresh"
            >
              {{ isRefreshLoading ? '최신화 중...' : '지금 최신화' }}
            </button>
          </div>

          <div v-if="refreshResult" class="mt-5 grid gap-3 md:grid-cols-4">
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">실행 시각</p>
              <p class="mt-2 text-sm font-semibold text-ink">{{ formatDateTime(refreshResult.executedAt) }}</p>
            </div>
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">생성</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ refreshResult.createdCount }}</p>
            </div>
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">갱신</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ refreshResult.updatedCount }}</p>
            </div>
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">스킵</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ refreshResult.skippedCount }}</p>
            </div>
          </div>
        </section>

        <section class="ui-panel mt-6 p-5">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-ink">시세 데이터 임포트</h2>
              <p class="mt-1 text-sm text-muted">통합 파일 또는 종목별 파일을 업로드해 과거 시세 데이터를 보강합니다. 허용 형식은 CSV, XLSX입니다.</p>
            </div>
            <button
              type="button"
              class="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-line hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="!selectedFile || isImportLoading"
              @click="resetFileSelection"
            >
              파일 초기화
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
                통합 파일
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
                종목별 파일
              </button>
            </div>

            <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div class="ui-card">
                <h3 class="text-sm font-semibold text-ink">업로드 가이드</h3>
                <ul class="mt-3 space-y-2 text-sm leading-6 text-muted">
                  <li>
                    필수 컬럼은 <code class="font-mono text-[0.95em]">instrument_code</code>,
                    <code class="font-mono text-[0.95em]">observed_at</code>, <code class="font-mono text-[0.95em]">price_value</code>입니다.
                  </li>
                  <li>
                    종목별 파일은 <code class="font-mono text-[0.95em]">observed_at</code>, <code class="font-mono text-[0.95em]">price_value</code>만
                    있어도 됩니다.
                  </li>
                  <li>
                    <code class="font-mono text-[0.95em]">observed_at</code>은 <code class="font-mono text-[0.95em]">2026-03-15</code> 또는 ISO
                    datetime 형식을 허용합니다.
                  </li>
                  <li>
                    같은 <code class="font-mono text-[0.95em]">instrument_code + observed_at</code> row가 이미 있으면 update 기준으로 반영합니다.
                  </li>
                </ul>
              </div>

              <div class="ui-card">
                <p class="text-sm font-semibold text-ink">선택 파일</p>
                <p class="mt-2 text-sm text-muted">{{ selectedFileName }}</p>
                <div class="mt-4 flex flex-wrap gap-3">
                  <label
                    class="inline-flex cursor-pointer items-center rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-line hover:bg-surface-soft"
                  >
                    CSV / XLSX 선택
                    <input :key="fileInputKey" type="file" class="hidden" accept=".csv,.xlsx" @change="onFileChange" />
                  </label>
                  <button
                    type="button"
                    class="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="!canImport"
                    @click="handleImport"
                  >
                    {{ isImportLoading ? '임포트 중...' : '임포트 실행' }}
                  </button>
                </div>

                <label v-if="importMode === 'SINGLE'" class="mt-5 block space-y-2 text-sm text-muted">
                  <span class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">종목 선택</span>
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
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">전체 row</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ importResult.totalCount }}</p>
            </div>
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">생성</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ importResult.createdCount }}</p>
            </div>
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">갱신</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ importResult.updatedCount }}</p>
            </div>
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">스킵</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ importResult.skippedCount }}</p>
            </div>
            <div class="ui-stat-card">
              <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">실패</p>
              <p class="mt-2 text-lg font-semibold text-ink">{{ importResult.failedCount }}</p>
            </div>
          </div>

          <div v-if="importResult?.failures.length" class="ui-card mt-5 border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/20">
            <h3 class="text-sm font-semibold text-rose-900 dark:text-rose-100">실패 row</h3>
            <ul class="mt-3 space-y-2 text-sm leading-6 text-rose-700 dark:text-rose-200">
              <li v-for="failure in importResult.failures.slice(0, 20)" :key="`${failure.rowNumber}-${failure.message}`">
                {{ failure.rowNumber }}행: {{ failure.message }}
              </li>
            </ul>
            <p v-if="importResult.failures.length > 20" class="mt-2 text-xs text-rose-600 dark:text-rose-300">
              실패 row가 많아 상위 20건만 표시합니다.
            </p>
          </div>
        </section>
      </div>
    </PageContainer>
  </AppShell>
</template>
