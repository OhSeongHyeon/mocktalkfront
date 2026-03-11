<script setup lang="ts">
import BoardHeaderCard from '../board/BoardHeaderCard.vue';
import PageContainer from '../../shared/ui/PageContainer.vue';
import AppShell from '../layout/AppShell.vue';

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
</script>

<template>
  <AppShell>
    <PageContainer width="narrow">
      <div>
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
    </PageContainer>
  </AppShell>
</template>
