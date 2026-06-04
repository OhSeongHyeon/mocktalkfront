<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import ConfirmModal from '../../../shared/ui/ConfirmModal.vue';
import { useAuthPromptStore } from '../../../stores/authPrompt';

const { t } = useI18n();
const router = useRouter();
const authPromptStore = useAuthPromptStore();
const { isOpen, requestedPath } = storeToRefs(authPromptStore);
const { closePrompt } = authPromptStore;

const confirmLabel = computed(() => t('auth.modal.confirm'));
const cancelLabel = computed(() => t('common.close'));

const handleConfirm = async () => {
  const redirectPath = requestedPath.value;
  closePrompt();

  if (redirectPath === '/' || !redirectPath) {
    await router.push('/login');
    return;
  }

  await router.push({
    path: '/login',
    query: {
      redirect: redirectPath,
    },
  });
};
</script>

<template>
  <ConfirmModal
    :open="isOpen"
    :title="t('auth.modal.title')"
    :description="t('auth.modal.description')"
    :confirm-label="confirmLabel"
    :cancel-label="cancelLabel"
    overlay-class="bg-[var(--surface-overlay)]"
    :aria-label="t('auth.modal.ariaLabel')"
    @close="closePrompt"
    @confirm="handleConfirm"
  />
</template>
