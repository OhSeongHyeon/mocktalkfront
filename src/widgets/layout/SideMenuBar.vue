<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute } from 'vue-router';

import { resolveSideMenuIcon } from '../../shared/lib/sideMenuIcons';
import AppIcon from '../../shared/ui/AppIcon.vue';
import type { TopMenuPositionMode } from '../../stores/layout';
import { useAuthStore } from '../../stores/auth';
const props = defineProps<{
  collapsed: boolean;
  displayMode: 'collapse' | 'hidden';
  mobileOpen: boolean;
  topMenuPositionMode: TopMenuPositionMode;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const route = useRoute();
const { t } = useI18n();
const authStore = useAuthStore();
const { isAdmin, isManagerOrAdmin } = storeToRefs(authStore);

type SideMenuItem = {
  name: string;
  icon: string;
  path?: string;
  implemented: boolean;
  active?: boolean;
};

type RawSideMenuItem = Omit<SideMenuItem, 'implemented' | 'active'>;
type RawSideMenuSection = {
  title: string;
  items: RawSideMenuItem[];
};

const serviceSections = computed<RawSideMenuSection[]>(() => [
  {
    title: t('nav.sections.main'),
    items: [
      { name: t('nav.home'), icon: 'home', path: '/' },
      { name: t('nav.subscribe'), icon: 'subscribe', path: '/boards/subscribes' },
    ],
  },
  {
    title: t('nav.sections.explore'),
    items: [
      { name: t('nav.notice'), icon: 'megaphone', path: '/b/notice' },
      { name: t('nav.inquiry'), icon: 'chat', path: '/b/inquiry' },
      { name: t('nav.community'), icon: 'community', path: '/boards' },
      { name: t('nav.contents'), icon: 'gallery', path: '/contents' },
    ],
  },
  {
    title: t('nav.sections.archive'),
    items: [
      { name: t('nav.bookmarks'), icon: 'bookmark', path: '/bookmarks' },
      { name: t('nav.history'), icon: 'history', path: '/history' },
    ],
  },
  {
    title: t('nav.sections.settings'),
    items: [
      { name: t('nav.settings'), icon: 'settings', path: '/settings' },
      { name: t('nav.help'), icon: 'help' },
    ],
  },
]);

const isActive = (path?: string) => {
  if (!path) {
    return false;
  }
  if (path === '/') {
    return route.path === '/';
  }
  if (path === '/admin') {
    return route.path === '/admin';
  }
  if (path === '/boards') {
    return route.path === '/boards';
  }
  return route.path.startsWith(path);
};

const isCompact = computed(() => props.displayMode === 'collapse' && props.collapsed && !props.mobileOpen);
const isDesktopHidden = computed(() => props.displayMode === 'hidden' && props.collapsed && !props.mobileOpen);
const mobilePanelPlacementClass = computed(() =>
  props.topMenuPositionMode === 'fixed' ? 'top-[3.75rem] h-[calc(100vh-3.75rem)]' : 'top-0 h-screen',
);
const isBackofficeRoute = computed(() => route.path === '/admin' || route.path.startsWith('/admin/'));

const closeMobileMenu = () => {
  emit('close');
};

const handleMenuClick = (item: SideMenuItem) => {
  if (!item.path) {
    return;
  }
  if (props.mobileOpen) {
    emit('close');
  }
};

const decorateSections = (rawSections: RawSideMenuSection[]) =>
  rawSections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      implemented: Boolean(item.path),
      active: isActive(item.path),
    })),
  }));

