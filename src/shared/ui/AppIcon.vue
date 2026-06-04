<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue';

const props = withDefaults(
  defineProps<{
    icon: LucideIcon;
    size?: number;
    strokeWidth?: number;
    iconClass?: string;
  }>(),
  {
    size: 18,
    strokeWidth: 2,
    iconClass: '',
  },
);
</script>

<template>
  <component :is="props.icon" :size="props.size" :stroke-width="props.strokeWidth" aria-hidden="true" class="shrink-0" :class="props.iconClass" />
</template>
