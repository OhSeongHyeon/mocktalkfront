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
  <div class="bbs-toolbar">
    <div class="min-w-0 flex-1">
      <p v-if="eyebrow" class="ui-eyebrow">{{ eyebrow }}</p>
      <h2 class="bbs-toolbar-title" :class="eyebrow ? 'mt-1' : ''">{{ title }}</h2>
      <p v-if="description" class="ui-caption mt-0.5">{{ description }}</p>
    </div>
    <div v-if="slots.tabs" class="bbs-tabs bbs-tabs--toolbar" role="presentation">
      <slot name="tabs" />
    </div>
    <div v-if="slots.actions" class="flex shrink-0 flex-wrap items-center gap-1.5">
      <slot name="actions" />
    </div>
  </div>
</template>
