<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';
import { useI18n } from 'vue-i18n';

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
  overlayClass: 'bg-[var(--surface-overlay)]',
  panelClass: '',
  size: 'md',
  ariaLabel: '',
});

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const { t } = useI18n();

const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`;

const resolvedAriaLabel = computed(() => props.ariaLabel || t('common.modal'));

const panelClasses = computed(() => {
  const sizeMap: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };
  const base = `relative w-full ${sizeMap[props.size] ?? sizeMap.md} rounded-[0.8rem] border border-line bg-surface p-5 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.26)] dark:border-line `;
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
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" :aria-label="resolvedAriaLabel">
    <div class="absolute inset-0 backdrop-blur-sm" :class="overlayClass" @click="handleBackdropClick"></div>
    <div :class="panelClasses" @click.stop>
      <slot :title-id="titleId" />
    </div>
  </div>
</template>
