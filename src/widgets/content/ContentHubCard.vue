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
    return 'border-amber-200/70 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/20';
  }
  return 'border-cyan-200/70 bg-cyan-50/80 dark:border-cyan-900/50 dark:bg-cyan-950/20';
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
        <h2 class="text-xl font-semibold text-ink">{{ title }}</h2>
        <span
          v-if="badge"
          class="dark:border-line/80 /70 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-muted uppercase dark:text-subtle"
        >
          {{ badge }}
        </span>
      </div>
      <p class="text-sm leading-6 text-muted">{{ description }}</p>
    </div>

    <div class="mt-8 flex items-center justify-between text-sm font-semibold">
      <span class="text-muted">{{ to ? '지금 확인하기' : '곧 공개됩니다' }}</span>
      <span class="text-ink transition group-hover:translate-x-1">{{ to ? '→' : '·' }}</span>
    </div>
  </component>
</template>
