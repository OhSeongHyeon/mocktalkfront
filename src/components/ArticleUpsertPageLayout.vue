<script setup lang="ts">
import { ref } from 'vue';

import BoardHeaderCard from './BoardHeaderCard.vue';
import SideMenuBar from '../widgets/layout/SideMenuBar.vue';
import TopMenuBar from '../widgets/layout/TopMenuBar.vue';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

interface ArticleUpsertPageLayoutProps {
  boardTitle: string;
  boardDescription?: string | null;
  boardImageUrl?: string | null;
  boardLinkTo?: string;
  errorMessage?: string;
  isLoading: boolean;
  loadingMessage: string;
}

const props = defineProps<ArticleUpsertPageLayoutProps>();

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
        <div class="mx-auto w-full max-w-7xl">
          <BoardHeaderCard
            :title="boardTitle"
            :description="boardDescription ?? '설명이 없습니다.'"
            :image-url="boardImageUrl"
            :link-to="boardLinkTo"
          />

          <div v-if="props.errorMessage" class="ui-state ui-state-danger mt-6">
            {{ props.errorMessage }}
          </div>

          <div v-if="props.isLoading" class="mt-6 text-sm text-slate-500">
            {{ props.loadingMessage }}
          </div>

          <slot v-else />
        </div>
      </main>
    </div>
  </div>
</template>
