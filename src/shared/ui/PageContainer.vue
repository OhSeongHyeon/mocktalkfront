<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { useLayoutStore } from '../../stores/layout';
import type { ContentWidthPreset } from '../../stores/layout';

type PageContainerWidth = 'auto' | 'narrow' | ContentWidthPreset;

interface PageContainerProps {
  width?: PageContainerWidth;
}

const props = withDefaults(defineProps<PageContainerProps>(), {
  width: 'auto',
});
const layoutStore = useLayoutStore();
const { contentWidthPreset } = storeToRefs(layoutStore);

const resolvedWidth = computed<Exclude<PageContainerWidth, 'auto'>>(() => {
  if (props.width === 'auto') {
    return contentWidthPreset.value;
  }
  return props.width;
});

const widthClass = computed(() => {
  if (resolvedWidth.value === 'narrow') {
    return 'max-w-4xl';
  }
  if (resolvedWidth.value === 'wide') {
    return 'max-w-screen-2xl';
  }
  if (resolvedWidth.value === 'full') {
    return 'max-w-none';
  }
  return 'max-w-6xl';
});
</script>

<template>
  <div class="mx-auto w-full px-4 pb-12 pt-6 sm:px-6 lg:px-8" :class="widthClass">
    <slot />
  </div>
</template>
