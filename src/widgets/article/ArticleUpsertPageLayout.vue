<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import BoardHeaderCard from '../board/BoardHeaderCard.vue';
import PageContainer from '../../shared/ui/PageContainer.vue';
import AppShell from '../layout/AppShell.vue';
import type { FileLike } from '../../shared/lib/files';

interface ArticleUpsertPageLayoutProps {
  boardTitle: string;
  boardDescription?: string | null;
  boardImageUrl?: string | null;
  boardImageFile?: FileLike | null;
  boardLinkTo?: string;
  errorMessage?: string;
  isLoading: boolean;
  loadingMessage: string;
}

const props = defineProps<ArticleUpsertPageLayoutProps>();
const { t } = useI18n();
</script>

<template>
  <AppShell>
    <PageContainer width="auto">
      <div>
        <BoardHeaderCard
          :title="boardTitle"
          :description="boardDescription ?? t('editor.layout.noDescription')"
          :image-url="boardImageUrl"
          :image-file="boardImageFile"
          :link-to="boardLinkTo"
        />

        <div v-if="props.errorMessage" class="ui-state ui-state-danger mt-6">
          {{ props.errorMessage }}
        </div>

        <div v-if="props.isLoading" class="mt-6 text-sm text-muted">
          {{ props.loadingMessage }}
        </div>

        <slot v-else />
      </div>
    </PageContainer>
  </AppShell>
</template>
