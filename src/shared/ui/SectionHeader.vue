<script setup lang="ts">
import { useSlots } from 'vue';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

defineProps<SectionHeaderProps>();

const slots = useSlots();
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-2.5 dark:border-slate-800">
    <div class="min-w-0 flex-1 space-y-1.5">
      <p v-if="eyebrow" class="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
        {{ eyebrow }}
      </p>
      <h2 class="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
        {{ title }}
      </h2>
      <p v-if="description" class="text-sm leading-5 text-slate-500 dark:text-slate-400">
        {{ description }}
      </p>
    </div>

    <div v-if="slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
