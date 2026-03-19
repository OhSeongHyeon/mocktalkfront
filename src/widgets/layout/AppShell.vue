<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

import { useLayoutStore } from '../../stores/layout';
import SideMenuBar from './SideMenuBar.vue';
import TopMenuBar from './TopMenuBar.vue';

const isMobileMenuOpen = ref(false);
const mainElementRef = ref<HTMLElement | null>(null);
const layoutStore = useLayoutStore();
const { menuCollapsed, sideMenuDisplayMode } = storeToRefs(layoutStore);
const { setMenuCollapsed } = layoutStore;

const isMobileView = () => (typeof window !== 'undefined' ? window.innerWidth < 768 : false);

const toggleMenu = () => {
  if (isMobileView()) {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
    return;
  }
  setMenuCollapsed(!menuCollapsed.value);
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

const getMainElement = () => mainElementRef.value;

defineExpose({
  getMainElement,
});
</script>

<template>
  <div class="flex min-h-screen flex-col overflow-hidden text-slate-900 dark:text-slate-100">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="mx-auto flex min-h-0 w-full max-w-[1680px] flex-1 gap-3 px-3 pb-3 sm:gap-4 sm:px-4 sm:pb-4 lg:px-5">
      <SideMenuBar :collapsed="menuCollapsed" :display-mode="sideMenuDisplayMode" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main
        ref="mainElementRef"
        class="ui-scrollbar min-h-0 flex-1 overflow-y-auto rounded-[1.75rem] border border-slate-200/70 bg-white/55 shadow-[0_28px_60px_-42px_rgba(15,23,42,0.35)] backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-950/45"
      >
        <div class="min-h-full">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
