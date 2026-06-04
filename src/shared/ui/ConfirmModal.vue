<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

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
  confirmVariant: 'primary',
  confirmDisabled: false,
  cancelDisabled: false,
  closeOnBackdrop: true,
  closeOnEsc: true,
  size: 'md',
  overlayClass: 'bg-[var(--surface-overlay)]',
  panelClass: '',
  ariaLabel: '',
});

const emit = defineEmits<{
  (event: 'confirm'): void;
  (event: 'close'): void;
}>();

const { t } = useI18n();

const confirmButtonClass = computed(() => {
  const base = 'h-11 px-5 text-sm';
  if (props.confirmVariant === 'danger') {
    return `${base} ui-button-danger`;
  }
  return `${base} ui-button-primary`;
});

const cancelButtonClass = 'ui-button-ghost h-11 px-5 text-sm';

const resolvedConfirmLabel = computed(() => props.confirmLabel || t('common.confirm'));
const resolvedCancelLabel = computed(() => props.cancelLabel || t('common.cancel'));
const ariaLabel = computed(() => props.ariaLabel || props.title || t('common.confirmModal'));
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
    <h3 class="bbs-row-title text-lg">{{ title }}</h3>
    <p v-if="description" class="mt-2 text-sm leading-6 text-muted">
      {{ description }}
    </p>
    <slot />
    <div class="mt-6 flex items-center justify-end gap-2">
      <button type="button" :class="cancelButtonClass" :disabled="cancelDisabled" @click="emit('close')">
        {{ resolvedCancelLabel }}
      </button>
      <button type="button" :class="confirmButtonClass" :disabled="confirmDisabled" @click="emit('confirm')">
        {{ resolvedConfirmLabel }}
      </button>
    </div>
  </BaseModal>
</template>
