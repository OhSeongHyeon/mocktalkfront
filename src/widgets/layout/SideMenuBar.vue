<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { useAuthStore } from '../../stores/auth';
import iconBookmark from '../../assets/icons/icon-bookmark.svg';
import iconChat from '../../assets/icons/icon-chat.svg';
import iconCommunity from '../../assets/icons/icon-community.svg';
import iconGallery from '../../assets/icons/icon-gallery.svg';
import iconGavel from '../../assets/icons/icon-gavel.svg';
import iconHelp from '../../assets/icons/icon-help.svg';
import iconHistory from '../../assets/icons/icon-history.svg';
import iconHome from '../../assets/icons/icon-home.svg';
import iconMegaphone from '../../assets/icons/icon-megaphone.svg';
import iconPulse from '../../assets/icons/icon-pulse.svg';
import iconSettings from '../../assets/icons/icon-settings.svg';
import iconShield from '../../assets/icons/icon-shield.svg';
import iconSubscribe from '../../assets/icons/icon-subscribe.svg';
import iconUsers from '../../assets/icons/icon-users.svg';

const props = defineProps<{
  collapsed: boolean;
  displayMode: 'collapse' | 'hidden';
  mobileOpen: boolean;
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

const iconAssets: Record<string, string> = {
  home: iconHome,
  subscribe: iconSubscribe,
  megaphone: iconMegaphone,
  chat: iconChat,
  community: iconCommunity,
  gallery: iconGallery,
  bookmark: iconBookmark,
  history: iconHistory,
  shield: iconShield,
  gavel: iconGavel,
  pulse: iconPulse,
  users: iconUsers,
  settings: iconSettings,
  help: iconHelp,
};

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
const isBackofficeRoute = computed(() => route.path === '/admin' || route.path.startsWith('/admin/'));
const menuTitle = computed(() => (isBackofficeRoute.value ? '백오피스' : '서비스 탐색'));
const menuDescription = computed(() =>
  isBackofficeRoute.value ? '운영 화면을 빠르게 오갈 수 있는 메뉴입니다.' : '주요 게시판과 기능을 빠르게 찾는 탐색 메뉴입니다.',
);

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
    class="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
    aria-hidden="true"
    @click="closeMobileMenu"
  ></div>
  <aside
    class="fixed top-[3.9rem] z-50 flex h-[calc(100vh-4.6rem)] min-h-0 w-72 shrink-0 flex-col gap-3 overflow-hidden rounded-[0.8rem] border border-slate-200 bg-white shadow-[0_18px_36px_-28px_rgba(15,23,42,0.28)] transition-all md:static md:top-auto md:h-auto md:self-stretch dark:border-slate-800 dark:bg-slate-900"
    :class="[
      props.mobileOpen ? 'translate-x-0' : '-translate-x-full',
      isDesktopHidden
        ? 'md:pointer-events-none md:w-0 md:min-w-0 md:translate-x-0 md:border-transparent md:bg-transparent md:p-0 md:opacity-0 md:shadow-none'
        : isCompact
          ? 'md:w-24 md:translate-x-0 md:items-center'
          : 'md:w-72 md:translate-x-0',
    ]"
  >
    <div v-if="!isCompact" class="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
      <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">
        {{ isBackofficeRoute ? 'Workspace' : 'Boards' }}
      </p>
      <p class="mt-1 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">{{ menuTitle }}</p>
      <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ menuDescription }}</p>
    </div>

    <nav class="ui-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-2 py-3" aria-label="사이드 메뉴">
      <div v-for="section in sections" :key="section.title" class="flex flex-col gap-1">
        <p v-if="!isCompact" class="px-2 pt-2 text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
          {{ section.title }}
        </p>
        <component
          :is="item.path ? RouterLink : 'button'"
          v-for="item in section.items"
          :key="item.name"
          :to="item.path ?? undefined"
          class="focus-visible:ring-brand-300/80 dark:focus-visible:ring-brand-500/40 flex items-center gap-3 rounded-[0.55rem] border px-2.5 py-2.5 text-sm font-semibold transition focus-visible:ring-2 focus-visible:outline-none"
          :class="[
            isCompact ? 'justify-center' : 'justify-start',
            item.active
              ? 'border-brand-200 bg-brand-50 dark:border-brand-900/50 dark:bg-brand-950/30 text-slate-900 dark:text-slate-100'
              : item.implemented
                ? 'cursor-pointer border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-200 dark:hover:border-slate-800 dark:hover:bg-slate-950'
                : 'cursor-not-allowed border-transparent text-slate-400 dark:text-slate-500',
          ]"
          :aria-current="item.active ? 'page' : undefined"
          :title="isCompact ? item.name : undefined"
          :type="item.path ? undefined : 'button'"
          :disabled="item.implemented ? undefined : true"
          @click="handleMenuClick(item)"
        >
          <span
            class="grid h-9 w-9 place-items-center rounded-[0.55rem] border"
            :class="
              item.active
                ? 'border-brand-200 text-brand-700 dark:border-brand-900/60 dark:text-brand-300 bg-white dark:bg-slate-950'
                : item.implemented
                  ? 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                  : 'border-transparent text-slate-400 dark:text-slate-500'
            "
          >
            <img :src="iconAssets[item.icon]" alt="" aria-hidden="true" class="h-5 w-5" />
          </span>

          <div v-if="!isCompact" class="flex min-w-0 flex-1 items-center justify-between gap-2">
            <div class="min-w-0">
              <span class="truncate text-sm">{{ item.name }}</span>
              <p v-if="item.active" class="text-[11px] text-slate-500 dark:text-slate-400">현재 화면</p>
            </div>
            <span v-if="!item.implemented" class="ui-badge ui-badge-muted shrink-0">준비중</span>
          </div>
        </component>
      </div>
    </nav>
  </aside>
</template>
