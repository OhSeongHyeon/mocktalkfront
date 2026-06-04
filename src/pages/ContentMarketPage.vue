<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type {
  MarketInstrumentCode,
  MarketOverviewItemResponse,
  MarketOverviewResponse,
  MarketSeriesPeriod,
  MarketSeriesPointResponse,
  MarketSeriesResponse,
} from '../entities/content';
import { getMarketOverview, getMarketSeries } from '../entities/content';
import { ApiError } from '../shared/lib/http/api';
import PageContainer from '../shared/ui/PageContainer.vue';
import SectionHeader from '../shared/ui/SectionHeader.vue';
import ContentMarketChart from '../widgets/content/ContentMarketChart.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const GOLD_TROY_OUNCE_IN_GRAMS = 31.1034768;

const periodOptions: Array<{ value: Exclude<MarketSeriesPeriod, 'CUSTOM'>; label: string; days: number }> = [
  { value: 'TEN_YEAR', label: '10년', days: 3652 },
  { value: 'FIVE_YEAR', label: '5년', days: 1826 },
  { value: 'THREE_YEAR', label: '3년', days: 1095 },
  { value: 'YEAR', label: '1년', days: 365 },
  { value: 'HALF_YEAR', label: '6개월', days: 183 },
  { value: 'QUARTER', label: '3개월', days: 92 },
  { value: 'MONTH', label: '30일', days: 30 },
  { value: 'WEEK', label: '7일', days: 7 },
];

type MarketSeriesMap = Partial<Record<MarketInstrumentCode, MarketSeriesResponse>>;
type MarketChartSeries = {
  name: string;
  points: MarketSeriesPointResponse[];
  color?: string;
};
type DisplayMarketItem = MarketOverviewItemResponse & {
  displayPriceValue: number;
  displayChangeValue: number | null;
  displayUnitLabel: string;
  displayNameLabel: string;
};
type DisplayMarketSeries = MarketSeriesResponse & {
  displayNameLabel: string;
  displayUnitLabel: string;
  displayPoints: MarketSeriesPointResponse[];
};

const overview = ref<MarketOverviewResponse | null>(null);
const seriesMap = ref<MarketSeriesMap>({});
const selectedInstrument = ref<MarketInstrumentCode>('USD_KRW');
const selectedPeriod = ref<MarketSeriesPeriod>('YEAR');
const customStartDate = ref('');
const customEndDate = ref('');
const isOverviewLoading = ref(false);
const isSeriesLoading = ref(false);
const overviewError = ref('');
const seriesError = ref('');
const rangeError = ref('');
let pollTimer: ReturnType<typeof window.setInterval> | null = null;

const chartPalette: Record<MarketInstrumentCode, string> = {
  USD_KRW: '#0f172a',
  EUR_KRW: '#0ea5e9',
  JPY_KRW: '#22c55e',
  XAU_USD: '#f59e0b',
  XAU_KRW: '#ef4444',
};

const isGoldInstrument = (instrumentCode: MarketInstrumentCode) => instrumentCode === 'XAU_USD' || instrumentCode === 'XAU_KRW';

const toDisplayValue = (instrumentCode: MarketInstrumentCode, value: number) => {
  if (!isGoldInstrument(instrumentCode)) {
    return value;
  }
  return value / GOLD_TROY_OUNCE_IN_GRAMS;
};

const toDisplayUnitLabel = (item: Pick<MarketOverviewItemResponse, 'instrumentCode' | 'unitLabel'>) => {
  if (!isGoldInstrument(item.instrumentCode)) {
    return item.unitLabel;
  }
  return `${item.unitLabel}/g`;
};

const toDisplayNameLabel = (item: Pick<MarketOverviewItemResponse, 'instrumentCode' | 'displayName' | 'quoteCurrency'>) => {
  if (!isGoldInstrument(item.instrumentCode)) {
    return item.displayName;
  }
  return `금 시세 (${item.quoteCurrency}/g)`;
};

const resolveFractionDigits = (item: Pick<MarketOverviewItemResponse, 'instrumentCode' | 'marketGroup' | 'quoteCurrency'>) => {
  if (!isGoldInstrument(item.instrumentCode)) {
    return item.marketGroup === 'FX' ? 2 : 0;
  }
  return item.quoteCurrency === 'USD' ? 2 : 0;
};

const displayMarketItems = computed<DisplayMarketItem[]>(() => {
  const items = overview.value?.items ?? [];
  return items.map((item) => ({
    ...item,
    displayPriceValue: toDisplayValue(item.instrumentCode, item.priceValue),
    displayChangeValue: item.changeValue === null ? null : toDisplayValue(item.instrumentCode, item.changeValue),
    displayUnitLabel: toDisplayUnitLabel(item),
    displayNameLabel: toDisplayNameLabel(item),
  }));
});

