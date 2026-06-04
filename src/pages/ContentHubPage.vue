<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import AppShell from '../widgets/layout/AppShell.vue';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import ContentHubCard from '../widgets/content/ContentHubCard.vue';

const { t } = useI18n();

const galleryCard = computed(() => ({
  title: t('content.hub.gallery.title'),
  description: t('content.hub.gallery.description'),
  badge: t('content.hub.gallery.badge'),
}));

const marketCard = computed(() => ({
  title: t('content.hub.market.title'),
  description: t('content.hub.market.description'),
  to: '/contents/market',
}));
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <section class="space-y-4">
        <PageHeader :eyebrow="t('content.hub.eyebrow')" :title="t('content.hub.title')" />

        <div class="grid gap-4 lg:grid-cols-2">
          <ContentHubCard :title="galleryCard.title" :description="galleryCard.description" :badge="galleryCard.badge" />
          <ContentHubCard :title="marketCard.title" :description="marketCard.description" :to="marketCard.to" />
        </div>
      </section>
    </PageContainer>
  </AppShell>
</template>
