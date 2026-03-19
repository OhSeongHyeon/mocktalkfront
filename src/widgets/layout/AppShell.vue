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
  <div class="flex min-h-screen flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 flex-1 items-stretch overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :display-mode="sideMenuDisplayMode" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <div data-testid="layout-main-frame" class="flex min-h-0 min-w-0 flex-1">
        <main ref="mainElementRef" class="ui-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div class="min-h-full">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
