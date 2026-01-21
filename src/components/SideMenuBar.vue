<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { isAdmin } from '../stores/auth';
import iconBookmark from '../assets/icons/icon-bookmark.svg';
import iconChat from '../assets/icons/icon-chat.svg';
import iconCommunity from '../assets/icons/icon-community.svg';
import iconGallery from '../assets/icons/icon-gallery.svg';
import iconGavel from '../assets/icons/icon-gavel.svg';
import iconHelp from '../assets/icons/icon-help.svg';
import iconHistory from '../assets/icons/icon-history.svg';
import iconHome from '../assets/icons/icon-home.svg';
import iconMegaphone from '../assets/icons/icon-megaphone.svg';
import iconPulse from '../assets/icons/icon-pulse.svg';
import iconSettings from '../assets/icons/icon-settings.svg';
import iconShield from '../assets/icons/icon-shield.svg';
import iconStack from '../assets/icons/icon-stack.svg';
import iconUsers from '../assets/icons/icon-users.svg';
const props = defineProps<{
  collapsed: boolean;
  mobileOpen: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const route = useRoute();

const baseSections = [
  {
    title: '메인',
    items: [
      { name: '홈', icon: 'home', path: '/' },
      { name: '구독', icon: 'stack', path: '/boards/subscribes' },
    ],
  },
  {
    title: '둘러보기',
    items: [
      { name: '공지사항', icon: 'megaphone', path: '/b/notice' },
      { name: '문의 게시판', icon: 'chat', path: '/b/inquiry' },
      { name: '커뮤니티', icon: 'community', path: '/boards' },
      { name: '이미지 갤러리', icon: 'gallery' },
    ],
  },
  {
    title: '보관함',
    items: [
      { name: '보관함', icon: 'bookmark', path: '/bookmarks' },
      { name: '기록', icon: 'history' },
    ],
  },
  {
    title: '설정',
    items: [
      { name: '설정', icon: 'settings' },
      { name: '도움말', icon: 'help' },
    ],
  },
];

const iconAssets: Record<string, string> = {
  home: iconHome,
  stack: iconStack,
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
  if (path === '/boards') {
    return route.path === '/boards';
  }
  return route.path.startsWith(path);
};

const isCompact = computed(() => props.collapsed && !props.mobileOpen);

const closeMobileMenu = () => {
  emit('close');
};

const handleMenuClick = () => {
  if (props.mobileOpen) {
    emit('close');
  }
};

const sections = computed(() =>
  [
    ...baseSections,
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
  ].map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      active: isActive(item.path),
    })),
  })),
);
</script>

<template>
  <div v-if="props.mobileOpen" class="fixed inset-0 z-40 bg-slate-900/40 md:hidden" aria-hidden="true" @click="closeMobileMenu"></div>
  <aside
    class="fixed top-16 z-50 flex h-[calc(100vh-4rem)] w-64 shrink-0 flex-col gap-4 overflow-hidden rounded-3xl rounded-l-none border border-slate-200/80 bg-white/90 p-3 shadow-sm backdrop-blur transition-all dark:border-slate-800/80 dark:bg-slate-950/90 md:sticky md:top-0 md:h-full md:translate-x-0"
    :class="[props.mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0', isCompact ? 'md:w-20 md:items-center' : 'md:w-64']"
  >
    <div v-if="!isCompact" class="px-3 pt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">메뉴</div>

    <nav class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto" aria-label="사이드 메뉴">
      <div v-for="section in sections" :key="section.title" class="flex flex-col gap-1">
        <p v-if="!isCompact" class="px-3 pt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          {{ section.title }}
        </p>
        <component
          :is="item.path ? RouterLink : 'button'"
          v-for="item in section.items"
          :key="item.name"
          :to="item.path ?? undefined"
          class="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition"
          :class="[
            isCompact ? 'justify-center' : 'justify-start',
            item.active
              ? 'bg-[color:var(--accent-soft)] text-slate-900 dark:bg-red-500/10 dark:text-slate-100'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60',
          ]"
          :aria-current="item.active ? 'page' : undefined"
          :title="isCompact ? item.name : undefined"
          :type="item.path ? undefined : 'button'"
          @click="handleMenuClick"
        >
          <span
            class="grid h-9 w-9 place-items-center rounded-xl"
            :class="item.active ? 'text-[color:var(--accent-strong)] dark:text-red-400' : 'text-slate-600 dark:text-slate-300'"
          >
            <img :src="iconAssets[item.icon]" alt="" aria-hidden="true" class="h-5 w-5" />
          </span>
          <span v-if="!isCompact" class="truncate">{{ item.name }}</span>
        </component>
      </div>
    </nav>
  </aside>
</template>
