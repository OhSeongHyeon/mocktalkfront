<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

import { useAuthStore } from '../stores/auth';
import PageContainer from '../shared/ui/PageContainer.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const { t } = useI18n();
const authStore = useAuthStore();
const { isAdmin, isManagerOrAdmin } = storeToRefs(authStore);

const adminTools = computed(() => {
  const base = [
    {
      title: t('admin.backoffice.tools.articleImports.title'),
      description: t('admin.backoffice.tools.articleImports.description'),
      path: '/admin/article-imports',
      tone: 'emerald',
    },
    {
      title: t('admin.backoffice.tools.contentMarket.title'),
      description: t('admin.backoffice.tools.contentMarket.description'),
      path: '/admin/content-market',
      tone: 'sky',
    },
    {
      title: t('admin.backoffice.tools.newsBot.title'),
      description: t('admin.backoffice.tools.newsBot.description'),
      path: '/admin/news-bot',
      tone: 'violet',
    },
  ];

  if (!isAdmin.value) {
    return base;
  }

  return [
    ...base,
    {
      title: t('admin.backoffice.tools.users.title'),
      description: t('admin.backoffice.tools.users.description'),
      path: '/admin/users',
      tone: 'neutral',
    },
    {
      title: t('admin.backoffice.tools.boards.title'),
      description: t('admin.backoffice.tools.boards.description'),
      path: '/admin/boards',
      tone: 'amber',
    },
    {
      title: t('admin.backoffice.tools.reports.title'),
      description: t('admin.backoffice.tools.reports.description'),
      path: '/admin/reports',
      tone: 'rose',
    },
    {
      title: t('admin.backoffice.tools.sanctions.title'),
      description: t('admin.backoffice.tools.sanctions.description'),
      path: '/admin/sanctions',
      tone: 'violet',
    },
    {
      title: t('admin.backoffice.tools.auditLogs.title'),
      description: t('admin.backoffice.tools.auditLogs.description'),
      path: '/admin/audit-logs',
      tone: 'sky',
    },
  ];
});

const resolveCardClass = (tone: string) => {
  if (tone === 'emerald') {
    return 'border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20';
  }
  if (tone === 'amber') {
    return 'border-amber-200/70 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20';
  }
  if (tone === 'rose') {
    return 'border-rose-200/70 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/20';
  }
  if (tone === 'violet') {
    return 'border-violet-200/70 bg-violet-50/70 dark:border-violet-900/60 dark:bg-violet-950/20';
  }
  if (tone === 'sky') {
    return 'border-sky-200/70 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/20';
  }
  if (tone === 'neutral') {
    return 'border-line bg-surface-soft';
  }
  return 'border-line bg-surface';
};
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <div>
        <section class="ui-panel p-6 sm:p-8">
          <p class="text-xs font-semibold tracking-[0.28em] text-red-400 uppercase dark:text-red-300">{{ t('admin.backoffice.eyebrow') }}</p>
          <div class="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 class="text-3xl font-semibold text-ink">{{ t('admin.backoffice.title') }}</h1>
              <p class="mt-2 text-sm text-muted">
                {{ t('admin.backoffice.description') }}
              </p>
            </div>
            <RouterLink
              to="/"
              class="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-line hover:bg-surface-soft"
            >
              {{ t('admin.backoffice.goHome') }}
            </RouterLink>
          </div>
        </section>

        <section class="mt-6">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-ink">{{ t('admin.backoffice.toolsTitle') }}</h2>
              <p class="mt-1 text-sm text-muted">
                {{ isAdmin ? t('admin.backoffice.toolsAdminHint') : t('admin.backoffice.toolsManagerHint') }}
              </p>
            </div>
            <span
              v-if="isManagerOrAdmin"
              class="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted dark:text-subtle"
            >
              {{ isAdmin ? 'ADMIN' : 'MANAGER' }}
            </span>
          </div>

          <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <RouterLink
              v-for="tool in adminTools"
              :key="tool.path"
              :to="tool.path"
              class="group ui-admin-tool border"
              :class="resolveCardClass(tool.tone)"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="text-base font-semibold text-ink">{{ tool.title }}</h3>
                  <p class="mt-2 text-sm leading-6 text-muted">{{ tool.description }}</p>
                </div>
                <span
                  class="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-surface-1 text-lg font-semibold text-ink"
                  style="border-radius: var(--radius-md)"
                >
                  →
                </span>
              </div>
            </RouterLink>
          </div>
        </section>
      </div>
    </PageContainer>
  </AppShell>
</template>
