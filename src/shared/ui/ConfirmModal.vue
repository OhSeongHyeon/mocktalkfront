<script setup lang="ts">
import { computed } from 'vue';

import BaseModal from './BaseModal.vue';

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  overlayClass?: string;
  panelClass?: string;
  ariaLabel?: string;
};

const props = withDefaults(defineProps<ConfirmModalProps>(), {
  description: '',
  confirmLabel: '확인',
  cancelLabel: '취소',
  confirmVariant: 'primary',
  confirmDisabled: false,
  cancelDisabled: false,
  closeOnBackdrop: true,
  closeOnEsc: true,
  size: 'md',
  overlayClass: 'bg-slate-900/40',
  panelClass: '',
  ariaLabel: '',
});

const emit = defineEmits<{
  (event: 'confirm'): void;
  (event: 'close'): void;
}>();

const confirmButtonClass = computed(() => {
  const base = 'rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70';
  if (props.confirmVariant === 'danger') {
    return `${base} border border-rose-300 bg-rose-500 text-white hover:bg-rose-600 dark:border-rose-800`;
  }
  return `${base} bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900`;
});

const cancelButtonClass =
  'rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900';

const ariaLabel = computed(() => props.ariaLabel || props.title || '확인 모달');
</script>

<template>
  <BaseModal
    :open="open"
    :close-on-backdrop="closeOnBackdrop"
    :close-on-esc="closeOnEsc"
    :overlay-class="overlayClass"
    :panel-class="panelClass"
    :size="size"
    :aria-label="ariaLabel"
    @close="emit('close')"
  >
    <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ title }}</h3>
    <p v-if="description" class="mt-2 text-sm text-slate-600 dark:text-slate-300">
      {{ description }}
    </p>
    <slot />
    <div class="mt-6 flex items-center justify-end gap-2">
      <button type="button" :class="cancelButtonClass" :disabled="cancelDisabled" @click="emit('close')">
        {{ cancelLabel }}
      </button>
      <button type="button" :class="confirmButtonClass" :disabled="confirmDisabled" @click="emit('confirm')">
        {{ confirmLabel }}
      </button>
    </div>
  </BaseModal>
</template>
