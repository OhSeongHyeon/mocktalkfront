<script setup lang="ts">
import AuthRequiredModal from './features/auth/ui/AuthRequiredModal.vue';
import ScrollButtons from './shared/ui/ScrollButtons.vue';
</script>

<template>
  <div class="min-h-screen">
    <RouterView />
    <AuthRequiredModal />
    <ScrollButtons />
  </div>
</template>
