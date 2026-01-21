<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

const props = defineProps<{
  slug: string;
  boardName: string;
  active: 'settings' | 'reports' | 'sanctions' | 'categories' | 'members' | 'contents';
}>();

const tabs = computed(() => [
  { key: 'settings', name: '설정', path: `/b/${props.slug}/admin/settings` },
  { key: 'categories', name: '카테고리', path: `/b/${props.slug}/admin/categories` },
  { key: 'members', name: '멤버 관리', path: `/b/${props.slug}/admin/members` },
  { key: 'contents', name: '콘텐츠 관리', path: `/b/${props.slug}/admin/contents` },
  { key: 'reports', name: '신고 관리', path: `/b/${props.slug}/admin/reports` },
  { key: 'sanctions', name: '제재 관리', path: `/b/${props.slug}/admin/sanctions` },
]);
</script>

<template>
  <div class="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Board Admin</p>
        <h2 class="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{{ boardName }}</h2>
      </div>
      <RouterLink
        :to="`/b/${slug}`"
        class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
      >
        게시판으로 이동
      </RouterLink>
    </div>
    <div class="mt-4 flex flex-wrap gap-2">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.path"
        class="rounded-full px-4 py-2 text-sm font-semibold transition"
        :class="
          tab.key === active
            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
        "
      >
        {{ tab.name }}
      </RouterLink>
    </div>
  </div>
</template>
