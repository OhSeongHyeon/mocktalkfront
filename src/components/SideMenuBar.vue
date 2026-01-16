<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const props = defineProps<{
  collapsed: boolean;
  mobileOpen: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const route = useRoute();

const menuSections = [
  {
    title: '메인',
    items: [
      { name: '홈', icon: 'home', path: '/' },
      { name: '구독', icon: 'subscriptions' },
    ],
  },
  {
    title: '둘러보기',
    items: [
      { name: '공지사항', icon: 'megaphone' },
      { name: '문의 게시판', icon: 'chat' },
      { name: '커뮤니티', icon: 'community' },
      { name: '이미지 갤러리', icon: 'gallery' },
    ],
  },
  {
    title: '보관함',
    items: [
      { name: '보관함', icon: 'library' },
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

const iconPaths: Record<string, string[]> = {
  home: ['M3 10.5l9-7 9 7', 'M5 9.5V21h14V9.5'],
  subscriptions: ['M4 7h16v10H4z', 'M10 10l4 2.5-4 2.5z'],
  megaphone: ['M3 11l8-4v10l-8-4z', 'M11 9h4a4 4 0 0 1 0 6h-4'],
  chat: ['M4 6h16v9H7l-3 3V6z'],
  community: ['M7 11a3 3 0 1 0 0-6', 'M17 12a3 3 0 1 0 0-6', 'M3 20v-1a4 4 0 0 1 4-4h2', 'M13 19v-1a4 4 0 0 1 4-4h2'],
  gallery: ['M4 6h16v12H4z', 'M8 12l2 2 4-5 6 7'],
  library: ['M4 5h4v14H4z', 'M10 5h10v14H10z', 'M10 9h10'],
  history: ['M12 7v5l3 2', 'M4 12a8 8 0 1 0 8-8'],
  settings: ['M4 6h16', 'M4 12h10', 'M4 18h16', 'M16 12h4'],
  help: ['M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4', 'M12 17h.01'],
};

const isActive = (path?: string) => {
  if (!path) {
    return false;
  }
  if (path === '/') {
    return route.path === '/';
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
  menuSections.map((section) => ({
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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-5 w-5"
              aria-hidden="true"
            >
              <path v-for="path in iconPaths[item.icon]" :key="path" :d="path" />
            </svg>
          </span>
          <span v-if="!isCompact" class="truncate">{{ item.name }}</span>
        </component>
      </div>
    </nav>
  </aside>
</template>