const selectedOverviewItem = computed<DisplayMarketItem | null>(() => {
  return displayMarketItems.value.find((item) => item.instrumentCode === selectedInstrument.value) ?? null;
});

const selectedSeries = computed<DisplayMarketSeries | null>(() => {
  const series = seriesMap.value[selectedInstrument.value];
  const item = selectedOverviewItem.value;
  if (!series || !item) {
    return null;
  }
  return {
    ...series,
    displayNameLabel: item.displayNameLabel,
    displayUnitLabel: item.displayUnitLabel,
    displayPoints: series.points.map((point) => ({
      ...point,
      value: toDisplayValue(item.instrumentCode, point.value),
    })),
  };
});

const selectedSeriesStats = computed(() => {
  const points = selectedSeries.value?.displayPoints ?? [];
  if (points.length === 0) {
    return null;
  }

  const values = points.map((point) => point.value).filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const sum = values.reduce((acc, current) => acc + current, 0);
  const middleIndex = Math.floor(sortedValues.length / 2);
  const medianValue = sortedValues.length % 2 === 0 ? (sortedValues[middleIndex - 1]! + sortedValues[middleIndex]!) / 2 : sortedValues[middleIndex]!;

  return {
    average: sum / values.length,
    median: medianValue,
    minimum: sortedValues[0]!,
    maximum: sortedValues[sortedValues.length - 1]!,
  };
});

const normalizeSeriesPoints = (points: MarketSeriesPointResponse[]) => {
  if (points.length === 0) {
    return [];
  }
  const firstPoint = points.find((point) => Number.isFinite(point.value) && point.value > 0);
  if (!firstPoint) {
    return points;
  }

  return points.map((point) => ({
    ...point,
    value: (point.value / firstPoint.value) * 100,
  }));
};

const compactMarketItems = computed(() => displayMarketItems.value);

const combinedChartSeries = computed<MarketChartSeries[]>(() => {
  return compactMarketItems.value.flatMap((item) => {
    const series = seriesMap.value[item.instrumentCode];
    if (!series || series.points.length === 0) {
      return [];
    }

    return [
      {
        name: item.displayNameLabel,
        points: normalizeSeriesPoints(
          series.points.map((point) => ({
            ...point,
            value: toDisplayValue(item.instrumentCode, point.value),
          })),
        ),
        color: chartPalette[item.instrumentCode],
      },
    ];
  });
});

const lastObservedAtLabel = computed(() => {
  const target = overview.value?.lastObservedAt;
  if (!target) {
    return '데이터를 축적하는 중입니다.';
  }
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(target));
});

const currentRangeLabel = computed(() => {
  if (selectedPeriod.value === 'CUSTOM') {
    if (!customStartDate.value || !customEndDate.value) {
      return '직접 선택';
    }
    return `${formatDateInput(customStartDate.value)} ~ ${formatDateInput(customEndDate.value)}`;
  }
  return periodOptions.find((option) => option.value === selectedPeriod.value)?.label ?? '1년';
});

const selectedPriceLabel = computed(() => {
  const item = selectedOverviewItem.value;
  if (!item) {
    return '-';
  }
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: resolveFractionDigits(item),
  }).format(item.displayPriceValue);
});

const selectedChangeLabel = computed(() => {
  const item = selectedOverviewItem.value;
  if (!item || item.displayChangeValue === null) {
    return '변화 데이터 없음';
  }
  const sign = item.displayChangeValue > 0 ? '+' : '';
  const rate = item.changeRate === null ? '' : ` (${sign}${item.changeRate.toFixed(3)}%)`;
  return `${sign}${item.displayChangeValue.toFixed(resolveFractionDigits(item))}${rate}`;
});

const formatStatValue = (
  value: number | null | undefined,
  item: Pick<MarketOverviewItemResponse, 'instrumentCode' | 'marketGroup' | 'quoteCurrency'>,
) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: resolveFractionDigits(item),
  }).format(value);
};

const resolveErrorMessage = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback);

const formatDateInput = (value: string) => {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }
  return `${year}.${month}.${day}`;
};

const applyPresetDates = (days: number) => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));

  customStartDate.value = start.toISOString().slice(0, 10);
  customEndDate.value = today.toISOString().slice(0, 10);
};

