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
  <div class="bbs-box">
    <div class="bbs-toolbar">
      <div class="min-w-0">
        <h1 class="bbs-toolbar-title">{{ title }}</h1>
        <p v-if="description" class="ui-caption mt-0.5">{{ description }}</p>
      </div>
      <div v-if="slots.actions" class="flex flex-wrap items-center gap-1.5">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="slots.default || slots.meta" class="border-t border-line px-3 py-3">
      <div v-if="slots.meta" class="mb-2 flex flex-wrap gap-2 text-xs text-muted">
        <slot name="meta" />
      </div>
      <slot />
    </div>
  </div>
</template>
