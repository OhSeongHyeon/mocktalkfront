<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

import { useLayoutStore } from '../../stores/layout';
import SideMenuBar from './SideMenuBar.vue';
import TopMenuBar from './TopMenuBar.vue';

const isMobileMenuOpen = ref(false);
const mainElementRef = ref<HTMLElement | null>(null);
const layoutStore = useLayoutStore();
const { menuCollapsed, sideMenuDisplayMode, topMenuPositionMode } = storeToRefs(layoutStore);
const { setMenuCollapsed } = layoutStore;

const isMobileView = () => (typeof window !== 'undefined' ? window.innerWidth < 768 : false);
const isFixedTopMenu = computed(() => topMenuPositionMode.value === 'fixed');

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
  <div data-testid="app-shell" class="app-shell flex flex-col" :class="isFixedTopMenu ? 'h-screen overflow-hidden' : 'min-h-screen'">
    <template v-if="isFixedTopMenu">
      <div data-testid="top-menu-wrapper" class="h-[3.75rem] shrink-0">
        <TopMenuBar @toggle-menu="toggleMenu" />
      </div>
      <div class="flex min-h-0 flex-1 items-stretch overflow-hidden">
        <SideMenuBar
          :collapsed="menuCollapsed"
          :display-mode="sideMenuDisplayMode"
          :mobile-open="isMobileMenuOpen"
          :top-menu-position-mode="topMenuPositionMode"
          @close="closeMobileMenu"
        />
        <div data-testid="layout-main-frame" class="flex min-h-0 min-w-0 flex-1">
          <main ref="mainElementRef" class="ui-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div class="min-h-full">
              <slot />
            </div>
          </main>
        </div>
      </div>
    </template>
    <main v-else ref="mainElementRef" class="ui-scrollbar min-h-0 flex-1 overflow-y-auto">
      <div data-testid="top-menu-inline">
        <TopMenuBar @toggle-menu="toggleMenu" />
      </div>
      <div class="flex min-h-[calc(100vh-3.75rem)] items-stretch overflow-hidden">
        <SideMenuBar
          :collapsed="menuCollapsed"
          :display-mode="sideMenuDisplayMode"
          :mobile-open="isMobileMenuOpen"
          :top-menu-position-mode="topMenuPositionMode"
          @close="closeMobileMenu"
        />
        <div data-testid="layout-main-frame" class="flex min-h-0 min-w-0 flex-1">
          <div class="min-h-full flex-1">
            <slot />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