const backofficeSections = computed(() => {
  const sections: RawSideMenuSection[] = [
    {
      title: t('nav.sections.navigate'),
      items: [
        { name: t('nav.serviceHome'), icon: 'home', path: '/' },
        { name: t('nav.backofficeHome'), icon: 'shield', path: '/admin' },
      ],
    },
    ...(isManagerOrAdmin.value
      ? [
          {
            title: t('nav.sections.operations'),
            items: [
              { name: t('nav.articleImport'), icon: 'community', path: '/admin/article-imports' },
              { name: t('nav.contentMarket'), icon: 'pulse', path: '/admin/content-market' },
              { name: t('nav.newsBot'), icon: 'megaphone', path: '/admin/news-bot' },
            ],
          },
        ]
      : []),
    ...(isAdmin.value
      ? [
          {
            title: t('nav.sections.management'),
            items: [
              { name: t('nav.users'), icon: 'users', path: '/admin/users' },
              { name: t('nav.boards'), icon: 'community', path: '/admin/boards' },
              { name: t('nav.reports'), icon: 'shield', path: '/admin/reports' },
              { name: t('nav.sanctions'), icon: 'gavel', path: '/admin/sanctions' },
              { name: t('nav.auditLogs'), icon: 'pulse', path: '/admin/audit-logs' },
            ],
          },
        ]
      : []),
  ];

  return decorateSections(sections);
});

const sections = computed(() => {
  if (isBackofficeRoute.value) {
    return backofficeSections.value;
  }

  const rawSections: RawSideMenuSection[] = [
    ...serviceSections.value,
    ...(isManagerOrAdmin.value
      ? [
          {
            title: t('nav.sections.workspace'),
            items: [{ name: t('nav.backoffice'), icon: 'shield', path: '/admin' }],
          },
        ]
      : []),
  ];
  return decorateSections(rawSections);
});
</script>

<template>
  <div
    v-if="props.mobileOpen"
    data-testid="side-menu-backdrop"
    class="app-sidebar-backdrop fixed inset-0 z-30 md:hidden"
    aria-hidden="true"
    @click="closeMobileMenu"
  ></div>
  <aside
    data-testid="side-menu-panel"
    class="app-sidebar fixed z-40 flex min-h-0 w-56 shrink-0 flex-col overflow-hidden border transition-all md:static md:top-auto md:h-auto md:self-stretch md:rounded-none md:border-y-0 md:border-l-0 md:shadow-none"
    :class="[
      mobilePanelPlacementClass,
      props.mobileOpen ? 'translate-x-0' : '-translate-x-full',
      isDesktopHidden
        ? 'md:pointer-events-none md:w-0 md:min-w-0 md:translate-x-0 md:border-transparent md:bg-transparent md:p-0 md:opacity-0 md:shadow-none'
        : isCompact
          ? 'md:w-14 md:translate-x-0 md:items-center'
          : 'md:w-52 md:translate-x-0',
    ]"
  >
    <nav class="ui-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-2" :aria-label="t('nav.ariaLabel')">
      <div v-for="section in sections" :key="section.title" class="flex flex-col gap-1">
        <p v-if="!isCompact" class="app-sidebar-section-label">
          {{ section.title }}
        </p>
        <component
          :is="item.path ? RouterLink : 'button'"
          v-for="item in section.items"
          :key="item.name"
          :to="item.path ?? undefined"
          class="app-nav-link focus-visible:ring-2 focus-visible:ring-brand-300/80 focus-visible:outline-none dark:focus-visible:ring-brand-500/40"
          :class="[
            isCompact ? 'justify-center' : 'justify-start',
            item.active ? 'app-nav-link-active' : '',
            item.implemented ? 'cursor-pointer' : 'cursor-not-allowed opacity-55',
          ]"
          :aria-current="item.active ? 'page' : undefined"
          :title="isCompact ? item.name : undefined"
          :type="item.path ? undefined : 'button'"
          :disabled="item.implemented ? undefined : true"
          @click="handleMenuClick(item)"
        >
          <AppIcon :icon="resolveSideMenuIcon(item.icon)" :size="16" :icon-class="item.active ? 'text-link' : 'text-muted'" />
          <span v-if="!isCompact" class="truncate">{{ item.name }}</span>
          <span v-if="!item.implemented && !isCompact" class="bbs-meta shrink-0">{{ t('nav.comingSoon') }}</span>
        </component>
      </div>
    </nav>
  </aside>
</template>