const resolveSeriesQuery = () => {
  if (selectedPeriod.value !== 'CUSTOM') {
    return {
      period: selectedPeriod.value,
      startDate: undefined,
      endDate: undefined,
    };
  }

  return {
    period: selectedPeriod.value,
    startDate: customStartDate.value,
    endDate: customEndDate.value,
  };
};

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
    seriesMap.value = {};
  } finally {
    isOverviewLoading.value = false;
  }
};

const loadAllSeries = async () => {
  if (isSeriesLoading.value) {
    return;
  }
  const items = overview.value?.items ?? [];
  if (items.length === 0) {
    seriesMap.value = {};
    return;
  }

  if (selectedPeriod.value === 'CUSTOM' && (!customStartDate.value || !customEndDate.value)) {
    rangeError.value = '직접 선택 기간은 시작일과 종료일을 함께 입력해야 합니다.';
    seriesMap.value = {};
    return;
  }

  const { period, startDate, endDate } = resolveSeriesQuery();

  isSeriesLoading.value = true;
  seriesError.value = '';
  try {
    const settled = await Promise.allSettled(
      items.map(async (item) => ({
        instrumentCode: item.instrumentCode,
        response: await getMarketSeries(item.instrumentCode, period, startDate, endDate),
      })),
    );

    const nextSeriesMap: MarketSeriesMap = {};
    let successCount = 0;

    settled.forEach((result) => {
      if (result.status !== 'fulfilled') {
        return;
      }
      nextSeriesMap[result.value.instrumentCode] = result.value.response;
      successCount += 1;
    });

    seriesMap.value = nextSeriesMap;
    if (successCount === 0) {
      seriesError.value = '시계열 데이터를 불러오지 못했습니다.';
    } else if (successCount < items.length) {
      seriesError.value = '일부 종목의 시계열 데이터를 불러오지 못했습니다.';
    }
  } catch (error) {
    seriesError.value = resolveErrorMessage(error, '시계열 데이터를 불러오지 못했습니다.');
    seriesMap.value = {};
  } finally {
    isSeriesLoading.value = false;
  }
};

const handleRefresh = async () => {
  await loadOverview();
  await loadAllSeries();
};

const selectPeriod = (period: Exclude<MarketSeriesPeriod, 'CUSTOM'>) => {
  rangeError.value = '';
  applyPresetDates(periodOptions.find((option) => option.value === period)?.days ?? 365);
  selectedPeriod.value = period;
};

const applyCustomRange = async () => {
  if (!customStartDate.value || !customEndDate.value) {
    rangeError.value = '직접 선택 기간은 시작일과 종료일을 함께 입력해야 합니다.';
    return;
  }
  if (customStartDate.value > customEndDate.value) {
    rangeError.value = '시작일은 종료일보다 늦을 수 없습니다.';
    return;
  }

  rangeError.value = '';
  if (selectedPeriod.value === 'CUSTOM') {
    await loadAllSeries();
    return;
  }
  selectedPeriod.value = 'CUSTOM';
};

watch(selectedPeriod, async (nextPeriod) => {
  if (nextPeriod === 'CUSTOM') {
    return;
  }
  if (!overview.value || overview.value.items.length === 0) {
    return;
  }
  await loadAllSeries();
});

