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
    <div class="grid gap-0 lg:grid-cols-[5.5rem_minmax(0,1fr)]">
      <div
        class="relative min-h-[5.5rem] overflow-hidden border-b border-slate-200 bg-slate-100 lg:min-h-full lg:border-r lg:border-b-0 dark:border-slate-800 dark:bg-slate-950"
      >
        <FileImage v-if="props.imageFile" :file="props.imageFile" :alt="props.title" class="h-full w-full object-cover" />
        <img v-else-if="props.imageUrl" :src="props.imageUrl" :alt="props.title" class="h-full w-full object-cover" />
        <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
          <img :src="boardPlaceholderIcon" alt="" aria-hidden="true" class="h-6 w-6" />
        </div>
        <div class="absolute top-3 left-3">
          <span class="ui-badge ui-badge-muted">COMMUNITY</span>
        </div>
      </div>

      <div class="px-4 py-4 sm:px-5">
        <div class="flex flex-col gap-3">
          <div class="space-y-1.5">
            <h1 class="text-xl font-black tracking-tight text-slate-900 sm:text-[1.35rem] dark:text-slate-100">
              <RouterLink v-if="props.linkTo" :to="props.linkTo" class="hover:text-brand-700 dark:hover:text-brand-300 transition">
                {{ props.title }}
              </RouterLink>
              <span v-else>{{ props.title }}</span>
            </h1>
            <p class="max-w-4xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ props.description ?? '설명이 없습니다.' }}
            </p>
          </div>

          <div v-if="$slots.meta" class="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
            <slot name="meta" />
          </div>

          <div v-if="$slots.actions" class="border-t border-slate-200 pt-3 dark:border-slate-800">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
