<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type {
  MarketInstrumentCode,
  MarketOverviewItemResponse,
  MarketOverviewResponse,
  MarketSeriesPeriod,
  MarketSeriesResponse,
} from '../entities/content';
import { getMarketOverview, getMarketSeries } from '../entities/content';
import { ApiError } from '../shared/lib/http/api';
import PageContainer from '../shared/ui/PageContainer.vue';
import SectionHeader from '../shared/ui/SectionHeader.vue';
import AppShell from '../widgets/layout/AppShell.vue';
import ContentMarketChart from '../widgets/content/ContentMarketChart.vue';
import ContentMarketSummaryCard from '../widgets/content/ContentMarketSummaryCard.vue';

const periodOptions: Array<{ value: MarketSeriesPeriod; label: string }> = [
  { value: 'WEEK', label: '7일' },
  { value: 'MONTH', label: '30일' },
];

const overview = ref<MarketOverviewResponse | null>(null);
const series = ref<MarketSeriesResponse | null>(null);
const selectedInstrument = ref<MarketInstrumentCode>('USD_KRW');
const selectedPeriod = ref<MarketSeriesPeriod>('WEEK');
const isOverviewLoading = ref(false);
const isSeriesLoading = ref(false);
const overviewError = ref('');
const seriesError = ref('');
let pollTimer: ReturnType<typeof window.setInterval> | null = null;

const selectedOverviewItem = computed<MarketOverviewItemResponse | null>(() => {
  return overview.value?.items.find((item) => item.instrumentCode === selectedInstrument.value) ?? null;
});

const lastObservedAtLabel = computed(() => {
  const target = series.value?.lastObservedAt ?? overview.value?.lastObservedAt;
  if (!target) {
    return '데이터를 축적하는 중입니다.';
  }
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(target));
});

const selectedPeriodLabel = computed(() => periodOptions.find((option) => option.value === selectedPeriod.value)?.label ?? '7일');

const resolveErrorMessage = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback);

const ensureSelectedInstrument = (payload: MarketOverviewResponse) => {
  if (payload.items.length === 0) {
    return;
  }
  const hasCurrent = payload.items.some((item) => item.instrumentCode === selectedInstrument.value);
  if (!hasCurrent) {
    selectedInstrument.value = payload.items[0]!.instrumentCode;
  }
};

const loadOverview = async () => {
  if (isOverviewLoading.value) {
    return;
  }
  isOverviewLoading.value = true;
  overviewError.value = '';
  try {
    const payload = await getMarketOverview();
    overview.value = payload;
    ensureSelectedInstrument(payload);
  } catch (error) {
    overviewError.value = resolveErrorMessage(error, '시세 요약 정보를 불러오지 못했습니다.');
    overview.value = null;
  } finally {
    isOverviewLoading.value = false;
  }
};

const loadSeries = async () => {
  if (isSeriesLoading.value) {
    return;
  }
  isSeriesLoading.value = true;
  seriesError.value = '';
  try {
    series.value = await getMarketSeries(selectedInstrument.value, selectedPeriod.value);
  } catch (error) {
    seriesError.value = resolveErrorMessage(error, '시계열 데이터를 불러오지 못했습니다.');
    series.value = null;
  } finally {
    isSeriesLoading.value = false;
  }
};

const handleRefresh = async () => {
  await loadOverview();
  await loadSeries();
};

watch([selectedInstrument, selectedPeriod], async () => {
  if (!overview.value || overview.value.items.length === 0) {
    return;
  }
  await loadSeries();
});

onMounted(async () => {
  await loadOverview();
  if (overview.value?.items.length) {
    await loadSeries();
  }
  pollTimer = window.setInterval(
    () => {
      void handleRefresh();
    },
    30 * 60 * 1000,
  );
});

onBeforeUnmount(() => {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
  }
});
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <section class="space-y-6">
        <div
          class="rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.16),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.98))] px-6 py-8 shadow-sm dark:border-slate-800/80 dark:bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.16),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.14),_transparent_40%),linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.98))] sm:px-8"
        >
          <SectionHeader
            eyebrow="Market"
            title="환율 / 금 시세"
            description="무료 데이터 소스를 기준으로 하루 1회 수집한 스냅샷을 보여줍니다. 투자용 실시간 체결 정보가 아닌 참고용 지표입니다."
          >
            <template #actions>
              <button
                type="button"
                class="ui-chip-button border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-300 hover:bg-cyan-100 dark:border-cyan-900/50 dark:bg-cyan-950/40 dark:text-cyan-200"
                @click="handleRefresh"
              >
                새로고침
              </button>
            </template>
          </SectionHeader>
          <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">마지막 갱신 {{ lastObservedAtLabel }}</p>
        </div>

        <div v-if="overviewError" class="ui-state ui-state-danger">
          {{ overviewError }}
        </div>

        <div v-else-if="isOverviewLoading" class="ui-panel px-6 py-8 text-sm text-slate-500 dark:text-slate-400">
          시세 요약 정보를 불러오는 중입니다.
        </div>

        <div v-else-if="overview && overview.items.length > 0" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <button v-for="item in overview.items" :key="item.instrumentCode" type="button" @click="selectedInstrument = item.instrumentCode">
            <ContentMarketSummaryCard :item="item" :active="selectedInstrument === item.instrumentCode" />
          </button>
        </div>

        <div v-else class="ui-state ui-state-empty px-5 py-10">
          아직 집계된 시세 데이터가 없습니다. 배포 후 첫 수집이 완료되면 그래프를 확인할 수 있습니다.
        </div>

        <div v-if="selectedOverviewItem" class="ui-panel space-y-6 px-6 py-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {{ selectedOverviewItem.baseCurrency }} / {{ selectedOverviewItem.quoteCurrency }}
              </p>
              <h2 class="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{{ selectedOverviewItem.displayName }}</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {{ selectedOverviewItem.marketGroup === 'FX' ? '일별 환율 추세' : '일별 금 시세 추세' }}
              </p>
            </div>
            <div
              class="inline-flex rounded-full border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/80"
              role="tablist"
              aria-label="시세 기간 전환"
            >
              <button
                v-for="option in periodOptions"
                :key="option.value"
                type="button"
                class="ui-chip-button px-4 py-2 text-sm"
                :class="
                  selectedPeriod === option.value
                    ? 'border-slate-900 bg-white text-slate-900 shadow-sm dark:border-slate-100 dark:bg-slate-950 dark:text-slate-100'
                    : 'ui-chip-button-muted border-transparent text-slate-600 dark:text-slate-300'
                "
                :aria-selected="selectedPeriod === option.value"
                @click="selectedPeriod = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div v-if="seriesError" class="ui-state ui-state-danger">
            {{ seriesError }}
          </div>

          <div v-else-if="isSeriesLoading" class="px-2 py-12 text-sm text-slate-500 dark:text-slate-400">
            {{ selectedPeriodLabel }} 그래프를 불러오는 중입니다.
          </div>

          <div
            v-else-if="series && series.points.length > 0"
            class="rounded-[28px] border border-slate-200 bg-white/80 p-2 dark:border-slate-800 dark:bg-slate-950/60"
          >
            <ContentMarketChart :title="series.displayName" :unit-label="series.unitLabel" :points="series.points" />
          </div>

          <div v-else class="ui-state ui-state-empty px-5 py-10">선택한 기간의 시세 데이터가 아직 충분히 쌓이지 않았습니다.</div>
        </div>
      </section>
    </PageContainer>
  </AppShell>
</template>
