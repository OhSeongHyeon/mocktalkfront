<script setup lang="ts">
import { ref, watch } from 'vue';

import type { SlashCommandItem } from '../lib/editor/slashTypes';

interface SlashCommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

const props = defineProps<SlashCommandListProps>();

const selectedIndex = ref(0);

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0;
  },
  { deep: true },
);

const selectItem = (index: number) => {
  const item = props.items[index];
  if (!item) {
    return;
  }
  props.command(item);
};

const onKeyDown = (event: KeyboardEvent) => {
  if (!props.items.length) {
    return false;
  }
  if (event.key === 'ArrowUp') {
    selectedIndex.value = (selectedIndex.value - 1 + props.items.length) % props.items.length;
    return true;
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length;
    return true;
  }
  if (event.key === 'Enter') {
    selectItem(selectedIndex.value);
    return true;
  }
  return false;
};

defineExpose({ onKeyDown });
</script>

<template>
  <div class="w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
    <div class="border-b border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-slate-800">슬래시 명령어</div>
    <div v-if="items.length === 0" class="px-3 py-2 text-xs text-slate-400">검색 결과가 없습니다.</div>
    <button
      v-for="(item, index) in items"
      :key="item.id"
      type="button"
      class="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition"
      :class="
        index === selectedIndex
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/60'
      "
      @click="selectItem(index)"
    >
      <span class="text-xs font-semibold">{{ item.title }}</span>
      <span class="text-[11px] text-slate-500 dark:text-slate-400">{{ item.description }}</span>
    </button>
  </div>
</template>
