<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
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

const serviceSections: RawSideMenuSection[] = [
  {
    title: '메인',
    items: [
      { name: '홈', icon: 'home', path: '/' },
      { name: '구독', icon: 'subscribe', path: '/boards/subscribes' },
    ],
  },
  {
    title: '둘러보기',
    items: [
      { name: '공지사항', icon: 'megaphone', path: '/b/notice' },
      { name: '문의 게시판', icon: 'chat', path: '/b/inquiry' },
      { name: '커뮤니티', icon: 'community', path: '/boards' },
      { name: '콘텐츠', icon: 'gallery', path: '/contents' },
    ],
  },
  {
    title: '보관함',
    items: [
      { name: '보관함', icon: 'bookmark', path: '/bookmarks' },
      { name: '기록', icon: 'history', path: '/history' },
    ],
  },
  {
    title: '설정',
    items: [
      { name: '설정', icon: 'settings', path: '/settings' },
      { name: '도움말', icon: 'help' },
    ],
  },
];

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
      title: '이동',
      items: [
        { name: '서비스 홈', icon: 'home', path: '/' },
        { name: '백오피스 홈', icon: 'shield', path: '/admin' },
      ],
    },
    ...(isManagerOrAdmin.value
      ? [
          {
            title: '운영',
            items: [
              { name: '게시글 임포트', icon: 'community', path: '/admin/article-imports' },
              { name: '콘텐츠 시세', icon: 'pulse', path: '/admin/content-market' },
              { name: '뉴스봇', icon: 'megaphone', path: '/admin/news-bot' },
            ],
          },
        ]
      : []),
    ...(isAdmin.value
      ? [
          {
            title: '관리',
            items: [
              { name: '사용자 관리', icon: 'users', path: '/admin/users' },
              { name: '게시판 관리', icon: 'community', path: '/admin/boards' },
              { name: '신고 관리', icon: 'shield', path: '/admin/reports' },
              { name: '제재 관리', icon: 'gavel', path: '/admin/sanctions' },
              { name: '운영 로그', icon: 'pulse', path: '/admin/audit-logs' },
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
    ...serviceSections,
    ...(isManagerOrAdmin.value
      ? [
          {
            title: '워크스페이스',
            items: [{ name: '백오피스', icon: 'shield', path: '/admin' }],
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
    <nav class="ui-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-2" aria-label="사이드 메뉴">
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
          <span v-if="!item.implemented && !isCompact" class="bbs-meta shrink-0">준비중</span>
        </component>
      </div>
    </nav>
  </aside>
</template>
