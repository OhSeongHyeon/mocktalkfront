<script setup lang="ts">
import * as echarts from 'echarts';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { MarketSeriesPointResponse } from '../../entities/content';

type MarketChartSeries = {
  name: string;
  points: MarketSeriesPointResponse[];
  color?: string;
};

const props = withDefaults(
  defineProps<{
    title: string;
    unitLabel?: string;
    points?: MarketSeriesPointResponse[];
    series?: MarketChartSeries[];
    compact?: boolean;
  }>(),
  {
    unitLabel: '',
    points: () => [],
    series: () => [],
    compact: false,
  },
);

const chartRef = ref<HTMLDivElement | null>(null);
const isDark = ref(false);
let chartInstance: echarts.ECharts | null = null;
let themeObserver: MutationObserver | null = null;

const lightPalette = ['#0f172a', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];
const darkPalette = ['#e2e8f0', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa'];

const normalizedSeries = computed<MarketChartSeries[]>(() => {
  if (props.series.length > 0) {
    return props.series;
  }
  return [
    {
      name: props.title,
      points: props.points,
      color: lightPalette[0],
    },
  ];
});

const chartHeightClass = computed(() => (props.compact ? 'h-[220px] w-full' : 'h-[360px] w-full'));
const isMultiSeries = computed(() => normalizedSeries.value.length > 1);

const syncThemeState = () => {
  isDark.value = globalThis.document?.documentElement.classList.contains('dark') ?? false;
};

const resolveShowSymbol = (pointCount: number) => {
  const threshold = isMultiSeries.value ? 45 : props.compact ? 60 : 120;
  return pointCount <= threshold;
};

const resolveSampling = (pointCount: number) => {
  if (pointCount > 365) {
    return 'lttb';
  }
  if (pointCount > 180) {
    return 'minmax';
  }
  return undefined;
};

const resolveProgressive = (pointCount: number) => {
  if (pointCount > 1000) {
    return 400;
  }
  if (pointCount > 400) {
    return 200;
  }
  return 0;
};

const resolveSeriesColor = (color: string | undefined, index: number) => {
  const palette = isDark.value ? darkPalette : lightPalette;
  if (!color) {
    return palette[index % palette.length];
  }
  if (isDark.value && color === lightPalette[0]) {
    return darkPalette[0];
  }
  return color;
};

const renderChart = () => {
  if (!chartInstance) {
    return;
  }

  chartInstance.setOption(
    {
      animation: false,
      animationThreshold: 2000,
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark.value ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.96)',
        borderWidth: 0,
        axisPointer: {
          animation: false,
        },
        textStyle: {
          color: isDark.value ? '#f8fafc' : '#0f172a',
        },
      },
      legend: isMultiSeries.value
        ? {
            top: 0,
            left: 12,
            textStyle: {
              color: isDark.value ? '#cbd5e1' : '#64748b',
              fontSize: props.compact ? 11 : 12,
            },
          }
        : undefined,
      grid: {
        left: 18,
        right: 18,
        top: isMultiSeries.value ? (props.compact ? 42 : 54) : props.compact ? 18 : 24,
        bottom: 18,
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        axisLine: {
          lineStyle: {
            color: isDark.value ? '#475569' : '#cbd5e1',
          },
        },
        axisLabel: {
          color: isDark.value ? '#94a3b8' : '#64748b',
          fontSize: props.compact ? 11 : 12,
          formatter: (value: number) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          },
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: {
          show: false,
        },
        splitLine: {
          lineStyle: {
            color: isDark.value ? 'rgba(71, 85, 105, 0.35)' : 'rgba(148, 163, 184, 0.2)',
          },
        },
        axisLabel: {
          color: isDark.value ? '#94a3b8' : '#64748b',
          fontSize: props.compact ? 11 : 12,
          formatter: (value: number) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(value),
        },
      },
      series: normalizedSeries.value.map((series, index) => {
        const color = resolveSeriesColor(series.color, index);
        const pointCount = series.points.length;
        const showSymbol = resolveShowSymbol(pointCount);
        return {
          name: series.name,
          type: 'line',
          data: series.points.map((point) => [point.timestamp, point.value]),
          smooth: true,
          showSymbol,
          showAllSymbol: false,
          symbol: 'circle',
          symbolSize: showSymbol ? (props.compact ? 5 : 7) : 0,
          hoverAnimation: showSymbol,
          sampling: resolveSampling(pointCount),
          progressive: resolveProgressive(pointCount),
          progressiveThreshold: 300,
          lineStyle: {
            width: props.compact ? 2 : 3,
            color,
          },
          itemStyle: {
            color,
            borderColor: isDark.value ? '#020617' : '#ffffff',
            borderWidth: 2,
          },
          areaStyle: isMultiSeries.value
            ? undefined
            : {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: isDark.value ? 'rgba(56, 189, 248, 0.22)' : 'rgba(245, 158, 11, 0.24)' },
                  { offset: 1, color: isDark.value ? 'rgba(56, 189, 248, 0.03)' : 'rgba(245, 158, 11, 0.02)' },
                ]),
              },
        };
      }),
    },
    true,
  );
};

const handleResize = () => {
  chartInstance?.resize();
};

onMounted(() => {
  if (!chartRef.value) {
    return;
  }
  syncThemeState();
  chartInstance = echarts.init(chartRef.value);
  renderChart();
  themeObserver = new MutationObserver(() => {
    syncThemeState();
    renderChart();
  });
  themeObserver.observe(globalThis.document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  window.addEventListener('resize', handleResize);
});

watch([normalizedSeries, () => props.title, () => props.unitLabel, () => props.compact, isDark], () => {
  renderChart();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  themeObserver?.disconnect();
  themeObserver = null;
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<template>
  <div ref="chartRef" :class="chartHeightClass"></div>
</template>
