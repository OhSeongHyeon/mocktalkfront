<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

const props = defineProps<{
  title: string;
  description: string;
  badge?: string;
  to?: string;
  accent: 'amber' | 'cyan';
}>();

const accentClass = computed(() => {
  if (props.accent === 'amber') {
    return 'border-amber-200/70 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.2),_transparent_55%),linear-gradient(180deg,_rgba(255,251,235,0.92),_rgba(255,255,255,0.96))] dark:border-amber-900/50 dark:bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.22),_transparent_55%),linear-gradient(180deg,_rgba(20,16,10,0.92),_rgba(15,23,42,0.96))]';
  }
  return 'border-cyan-200/70 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.18),_transparent_55%),linear-gradient(180deg,_rgba(236,254,255,0.92),_rgba(255,255,255,0.96))] dark:border-cyan-900/50 dark:bg-[radial-gradient(circle_at_top_right,_rgba(6,182,212,0.2),_transparent_55%),linear-gradient(180deg,_rgba(8,18,24,0.92),_rgba(15,23,42,0.96))]';
});
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to"
    class="group flex h-full flex-col justify-between rounded-[28px] border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    :class="accentClass"
  >
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">{{ title }}</h2>
        <span
          v-if="badge"
          class="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800/80 dark:bg-slate-950/70 dark:text-slate-300"
        >
          {{ badge }}
        </span>
      </div>
      <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">{{ description }}</p>
    </div>

    <div class="mt-8 flex items-center justify-between text-sm font-semibold">
      <span class="text-slate-500 dark:text-slate-400">{{ to ? '지금 확인하기' : '곧 공개됩니다' }}</span>
      <span class="text-slate-900 transition group-hover:translate-x-1 dark:text-slate-100">{{ to ? '→' : '·' }}</span>
    </div>
  </component>
</template>
