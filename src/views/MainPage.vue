<script setup lang="ts">
import { ref } from 'vue';

import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';

const isCollapsed = ref(false);

const toggleMenu = () => {
  isCollapsed.value = !isCollapsed.value;
};
</script>

<template>
  <div class="min-h-screen text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex w-full">
      <SideMenuBar :collapsed="isCollapsed" />
      <main class="flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8"></main>
    </div>
  </div>
</template>
