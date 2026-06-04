<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

const props = defineProps<{
  slug: string;
  boardName: string;
  active: 'settings' | 'reports' | 'sanctions' | 'categories' | 'members' | 'contents';
}>();

const { t } = useI18n();

const tabs = computed(() => [
  { key: 'settings' as const, name: t('admin.boardNav.settings'), path: `/b/${props.slug}/admin/settings` },
  { key: 'categories' as const, name: t('admin.boardNav.categories'), path: `/b/${props.slug}/admin/categories` },
  { key: 'members' as const, name: t('admin.boardNav.members'), path: `/b/${props.slug}/admin/members` },
  { key: 'contents' as const, name: t('admin.boardNav.contents'), path: `/b/${props.slug}/admin/contents` },
  { key: 'reports' as const, name: t('admin.boardNav.reports'), path: `/b/${props.slug}/admin/reports` },
  { key: 'sanctions' as const, name: t('admin.boardNav.sanctions'), path: `/b/${props.slug}/admin/sanctions` },
]);
</script>

<template>
  <div class="ui-panel p-5">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-[11px] font-bold tracking-[0.2em] text-subtle uppercase">{{ t('admin.boardNav.eyebrow') }}</p>
        <h2 class="bbs-row-title mt-1 text-xl">{{ boardName }}</h2>
      </div>
      <RouterLink :to="`/b/${slug}`" class="ui-button-ghost h-10 px-4 text-xs">{{ t('admin.boardNav.backToBoard') }}</RouterLink>
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
