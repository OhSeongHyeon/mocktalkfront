<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

import ConfirmModal from '../../../shared/ui/ConfirmModal.vue';
import { useAuthPromptStore } from '../../../stores/authPrompt';

const router = useRouter();
const authPromptStore = useAuthPromptStore();
const { isOpen, requestedPath } = storeToRefs(authPromptStore);
const { closePrompt } = authPromptStore;

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
    title="로그인이 필요한 화면입니다."
    description="이 화면은 로그인 후 이용할 수 있습니다. 로그인 페이지로 이동할까요?"
    confirm-label="로그인하기"
    cancel-label="닫기"
    overlay-class="bg-[var(--surface-overlay)]"
    aria-label="로그인 안내"
    @close="closePrompt"
    @confirm="handleConfirm"
  />
</template>
