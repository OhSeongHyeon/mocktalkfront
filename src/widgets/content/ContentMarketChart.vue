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
let chartInstance: echarts.ECharts | null = null;

const palette = ['#0f172a', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

const normalizedSeries = computed<MarketChartSeries[]>(() => {
  if (props.series.length > 0) {
    return props.series;
  }
  return [
    {
      name: props.title,
      points: props.points,
      color: palette[0],
    },
  ];
});

const chartHeightClass = computed(() => (props.compact ? 'h-[220px] w-full' : 'h-[360px] w-full'));
const isMultiSeries = computed(() => normalizedSeries.value.length > 1);

const renderChart = () => {
  if (!chartInstance) {
    return;
  }

  chartInstance.setOption(
    {
      animation: false,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderWidth: 0,
        textStyle: {
          color: '#f8fafc',
        },
      },
      legend: isMultiSeries.value
        ? {
            top: 0,
            left: 12,
            textStyle: {
              color: '#64748b',
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
            color: '#cbd5e1',
          },
        },
        axisLabel: {
          color: '#64748b',
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
            color: 'rgba(148, 163, 184, 0.2)',
          },
        },
        axisLabel: {
          color: '#64748b',
          fontSize: props.compact ? 11 : 12,
          formatter: (value: number) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(value),
        },
      },
      series: normalizedSeries.value.map((series, index) => {
        const color = series.color ?? palette[index % palette.length];
        return {
          name: series.name,
          type: 'line',
          data: series.points.map((point) => [point.timestamp, point.value]),
          smooth: true,
          symbol: 'circle',
          symbolSize: props.compact ? 5 : 7,
          lineStyle: {
            width: props.compact ? 2 : 3,
            color,
          },
          itemStyle: {
            color,
            borderColor: '#ffffff',
            borderWidth: 2,
          },
          areaStyle: isMultiSeries.value
            ? undefined
            : {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(245, 158, 11, 0.24)' },
                  { offset: 1, color: 'rgba(245, 158, 11, 0.02)' },
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
  chartInstance = echarts.init(chartRef.value);
  renderChart();
  window.addEventListener('resize', handleResize);
});

watch([normalizedSeries, () => props.title, () => props.unitLabel, () => props.compact], () => {
  renderChart();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<template>
  <div ref="chartRef" :class="chartHeightClass"></div>
</template>
