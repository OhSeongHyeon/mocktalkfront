<script setup lang="ts">
import { RouterLink } from 'vue-router';

interface BoardHeaderCardProps {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  linkTo?: string;
}

const props = defineProps<BoardHeaderCardProps>();
</script>

<template>
  <div class="bbs-box">
    <div class="bbs-toolbar">
      <div class="min-w-0 flex-1">
        <h1 class="bbs-toolbar-title text-base">
          <RouterLink v-if="props.linkTo" :to="props.linkTo">{{ props.title }}</RouterLink>
          <span v-else>{{ props.title }}</span>
        </h1>
        <p v-if="props.description" class="ui-caption mt-1 line-clamp-2">{{ props.description }}</p>
        <p v-else class="ui-caption mt-1">설명 없음</p>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-1.5">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="$slots.meta" class="flex flex-wrap gap-2 border-t border-line px-3 py-2 text-xs text-muted">
      <slot name="meta" />
    </div>
  </div>
</template>
