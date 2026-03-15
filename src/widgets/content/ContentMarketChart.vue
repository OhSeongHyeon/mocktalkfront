<script setup lang="ts">
import * as echarts from 'echarts';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { MarketSeriesPointResponse } from '../../entities/content';

const props = defineProps<{
  title: string;
  unitLabel: string;
  points: MarketSeriesPointResponse[];
}>();

const chartRef = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

const labels = computed(() =>
  props.points.map((point) => {
    const date = new Date(point.timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }),
);

const values = computed(() => props.points.map((point) => point.value));

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
        valueFormatter: (value: number) => `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(value)} ${props.unitLabel}`,
      },
      grid: {
        left: 18,
        right: 18,
        top: 24,
        bottom: 18,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: labels.value,
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: '#cbd5e1',
          },
        },
        axisLabel: {
          color: '#64748b',
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
          formatter: (value: number) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(value),
        },
      },
      series: [
        {
          name: props.title,
          type: 'line',
          data: values.value,
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: {
            width: 3,
            color: '#0f172a',
          },
          itemStyle: {
            color: '#f59e0b',
            borderColor: '#fff7ed',
            borderWidth: 2,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(245, 158, 11, 0.24)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.02)' },
            ]),
          },
        },
      ],
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

watch([labels, values, () => props.title, () => props.unitLabel], () => {
  renderChart();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<template>
  <div ref="chartRef" class="h-[360px] w-full"></div>
</template>
