<script setup lang="ts">
import { LayoutGrid } from '@lucide/vue';
import { RouterLink } from 'vue-router';

import FileImage from '../../entities/file/ui/FileImage.vue';
import type { FileLike } from '../../shared/lib/files';
import AppIcon from '../../shared/ui/AppIcon.vue';

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
  <div class="bbs-box overflow-hidden">
    <div class="bbs-toolbar items-start sm:items-center">
      <div class="flex min-w-0 flex-1 items-start gap-3">
        <div
          class="h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface-soft sm:h-[5.5rem] sm:w-[5.5rem]"
          aria-hidden="true"
        >
          <FileImage v-if="props.imageFile" :file="props.imageFile" variant="medium" :alt="props.title" class="h-full w-full object-cover" />
          <img v-else-if="props.imageUrl" :src="props.imageUrl" :alt="props.title" class="h-full w-full object-cover" />
          <div v-else class="flex h-full w-full items-center justify-center text-subtle">
            <AppIcon :icon="LayoutGrid" :size="22" icon-class="text-muted" />
          </div>
        </div>

        <div class="min-w-0 flex-1">
          <h1 class="bbs-toolbar-title text-base">
            <RouterLink v-if="props.linkTo" :to="props.linkTo">{{ props.title }}</RouterLink>
            <span v-else>{{ props.title }}</span>
          </h1>
          <p v-if="props.description" class="ui-caption mt-1 line-clamp-2">{{ props.description }}</p>
          <p v-else class="ui-caption mt-1">설명 없음</p>
        </div>
      </div>

      <div v-if="$slots.actions" class="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="$slots.meta" class="flex flex-wrap gap-2 border-t border-line px-3 py-2 text-xs text-muted">
      <slot name="meta" />
    </div>
  </div>
</template>