onMounted(async () => {
  applyPresetDates(365);
  await loadOverview();
  if (overview.value?.items.length) {
    await loadAllSeries();
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
        <div class="bg-surface-soft rounded-[32px] border border-line bg-white px-6 py-8 shadow-sm sm:px-8 dark:border-line">
          <SectionHeader
            eyebrow="Market"
            title="환율 / 금 시세"
            description="무료 데이터 소스를 기준으로 하루 1회 수집한 스냅샷을 보여줍니다. 금 시세는 1트로이온스 원본값을 1g 기준으로 환산해 표시합니다."
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
          <p class="mt-4 text-sm text-muted">마지막 갱신 {{ lastObservedAtLabel }}</p>
        </div>

        <div v-if="overviewError" class="ui-state ui-state-danger">
          {{ overviewError }}
        </div>

        <div v-else-if="isOverviewLoading" class="ui-panel px-6 py-8 text-sm text-muted">시세 요약 정보를 불러오는 중입니다.</div>

        <template v-else-if="overview && overview.items.length > 0">
          <div class="ui-panel space-y-6 px-6 py-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold tracking-[0.18em] text-subtle uppercase dark:text-muted">Overview</p>
                <h2 class="ui-heading-page mt-2 text-2xl">통합 그래프</h2>
                <p class="mt-2 text-sm text-muted">
                  전체 종목 흐름을 한 번에 보고, 아래 탭에서 원하는 종목만 따로 자세히 확인할 수 있습니다. 통합 그래프는 기준일을 100으로 맞춘 상대
                  비교 그래프이고, 금 시세는 화면에서 1g 기준으로 보여줍니다.
                </p>
              </div>
              <div class="bg-surface-soft rounded-full border border-line px-4 py-2 text-sm font-medium text-muted dark:border-line dark:text-subtle">
                선택 범위 {{ currentRangeLabel }}
              </div>
            </div>

            <div class="bg-surface-soft/80 space-y-4 rounded-[28px] border border-line p-4 dark:border-line">
              <div class="flex flex-wrap items-center gap-2" role="tablist" aria-label="시세 기간 전환">
                <button
                  v-for="option in periodOptions"
                  :key="option.value"
                  type="button"
                  class="ui-chip-button px-4 py-2 text-sm"
                  :class="
                    selectedPeriod === option.value
                      ? 'border-[color:var(--accent-strong)] bg-surface text-ink shadow-sm dark:border-line'
                      : 'ui-chip-button-muted border-transparent text-muted'
                  "
                  :aria-selected="selectedPeriod === option.value"
                  @click="selectPeriod(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>

              <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <label class="space-y-2 text-sm text-muted">
                  <span class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">시작일</span>
                  <input
                    v-model="customStartDate"
                    type="date"
                    class="ui-panel w-full px-4 py-3 text-sm text-ink transition outline-none focus:border-cyan-400"
                    :max="customEndDate || undefined"
                  />
                </label>
                <label class="space-y-2 text-sm text-muted">
                  <span class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">종료일</span>
                  <input
                    v-model="customEndDate"
                    type="date"
                    class="ui-panel w-full px-4 py-3 text-sm text-ink transition outline-none focus:border-cyan-400"
                    :min="customStartDate || undefined"
                  />
                </label>
                <div class="flex items-end">
                  <button
                    type="button"
                    class="ui-chip-button h-[50px] w-full justify-center border-cyan-200 bg-cyan-50 px-5 text-cyan-700 hover:border-cyan-300 hover:bg-cyan-100 md:w-auto dark:border-cyan-900/50 dark:bg-cyan-950/40 dark:text-cyan-200"
                    @click="applyCustomRange"
                  >
                    직접 선택 적용
                  </button>
                </div>
              </div>
            </div>

            <div v-if="rangeError" class="ui-state ui-state-danger">
              {{ rangeError }}
            </div>

            <div v-if="seriesError" class="ui-state ui-state-danger">
              {{ seriesError }}
            </div>

            <div v-if="isSeriesLoading" class="px-2 py-12 text-sm text-muted">{{ currentRangeLabel }} 통합 그래프를 불러오는 중입니다.</div>

            <div v-else-if="combinedChartSeries.length > 0" class="bg-surface/80 rounded-[28px] border border-line p-2 dark:border-line">
              <ContentMarketChart title="전체 시세 흐름 (기준일=100)" :series="combinedChartSeries" />
            </div>

            <div
              v-if="combinedChartSeries.length > 0"
              class="rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100"
            >
              <p class="font-semibold">통합그래프 y축 안내</p>
              <p class="mt-1 text-sky-800/90 dark:text-sky-100/80">
                y축 숫자는 실제 환율/금액이 아니라 <span class="font-semibold">기준일 값을 100으로 둔 상대지수</span>입니다. 예를 들어 110은 기준일
                대비 약 10% 상승, 95는 약 5% 하락을 뜻합니다.
              </p>
            </div>

            <div v-else class="ui-state ui-state-empty px-5 py-10">표시할 수 있는 시계열 데이터가 아직 충분히 쌓이지 않았습니다.</div>
          </div>

          <div class="ui-panel space-y-4 px-6 py-6">
            <div>
              <p class="text-xs font-semibold tracking-[0.18em] text-subtle uppercase dark:text-muted">Selector</p>
              <h2 class="ui-heading-page mt-2 text-2xl">종목 선택</h2>
            </div>

            <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" role="tablist" aria-label="시세 종목 선택">
              <button
                v-for="item in compactMarketItems"
                :key="item.instrumentCode"
                type="button"
                class="rounded-2xl border px-4 py-3 text-left transition"
                :class="
                  selectedInstrument === item.instrumentCode
                    ? 'dark:bg-surface-soft border-[color:var(--accent-strong)] bg-[color:var(--accent-strong)] text-white shadow-sm dark:border-line dark:text-ink'
                    : 'border-line bg-white text-ink hover:border-line hover:shadow-sm dark:border-line'
                "
                :aria-selected="selectedInstrument === item.instrumentCode"
                @click="selectedInstrument = item.instrumentCode"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p
                      class="text-[11px] font-semibold tracking-[0.16em] uppercase"
                      :class="selectedInstrument === item.instrumentCode ? 'text-white/70 dark:text-muted' : 'text-subtle'"
                    >
                      {{ item.displayUnitLabel }}
                    </p>
                    <h3 class="mt-2 text-sm font-semibold">{{ item.displayNameLabel }}</h3>
                  </div>
                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] uppercase"
                    :class="
                      selectedInstrument === item.instrumentCode
                        ? 'bg-white/15 text-white'
                        : 'bg-surface-soft bg-surface-2 text-muted dark:text-subtle'
                    "
                  >
                    {{ item.marketGroup === 'FX' ? '환율' : '금 시세' }}
                  </span>
                </div>
                <p class="mt-3 text-base font-semibold">
                  {{ new Intl.NumberFormat('ko-KR', { maximumFractionDigits: resolveFractionDigits(item) }).format(item.displayPriceValue) }}
                </p>
              </button>
            </div>
          </div>

          <div v-if="selectedOverviewItem" class="ui-panel space-y-6 px-6 py-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold tracking-[0.18em] text-subtle uppercase dark:text-muted">Detail</p>
                <h2 class="ui-heading-page mt-2 text-2xl">{{ selectedOverviewItem.displayNameLabel }}</h2>
                <p class="mt-2 text-sm text-muted">
                  {{ selectedOverviewItem.marketGroup === 'FX' ? '선택한 환율 종목 상세' : '선택한 금 시세 종목 상세 (1g 기준)' }}
                </p>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="bg-surface-soft/80 rounded-2xl border border-line px-4 py-3 dark:border-line">
                  <p class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">현재 값</p>
                  <p class="mt-2 text-lg font-semibold text-ink">{{ selectedPriceLabel }} {{ selectedOverviewItem.displayUnitLabel }}</p>
                </div>
                <div class="bg-surface-soft/80 rounded-2xl border border-line px-4 py-3 dark:border-line">
                  <p class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">변동</p>
                  <p class="mt-2 text-lg font-semibold text-ink">{{ selectedChangeLabel }}</p>
                </div>
              </div>
            </div>

            <div
              v-if="selectedSeries && selectedSeries.displayPoints.length > 0"
              class="bg-surface/80 rounded-[28px] border border-line p-2 dark:border-line"
            >
              <ContentMarketChart
                :title="selectedSeries.displayNameLabel"
                :unit-label="selectedSeries.displayUnitLabel"
                :points="selectedSeries.displayPoints"
              />
            </div>

            <div v-if="selectedSeriesStats" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div class="bg-surface-soft/80 rounded-2xl border border-line px-4 py-3 dark:border-line">
                <p class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">기간 평균값</p>
                <p class="mt-2 text-base font-semibold text-ink">
                  {{ formatStatValue(selectedSeriesStats.average, selectedOverviewItem) }} {{ selectedOverviewItem.displayUnitLabel }}
                </p>
              </div>
              <div class="bg-surface-soft/80 rounded-2xl border border-line px-4 py-3 dark:border-line">
                <p class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">기간 중위값</p>
                <p class="mt-2 text-base font-semibold text-ink">
                  {{ formatStatValue(selectedSeriesStats.median, selectedOverviewItem) }} {{ selectedOverviewItem.displayUnitLabel }}
                </p>
              </div>
              <div class="bg-surface-soft/80 rounded-2xl border border-line px-4 py-3 dark:border-line">
                <p class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">기간 최저값</p>
                <p class="mt-2 text-base font-semibold text-ink">
                  {{ formatStatValue(selectedSeriesStats.minimum, selectedOverviewItem) }} {{ selectedOverviewItem.displayUnitLabel }}
                </p>
              </div>
              <div class="bg-surface-soft/80 rounded-2xl border border-line px-4 py-3 dark:border-line">
                <p class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">기간 최고값</p>
                <p class="mt-2 text-base font-semibold text-ink">
                  {{ formatStatValue(selectedSeriesStats.maximum, selectedOverviewItem) }} {{ selectedOverviewItem.displayUnitLabel }}
                </p>
              </div>
            </div>

            <div v-else class="ui-state ui-state-empty px-5 py-10">선택한 기간의 시세 데이터가 아직 충분히 쌓이지 않았습니다.</div>
          </div>
        </template>

        <div v-else class="ui-state ui-state-empty px-5 py-10">
          아직 집계된 시세 데이터가 없습니다. 배포 후 첫 수집이 완료되면 그래프를 확인할 수 있습니다.
        </div>
      </section>
    </PageContainer>
  </AppShell>
</template>
