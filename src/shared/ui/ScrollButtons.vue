<script setup lang="ts">
import { ArrowDown, ArrowUp } from '@lucide/vue';

import AppIcon from './AppIcon.vue';

const getScrollTarget = () => document.querySelector('main') as HTMLElement | null;

const scrollToTop = () => {
  const target = getScrollTarget();
  if (target) {
    target.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const scrollToBottom = () => {
  const target = getScrollTarget();
  if (target) {
    target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' });
    return;
  }
  const height = document.documentElement.scrollHeight;
  window.scrollTo({ top: height, behavior: 'smooth' });
};
</script>

<template>
  <div class="fixed right-6 bottom-6 z-50 hidden flex-col gap-2 md:flex">
    <button
      type="button"
      aria-label="맨 위로 이동"
      class="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-ink shadow-lg backdrop-blur transition hover:bg-surface-soft"
      @click="scrollToTop"
    >
      <AppIcon :icon="ArrowUp" :size="20" />
    </button>
    <button
      type="button"
      aria-label="맨 아래로 이동"
      class="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-ink shadow-lg backdrop-blur transition hover:bg-surface-soft"
      @click="scrollToBottom"
    >
      <AppIcon :icon="ArrowDown" :size="20" />
    </button>
  </div>
</template>
