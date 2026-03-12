<script setup lang="ts">
import { RouterLink } from 'vue-router';

import boardPlaceholderIcon from '../../assets/icons/icon-board-placeholder.svg';
import FileImage from '../../entities/file/ui/FileImage.vue';
import type { FileLike } from '../../shared/lib/files';

interface BoardHeaderCardProps {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  imageFile?: FileLike | null;
  linkTo?: string;
}

const props = defineProps<BoardHeaderCardProps>();
</script>

<template>
  <div class="ui-panel overflow-hidden">
    <div class="relative h-44 w-full bg-slate-100 dark:bg-slate-900 sm:h-52">
      <FileImage v-if="props.imageFile" :file="props.imageFile" :alt="props.title" class="h-full w-full object-cover" />
      <img v-else-if="props.imageUrl" :src="props.imageUrl" :alt="props.title" class="h-full w-full object-cover" />
      <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
        <img :src="boardPlaceholderIcon" alt="" aria-hidden="true" class="h-8 w-8" />
        <span class="text-xs">대표 이미지 없음</span>
      </div>
    </div>
    <div class="px-6 py-6 sm:px-7">
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-[1.7rem]">
        <RouterLink v-if="props.linkTo" :to="props.linkTo" class="transition hover:text-slate-700 dark:hover:text-white">
          {{ props.title }}
        </RouterLink>
        <span v-else>{{ props.title }}</span>
      </h1>
      <p class="mt-2 max-w-4xl text-sm text-slate-500 dark:text-slate-400">
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
