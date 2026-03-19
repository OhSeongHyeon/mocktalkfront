<script setup lang="ts">
import { useSlots } from 'vue';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

defineProps<PageHeaderProps>();

const slots = useSlots();
</script>

<template>
  <section class="ui-panel overflow-hidden">
    <div class="space-y-4 px-4 py-4 sm:px-5">
      <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div class="min-w-0 flex-1 space-y-1.5">
          <p v-if="eyebrow" class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">
            {{ eyebrow }}
          </p>

          <div class="space-y-1">
            <h1 class="text-xl font-black tracking-tight text-slate-900 sm:text-[1.45rem] dark:text-slate-100">
              {{ title }}
            </h1>
            <p v-if="description" class="max-w-4xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ description }}
            </p>
          </div>

          <div v-if="slots.meta" class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <slot name="meta" />
          </div>
        </div>

        <div v-if="slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
          <slot name="actions" />
        </div>
      </div>

      <div v-if="slots.default" class="space-y-3">
        <slot />
      </div>
    </div>
  </section>
</template>
