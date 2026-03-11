<script setup lang="ts">
import HomeCommunitySection from '../widgets/home/HomeCommunitySection.vue';
import HomeRecentArticleSection from '../widgets/home/HomeRecentArticleSection.vue';
import HomeSubscriptionSection from '../widgets/home/HomeSubscriptionSection.vue';
import PageContainer from '../shared/ui/PageContainer.vue';
import { isAuthenticated } from '../stores/auth';
import AppShell from '../widgets/layout/AppShell.vue';
</script>

<template>
  <AppShell>
    <PageContainer width="auto">
      <div class="space-y-8">
        <HomeSubscriptionSection v-if="isAuthenticated" />
        <HomeCommunitySection />
        <HomeRecentArticleSection />
      </div>
    </PageContainer>
  </AppShell>
</template>
