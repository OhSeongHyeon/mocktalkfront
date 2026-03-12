<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ref, watch } from 'vue';

import type { FileLike, FileVariant } from '../../../shared/lib/files';
import { resolveImageUrl } from '../../../shared/lib/files';
import { useAuthStore } from '../../../stores/auth';
import { resolveRenderableFileUrl } from '../lib/fileViewResolver';

interface FileImageProps {
  file?: FileLike | null;
  variant?: FileVariant | null;
  alt?: string;
}

const props = withDefaults(defineProps<FileImageProps>(), {
  file: null,
  variant: 'medium',
  alt: '',
});

const authStore = useAuthStore();
const { isAuthenticated } = storeToRefs(authStore);
const resolvedSrc = ref<string | null>(null);
let requestSequence = 0;

watch(
  [() => props.file, () => props.variant, isAuthenticated],
  async ([file, variant, authenticated]) => {
    const nextSequence = ++requestSequence;
    if (!file) {
      resolvedSrc.value = null;
      return;
    }

    if (!authenticated) {
      resolvedSrc.value = resolveImageUrl(file, variant ?? 'medium');
      return;
    }

    resolvedSrc.value = null;
    try {
      const nextUrl = await resolveRenderableFileUrl(file, variant, authenticated);
      if (nextSequence !== requestSequence) {
        return;
      }
      resolvedSrc.value = nextUrl;
    } catch {
      if (nextSequence !== requestSequence) {
        return;
      }
      resolvedSrc.value = resolveImageUrl(file, variant ?? 'medium');
    }
  },
  { immediate: true },
);
</script>

<template>
  <img v-if="resolvedSrc" :src="resolvedSrc" :alt="alt" />
</template>
