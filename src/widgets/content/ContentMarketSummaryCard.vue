<script setup lang="ts">
import { computed } from 'vue';

import type { MarketOverviewItemResponse } from '../../entities/content';

const props = defineProps<{
  item: MarketOverviewItemResponse;
  active: boolean;
}>();

const cardClass = computed(() => {
  if (props.active) {
    return 'border-[color:var(--accent-strong)] bg-[color:var(--accent-strong)] text-white shadow-lg dark:border-line dark:bg-surface-soft dark:text-ink';
  }
  return 'border-line bg-surface text-ink hover:bg-surface-soft';
});

const changeToneClass = computed(() => {
  const value = props.item.changeValue ?? 0;
  if (value > 0) {
    return props.active ? 'text-emerald-200 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-400';
  }
  if (value < 0) {
    return props.active ? 'text-rose-200 dark:text-rose-400' : 'text-rose-600 dark:text-rose-400';
  }
  return props.active ? 'text-ink dark:text-ink' : 'text-muted';
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
  <div class="bbs-box w-full px-5 py-4 text-left transition" :class="cardClass">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold tracking-[0.18em] uppercase" :class="active ? 'text-white/70 dark:text-muted' : 'text-subtle'">
          {{ item.baseCurrency }} / {{ item.quoteCurrency }}
        </p>
        <h3 class="mt-2 text-base font-semibold">{{ item.displayName }}</h3>
      </div>
      <span
        class="rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] uppercase"
        :class="active ? 'bg-on-strong/15 text-on-strong' : 'bg-surface-soft text-muted'"
      >
        {{ item.marketGroup === 'FX' ? '환율' : '금 시세' }}
      </span>
    </div>
    <div class="mt-5 flex items-end justify-between gap-4">
      <div>
        <p class="text-2xl font-semibold">{{ formattedPrice }}</p>
        <p class="mt-1 text-xs" :class="active ? 'text-white/70 dark:text-muted' : 'text-subtle'">{{ item.unitLabel }}</p>
      </div>
      <p class="text-sm font-semibold" :class="changeToneClass">{{ formattedChange }}</p>
    </div>
  </div>
</template>
