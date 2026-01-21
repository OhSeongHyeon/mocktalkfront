<script setup lang="ts">
import arrowDownIcon from './assets/icons/icon-arrow-down.svg';
import arrowUpIcon from './assets/icons/icon-arrow-up.svg';
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const scrollToBottom = () => {
  const height = document.documentElement.scrollHeight;
  window.scrollTo({ top: height, behavior: 'smooth' });
};
</script>

<template>
  <div class="min-h-screen">
    <RouterView />
    <div class="fixed bottom-6 right-6 z-50 hidden flex-col gap-2 md:flex">
      <button
        type="button"
        aria-label="맨 위로 이동"
        class="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-lg backdrop-blur transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:bg-slate-900"
        @click="scrollToTop"
      >
        <img :src="arrowUpIcon" alt="" aria-hidden="true" class="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="맨 아래로 이동"
        class="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-lg backdrop-blur transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:bg-slate-900"
        @click="scrollToBottom"
      >
        <img :src="arrowDownIcon" alt="" aria-hidden="true" class="h-5 w-5" />
      </button>
    </div>
  </div>
</template>
