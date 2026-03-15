<script setup lang="ts">
import { computed } from 'vue';

import type { MarketOverviewItemResponse } from '../../entities/content';

const props = defineProps<{
  item: MarketOverviewItemResponse;
  active: boolean;
}>();

const cardClass = computed(() => {
  if (props.active) {
    return 'border-slate-900 bg-slate-900 text-white shadow-lg dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900';
  }
  return 'border-slate-200 bg-white/90 text-slate-900 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:border-slate-700';
});

const changeToneClass = computed(() => {
  const value = props.item.changeValue ?? 0;
  if (value > 0) {
    return props.active ? 'text-emerald-200 dark:text-emerald-700' : 'text-emerald-600 dark:text-emerald-400';
  }
  if (value < 0) {
    return props.active ? 'text-rose-200 dark:text-rose-700' : 'text-rose-600 dark:text-rose-400';
  }
  return props.active ? 'text-slate-200 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400';
});

const formattedPrice = computed(() => {
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: props.item.marketGroup === 'FX' ? 2 : 0,
  }).format(props.item.priceValue);
});

const formattedChange = computed(() => {
  const value = props.item.changeValue;
  if (value === null) {
    return '변화 데이터 없음';
  }
  const sign = value > 0 ? '+' : '';
  const percent = props.item.changeRate === null ? '' : ` (${sign}${props.item.changeRate.toFixed(3)}%)`;
  return `${sign}${value.toFixed(props.item.marketGroup === 'FX' ? 2 : 0)}${percent}`;
});
</script>

<template>
  <div class="w-full rounded-3xl border px-5 py-4 text-left transition" :class="cardClass">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p
          class="text-xs font-semibold uppercase tracking-[0.18em]"
          :class="active ? 'text-white/70 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'"
        >
          {{ item.baseCurrency }} / {{ item.quoteCurrency }}
        </p>
        <h3 class="mt-2 text-base font-semibold">{{ item.displayName }}</h3>
      </div>
      <span
        class="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
        :class="
          active
            ? 'bg-white/15 text-white dark:bg-slate-900 dark:text-slate-100'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
        "
      >
        {{ item.marketGroup === 'FX' ? '환율' : '금 시세' }}
      </span>
    </div>
    <div class="mt-5 flex items-end justify-between gap-4">
      <div>
        <p class="text-2xl font-semibold">{{ formattedPrice }}</p>
        <p class="mt-1 text-xs" :class="active ? 'text-white/70 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'">{{ item.unitLabel }}</p>
      </div>
      <p class="text-sm font-semibold" :class="changeToneClass">{{ formattedChange }}</p>
    </div>
  </div>
</template>
