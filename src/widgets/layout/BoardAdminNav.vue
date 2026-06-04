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
  <div class="ui-panel p-5">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-[11px] font-bold tracking-[0.2em] text-subtle uppercase">Board Admin</p>
        <h2 class="bbs-row-title mt-1 text-xl">{{ boardName }}</h2>
      </div>
      <RouterLink :to="`/b/${slug}`" class="ui-button-ghost h-10 px-4 text-xs"> 게시판으로 이동 </RouterLink>
    </div>
    <div class="mt-4">
      <div class="ui-tab-list">
        <RouterLink v-for="tab in tabs" :key="tab.key" :to="tab.path" class="ui-tab-button" :class="tab.key === active ? 'ui-tab-button-active' : ''">
          {{ tab.name }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>
