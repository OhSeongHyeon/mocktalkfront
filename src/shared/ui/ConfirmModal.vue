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
  const base = 'h-11 px-5 text-sm';
  if (props.confirmVariant === 'danger') {
    return `${base} ui-button-danger`;
  }
  return `${base} ui-button-primary`;
});

const cancelButtonClass = 'ui-button-ghost h-11 px-5 text-sm';

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
    <h3 class="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">{{ title }}</h3>
    <p v-if="description" class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
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
