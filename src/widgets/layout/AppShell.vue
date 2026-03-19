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
    <div class="flex min-h-0 flex-1 items-stretch">
      <SideMenuBar :collapsed="menuCollapsed" :display-mode="sideMenuDisplayMode" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <div class="min-w-0 flex-1 px-3 py-3 sm:px-4 sm:py-4">
        <div data-testid="layout-main-frame" class="flex h-full w-full min-w-0">
          <main
            ref="mainElementRef"
            class="ui-scrollbar min-h-0 w-full overflow-y-auto rounded-[0.8rem] border border-slate-200 bg-white shadow-[0_12px_28px_-24px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="min-h-full">
              <slot />
            </div>
          </main>
        </div>
      </div>
    </div>
  </div>
</template>
