<script setup lang="ts">
interface BoardHeaderCardProps {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
}

const props = defineProps<BoardHeaderCardProps>();
</script>

<template>
  <div class="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
    <div class="relative h-48 w-full bg-slate-100 dark:bg-slate-900 sm:h-56">
      <img v-if="props.imageUrl" :src="props.imageUrl" :alt="props.title" class="h-full w-full object-cover" />
      <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-8 w-8"
          aria-hidden="true"
        >
          <path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" />
          <path d="M3 8l9 5 9-5" />
          <path d="M12 13v8" />
        </svg>
        <span class="text-xs">대표 이미지 없음</span>
      </div>
    </div>
    <div class="px-6 py-6">
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {{ props.title }}
      </h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {{ props.description ?? '설명이 없습니다.' }}
      </p>
      <div v-if="$slots.meta" class="mt-4">
        <slot name="meta" />
      </div>
      <div v-if="$slots.actions" class="mt-5">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
