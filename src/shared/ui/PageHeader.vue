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
    <div class="space-y-5 px-5 py-5 sm:px-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0 flex-1 space-y-2">
          <p v-if="eyebrow" class="text-[11px] font-bold tracking-[0.24em] text-slate-400 uppercase dark:text-slate-500">
            {{ eyebrow }}
          </p>

          <div class="space-y-2">
            <h1 class="text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem] dark:text-slate-100">
              {{ title }}
            </h1>
            <p v-if="description" class="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ description }}
            </p>
          </div>

          <div
            v-if="slots.meta"
            class="flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-3 text-xs text-slate-500 dark:border-slate-800/80 dark:text-slate-400"
          >
            <slot name="meta" />
          </div>
        </div>

        <div v-if="slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
          <slot name="actions" />
        </div>
      </div>

      <div v-if="slots.default" class="space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800/80">
        <slot />
      </div>
    </div>
  </section>
</template>
