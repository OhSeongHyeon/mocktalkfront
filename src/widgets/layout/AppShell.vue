<script setup lang="ts">
import { ref } from 'vue';

import { menuCollapsed, setMenuCollapsed, sideMenuDisplayMode } from '../../stores/layout';
import SideMenuBar from './SideMenuBar.vue';
import TopMenuBar from './TopMenuBar.vue';

const isMobileMenuOpen = ref(false);
const mainElementRef = ref<HTMLElement | null>(null);

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
  <div class="flex h-screen flex-col overflow-hidden text-slate-900 dark:text-slate-100">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :display-mode="sideMenuDisplayMode" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main ref="mainElementRef" class="min-h-0 flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
