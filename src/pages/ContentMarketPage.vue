<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type {
  MarketInstrumentCode,
  MarketOverviewItemResponse,
  MarketOverviewResponse,
  MarketSeriesPeriod,
  MarketSeriesPointResponse,
  MarketSeriesResponse,
} from '../entities/content';
import { getMarketOverview, getMarketSeries } from '../entities/content';
import { type AppLocale, toIntlLocaleTag } from '../shared/i18n';
import { ApiError } from '../shared/lib/http/api';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import ContentMarketChart from '../widgets/content/ContentMarketChart.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const { t, locale } = useI18n();

const GOLD_TROY_OUNCE_IN_GRAMS = 31.1034768;

const intlLocale = computed(() => toIntlLocaleTag(locale.value as AppLocale));

const periodOptions = computed<Array<{ value: Exclude<MarketSeriesPeriod, 'CUSTOM'>; label: string; days: number }>>(() => [
  { value: 'TEN_YEAR', label: t('content.market.period.tenYear'), days: 3652 },
  { value: 'FIVE_YEAR', label: t('content.market.period.fiveYear'), days: 1826 },
  { value: 'THREE_YEAR', label: t('content.market.period.threeYear'), days: 1095 },
  { value: 'YEAR', label: t('content.market.period.year'), days: 365 },
  { value: 'HALF_YEAR', label: t('content.market.period.halfYear'), days: 183 },
  { value: 'QUARTER', label: t('content.market.period.quarter'), days: 92 },
  { value: 'MONTH', label: t('content.market.period.month'), days: 30 },
  { value: 'WEEK', label: t('content.market.period.week'), days: 7 },
]);

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
  return t('content.market.goldDisplayName', { currency: item.quoteCurrency });
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
    return t('content.market.page.accumulating');
  }
  return new Intl.DateTimeFormat(intlLocale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(target));
});

const currentRangeLabel = computed(() => {
  if (selectedPeriod.value === 'CUSTOM') {
    if (!customStartDate.value || !customEndDate.value) {
      return t('content.market.period.custom');
    }
    return t('content.market.period.customRange', {
      start: formatDateInput(customStartDate.value),
      end: formatDateInput(customEndDate.value),
    });
  }
  return periodOptions.value.find((option) => option.value === selectedPeriod.value)?.label ?? t('content.market.period.year');
});

const selectedDetailSubtitle = computed(() =>
  selectedOverviewItem.value?.marketGroup === 'FX' ? t('content.market.detail.fxSubtitle') : t('content.market.detail.metalSubtitle'),
);

const resolveMarketGroupLabel = (marketGroup: MarketOverviewItemResponse['marketGroup']) =>
  marketGroup === 'FX' ? t('content.market.group.fx') : t('content.market.group.metal');

const selectedPriceLabel = computed(() => {
  const item = selectedOverviewItem.value;
  if (!item) {
    return '-';
  }
  return new Intl.NumberFormat(intlLocale.value, {
    maximumFractionDigits: resolveFractionDigits(item),
  }).format(item.displayPriceValue);
});

