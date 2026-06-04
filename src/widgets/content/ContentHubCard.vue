<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

const props = defineProps<{
  title: string;
  description: string;
  badge?: string;
  to?: string;
}>();

const { t } = useI18n();

const actionLabel = computed(() => (props.to ? t('content.card.viewNow') : t('content.card.comingSoon')));
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to"
    class="group ui-feature-tile"
    :class="to ? 'ui-feature-tile--interactive' : 'ui-feature-tile--static'"
  >
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-xl font-semibold text-ink">{{ title }}</h2>
        <span
          v-if="badge"
          class="dark:border-line/80 rounded-full border border-line bg-surface/80 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-muted uppercase dark:text-subtle"
        >
          {{ badge }}
        </span>
      </div>
      <p class="text-sm leading-6 text-muted">{{ description }}</p>
    </div>

    <div class="mt-8 flex items-center justify-between text-sm font-semibold">
      <span class="text-muted">{{ actionLabel }}</span>
      <span class="text-ink transition group-hover:translate-x-1">{{ to ? '→' : '·' }}</span>
    </div>
  </component>
</template>
