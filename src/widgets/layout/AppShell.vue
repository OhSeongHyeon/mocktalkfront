<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useLayoutStore } from '../../stores/layout';
import SideMenuBar from './SideMenuBar.vue';
import TopMenuBar from './TopMenuBar.vue';

const isMobileMenuOpen = ref(false);
const isTopMenuHidden = ref(false);
const mainElementRef = ref<HTMLElement | null>(null);
const layoutStore = useLayoutStore();
const { menuCollapsed, sideMenuDisplayMode, topMenuBehavior } = storeToRefs(layoutStore);
const { setMenuCollapsed } = layoutStore;
let previousScrollTop = 0;

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

const resetTopMenuVisibility = () => {
  isTopMenuHidden.value = false;
  previousScrollTop = mainElementRef.value?.scrollTop ?? 0;
};

const handleMainScroll = () => {
  const mainElement = mainElementRef.value;
  if (!mainElement) {
    return;
  }
  if (topMenuBehavior.value !== 'auto-hide' || isMobileMenuOpen.value) {
    resetTopMenuVisibility();
    return;
  }
  const currentScrollTop = mainElement.scrollTop;
  const scrollDelta = currentScrollTop - previousScrollTop;

  if (currentScrollTop <= 12) {
    isTopMenuHidden.value = false;
    previousScrollTop = currentScrollTop;
    return;
  }

  if (scrollDelta > 10) {
    isTopMenuHidden.value = true;
  } else if (scrollDelta < -10) {
    isTopMenuHidden.value = false;
  }

  previousScrollTop = currentScrollTop;
};

onMounted(() => {
  mainElementRef.value?.addEventListener('scroll', handleMainScroll, { passive: true });
  resetTopMenuVisibility();
});

onBeforeUnmount(() => {
  mainElementRef.value?.removeEventListener('scroll', handleMainScroll);
});

watch(topMenuBehavior, () => {
  resetTopMenuVisibility();
});

watch(isMobileMenuOpen, (mobileOpen) => {
  if (mobileOpen) {
    resetTopMenuVisibility();
  }
});

const getMainElement = () => mainElementRef.value;

defineExpose({
  getMainElement,
});
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div
      data-testid="top-menu-wrapper"
      class="shrink-0 overflow-hidden transition-[height] duration-200"
      :class="topMenuBehavior === 'auto-hide' && isTopMenuHidden ? 'h-0' : 'h-[3.75rem]'"
    >
      <TopMenuBar :hidden-by-scroll="topMenuBehavior === 'auto-hide' && isTopMenuHidden" @toggle-menu="toggleMenu" />
    </div>
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