const selectedChangeLabel = computed(() => {
  const item = selectedOverviewItem.value;
  if (!item || item.displayChangeValue === null) {
    return t('content.market.noChangeData');
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
  return new Intl.NumberFormat(intlLocale.value, {
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
    overviewError.value = resolveErrorMessage(error, t('content.market.errors.overview'));
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
    rangeError.value = t('content.market.errors.customRangeRequired');
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
      seriesError.value = t('content.market.errors.series');
    } else if (successCount < items.length) {
      seriesError.value = t('content.market.errors.seriesPartial');
    }
  } catch (error) {
    seriesError.value = resolveErrorMessage(error, t('content.market.errors.series'));
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
  applyPresetDates(periodOptions.value.find((option) => option.value === period)?.days ?? 365);
  selectedPeriod.value = period;
};

const applyCustomRange = async () => {
  if (!customStartDate.value || !customEndDate.value) {
    rangeError.value = t('content.market.errors.customRangeRequired');
    return;
  }
  if (customStartDate.value > customEndDate.value) {
    rangeError.value = t('content.market.errors.startAfterEnd');
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
      <section class="space-y-4">
        <PageHeader
          :eyebrow="t('content.market.page.eyebrow')"
          :title="t('content.market.page.title')"
          :description="t('content.market.page.description')"
        >
          <template #actions>
            <button
              type="button"
              class="ui-chip-button border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-300 hover:bg-cyan-100 dark:border-cyan-900/50 dark:bg-cyan-950/40 dark:text-cyan-200"
              @click="handleRefresh"
            >
              {{ t('content.market.page.refresh') }}
            </button>
          </template>
          <p class="text-sm text-muted">{{ t('content.market.page.lastUpdated', { label: lastObservedAtLabel }) }}</p>
        </PageHeader>

        <div v-if="overviewError" class="ui-state ui-state-danger">
          {{ overviewError }}
        </div>

        <div v-else-if="isOverviewLoading" class="ui-panel ui-section-loading px-6 py-8">{{ t('content.market.overview.loadingOverview') }}</div>

        <template v-else-if="overview && overview.items.length > 0">
          <div class="ui-panel space-y-6 px-6 py-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold tracking-[0.18em] text-subtle uppercase dark:text-muted">{{ t('content.market.overview.label') }}</p>
                <h2 class="ui-heading-page mt-2 text-2xl">{{ t('content.market.overview.title') }}</h2>
                <p class="mt-2 text-sm text-muted">
                  {{ t('content.market.overview.description') }}
                </p>
              </div>
              <div class="rounded-full border border-line bg-surface-soft px-4 py-2 text-sm font-medium text-muted dark:border-line dark:text-subtle">
                {{ t('content.market.overview.selectedRange', { label: currentRangeLabel }) }}
              </div>
            </div>

            <div class="ui-card space-y-4">
              <div class="flex flex-wrap items-center gap-2" role="tablist" :aria-label="t('content.market.overview.periodTabsAria')">
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
                  <span class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">{{
                    t('content.market.overview.startDate')
                  }}</span>
                  <input
                    v-model="customStartDate"
                    type="date"
                    class="ui-panel w-full px-4 py-3 text-sm text-ink transition outline-none focus:border-cyan-400"
                    :max="customEndDate || undefined"
                  />
                </label>
                <label class="space-y-2 text-sm text-muted">
                  <span class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">{{
                    t('content.market.overview.endDate')
                  }}</span>
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
                    {{ t('content.market.overview.applyCustom') }}
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

            <div v-if="isSeriesLoading" class="ui-section-loading py-12">
              {{ t('content.market.overview.combinedChartLoading', { label: currentRangeLabel }) }}
            </div>

            <div v-else-if="combinedChartSeries.length > 0" class="ui-card p-2">
              <ContentMarketChart :title="t('content.market.overview.combinedChartTitle')" :series="combinedChartSeries" />
            </div>

            <div
              v-if="combinedChartSeries.length > 0"
              class="ui-card border-sky-200 bg-sky-50/80 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100"
            >
              <p class="font-semibold">{{ t('content.market.overview.yAxisGuideTitle') }}</p>
              <p class="mt-1 text-sky-800/90 dark:text-sky-100/80">
                {{ t('content.market.overview.yAxisGuideBody') }}
              </p>
            </div>

            <div v-else class="ui-state ui-state-empty px-5 py-10">{{ t('content.market.overview.insufficientSeries') }}</div>
          </div>

          <div class="ui-panel space-y-4 px-6 py-6">
            <div>
              <p class="text-xs font-semibold tracking-[0.18em] text-subtle uppercase dark:text-muted">{{ t('content.market.selector.label') }}</p>
              <h2 class="ui-heading-page mt-2 text-2xl">{{ t('content.market.selector.title') }}</h2>
            </div>

            <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" role="tablist" :aria-label="t('content.market.selector.ariaLabel')">
              <button
                v-for="item in compactMarketItems"
                :key="item.instrumentCode"
                type="button"
                class="border px-4 py-3 text-left transition"
                style="border-radius: var(--radius-md)"
                :class="
                  selectedInstrument === item.instrumentCode
                    ? 'border-[color:var(--accent-strong)] bg-[color:var(--accent-strong)] text-white shadow-sm dark:border-line dark:bg-surface-soft dark:text-ink'
                    : 'border-line bg-surface text-ink hover:border-line hover:shadow-sm dark:border-line'
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
                        ? 'bg-on-strong/15 text-on-strong'
                        : 'bg-surface-2 bg-surface-soft text-muted dark:text-subtle'
                    "
                  >
                    {{ resolveMarketGroupLabel(item.marketGroup) }}
                  </span>
                </div>
                <p class="mt-3 text-base font-semibold">
                  {{ new Intl.NumberFormat(intlLocale, { maximumFractionDigits: resolveFractionDigits(item) }).format(item.displayPriceValue) }}
                </p>
              </button>
            </div>
          </div>

          <div v-if="selectedOverviewItem" class="ui-panel space-y-6 px-6 py-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold tracking-[0.18em] text-subtle uppercase dark:text-muted">{{ t('content.market.detail.label') }}</p>
                <h2 class="ui-heading-page mt-2 text-2xl">{{ selectedOverviewItem.displayNameLabel }}</h2>
                <p class="mt-2 text-sm text-muted">
                  {{ selectedDetailSubtitle }}
                </p>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="ui-stat-card">
                  <p class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">
                    {{ t('content.market.detail.currentValue') }}
                  </p>
                  <p class="mt-2 text-lg font-semibold text-ink">{{ selectedPriceLabel }} {{ selectedOverviewItem.displayUnitLabel }}</p>
                </div>
                <div class="ui-stat-card">
                  <p class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">{{ t('content.market.detail.change') }}</p>
                  <p class="mt-2 text-lg font-semibold text-ink">{{ selectedChangeLabel }}</p>
                </div>
              </div>
            </div>

            <div v-if="selectedSeries && selectedSeries.displayPoints.length > 0" class="ui-card p-2">
              <ContentMarketChart
                :title="selectedSeries.displayNameLabel"
                :unit-label="selectedSeries.displayUnitLabel"
                :points="selectedSeries.displayPoints"
              />
            </div>

            <div v-if="selectedSeriesStats" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div class="ui-stat-card">
                <p class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">{{ t('content.market.detail.avg') }}</p>
                <p class="mt-2 text-base font-semibold text-ink">
                  {{ formatStatValue(selectedSeriesStats.average, selectedOverviewItem) }} {{ selectedOverviewItem.displayUnitLabel }}
                </p>
              </div>
              <div class="ui-stat-card">
                <p class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">{{ t('content.market.detail.median') }}</p>
                <p class="mt-2 text-base font-semibold text-ink">
                  {{ formatStatValue(selectedSeriesStats.median, selectedOverviewItem) }} {{ selectedOverviewItem.displayUnitLabel }}
                </p>
              </div>
              <div class="ui-stat-card">
                <p class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">{{ t('content.market.detail.min') }}</p>
                <p class="mt-2 text-base font-semibold text-ink">
                  {{ formatStatValue(selectedSeriesStats.minimum, selectedOverviewItem) }} {{ selectedOverviewItem.displayUnitLabel }}
                </p>
              </div>
              <div class="ui-stat-card">
                <p class="text-xs font-semibold tracking-[0.16em] text-subtle uppercase dark:text-muted">{{ t('content.market.detail.max') }}</p>
                <p class="mt-2 text-base font-semibold text-ink">
                  {{ formatStatValue(selectedSeriesStats.maximum, selectedOverviewItem) }} {{ selectedOverviewItem.displayUnitLabel }}
                </p>
              </div>
            </div>

            <div v-else class="ui-state ui-state-empty px-5 py-10">{{ t('content.market.detail.insufficientDetail') }}</div>
          </div>
        </template>

        <div v-else class="ui-state ui-state-empty px-5 py-10">
          {{ t('content.market.overview.noData') }}
        </div>
      </section>
    </PageContainer>
  </AppShell>
</template>
