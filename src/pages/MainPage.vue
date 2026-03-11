<script setup lang="ts">
import { ref } from 'vue';

import HomeCommunitySection from '../widgets/home/HomeCommunitySection.vue';
import HomeRecentArticleSection from '../widgets/home/HomeRecentArticleSection.vue';
import HomeSubscriptionSection from '../widgets/home/HomeSubscriptionSection.vue';
import { isAuthenticated } from '../stores/auth';
import SideMenuBar from '../widgets/layout/SideMenuBar.vue';
import TopMenuBar from '../widgets/layout/TopMenuBar.vue';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

const isMobileMenuOpen = ref(false);

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
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900 dark:text-slate-100">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-6xl">
          <div class="space-y-8">
            <HomeSubscriptionSection v-if="isAuthenticated" />
            <HomeCommunitySection />
            <HomeRecentArticleSection />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
