<script setup lang="ts">
const props = defineProps<{
  collapsed: boolean;
}>();

const menuSections = [
  {
    title: '메인',
    items: [
      { name: '홈', icon: 'home', active: true },
      { name: 'Shorts', icon: 'shorts' },
      { name: '구독', icon: 'subscriptions' },
    ],
  },
  {
    title: '둘러보기',
    items: [
      { name: '공지사항', icon: 'megaphone' },
      { name: '문의 게시판', icon: 'chat' },
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
  shorts: ['M10 4l6 4-6 4V4z', 'M10 12l6 4-6 4v-8z'],
  subscriptions: ['M4 7h16v10H4z', 'M10 10l4 2.5-4 2.5z'],
  megaphone: ['M3 11l8-4v10l-8-4z', 'M11 9h4a4 4 0 0 1 0 6h-4'],
  chat: ['M4 6h16v9H7l-3 3V6z'],
  gallery: ['M4 6h16v12H4z', 'M8 12l2 2 4-5 6 7'],
  library: ['M4 5h4v14H4z', 'M10 5h10v14H10z', 'M10 9h10'],
  history: ['M12 7v5l3 2', 'M4 12a8 8 0 1 0 8-8'],
  settings: ['M4 6h16', 'M4 12h10', 'M4 18h16', 'M16 12h4'],
  help: ['M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4', 'M12 17h.01'],
};
</script>

<template>
  <aside
    class="sticky top-16 flex h-[calc(100vh-4rem)] shrink-0 flex-col gap-4 overflow-y-auto rounded-3xl rounded-l-none border border-slate-200/80 bg-white/90 p-3 shadow-sm backdrop-blur transition-all dark:border-slate-800/80 dark:bg-slate-950/90"
    :class="props.collapsed ? 'w-20 items-center' : 'w-64'"
  >
    <div
      v-if="!props.collapsed"
      class="px-3 pt-2 text-sm font-semibold text-slate-800 dark:text-slate-100"
    >
      메뉴
    </div>

    <nav class="flex flex-col gap-3" aria-label="사이드 메뉴">
      <div v-for="section in menuSections" :key="section.title" class="flex flex-col gap-1">
        <p
          v-if="!props.collapsed"
          class="px-3 pt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500"
        >
          {{ section.title }}
        </p>
        <a
          v-for="item in section.items"
          :key="item.name"
          href="#"
          class="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition"
          :class="[
            props.collapsed ? 'justify-center' : 'justify-start',
            item.active
              ? 'bg-[color:var(--accent-soft)] text-slate-900 dark:bg-red-500/10 dark:text-slate-100'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60',
          ]"
          :aria-current="item.active ? 'page' : undefined"
          :title="props.collapsed ? item.name : undefined"
        >
          <span
            class="grid h-9 w-9 place-items-center rounded-xl"
            :class="
              item.active
                ? 'text-[color:var(--accent-strong)] dark:text-red-400'
                : 'text-slate-600 dark:text-slate-300'
            "
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
          <span v-if="!props.collapsed" class="truncate">{{ item.name }}</span>
        </a>
      </div>
    </nav>
  </aside>
</template>
