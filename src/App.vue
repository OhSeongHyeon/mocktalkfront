<script setup lang="ts">
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
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="맨 아래로 이동"
        class="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-lg backdrop-blur transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:bg-slate-900"
        @click="scrollToBottom"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M12 5v14" />
          <path d="M19 12l-7 7-7-7" />
        </svg>
      </button>
    </div>
  </div>
</template>
