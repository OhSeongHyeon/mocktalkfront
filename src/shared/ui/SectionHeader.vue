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
  <div class="bbs-toolbar border-b border-line">
    <div class="min-w-0">
      <h2 class="bbs-toolbar-title">{{ title }}</h2>
      <p v-if="description" class="ui-caption mt-0.5">{{ description }}</p>
    </div>
    <div v-if="slots.actions" class="flex flex-wrap items-center gap-1.5">
      <slot name="actions" />
    </div>
  </div>
</template>
