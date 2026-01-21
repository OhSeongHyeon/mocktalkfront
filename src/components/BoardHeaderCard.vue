<script setup lang="ts">
import boardPlaceholderIcon from '../assets/icons/icon-board-placeholder.svg';

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
        <img :src="boardPlaceholderIcon" alt="" aria-hidden="true" class="h-8 w-8" />
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
