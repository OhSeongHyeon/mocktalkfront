<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';

type BaseModalProps = {
  open: boolean;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  overlayClass?: string;
  panelClass?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  ariaLabel?: string;
};

const props = withDefaults(defineProps<BaseModalProps>(), {
  closeOnBackdrop: true,
  closeOnEsc: true,
  overlayClass: 'bg-slate-900/40',
  panelClass: '',
  size: 'md',
  ariaLabel: '모달',
});

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`;

const panelClasses = computed(() => {
  const sizeMap: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };
  const base = `relative w-full ${sizeMap[props.size] ?? sizeMap.md} rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950`;
  return [base, props.panelClass].filter(Boolean).join(' ');
});

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    emit('close');
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.closeOnEsc) {
    return;
  }
  if (event.key === 'Escape') {
    emit('close');
  }
};

const canUseWindow = () => typeof window !== 'undefined';

watch(
  () => props.open,
  (open) => {
    if (!props.closeOnEsc || !canUseWindow()) {
      return;
    }
    if (open) {
      window.addEventListener('keydown', handleKeydown);
      return;
    }
    window.removeEventListener('keydown', handleKeydown);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (!canUseWindow()) {
    return;
  }
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" :aria-label="ariaLabel">
    <div class="absolute inset-0" :class="overlayClass" @click="handleBackdropClick"></div>
    <div :class="panelClasses" @click.stop>
      <slot :title-id="titleId" />
    </div>
  </div>
</template>
