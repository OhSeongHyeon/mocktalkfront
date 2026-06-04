<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { AppLocale } from '../shared/i18n';
import { applyTheme, getThemeState, subscribeThemeChange } from '../shared/lib/theme';
import type { ResolvedTheme, ThemeMode } from '../shared/lib/theme';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import SectionHeader from '../shared/ui/SectionHeader.vue';
import { useLayoutStore } from '../stores/layout';
import { useLocaleStore } from '../stores/locale';
import type { ContentWidthPreset, SideMenuDisplayMode, TopMenuPositionMode } from '../stores/layout';
import AppShell from '../widgets/layout/AppShell.vue';

type LayoutOption = {
  value: ContentWidthPreset;
  label: string;
  description: string;
};

type SideMenuOption = {
  value: SideMenuDisplayMode;
  label: string;
  description: string;
};

type ThemeOption = {
  value: ThemeMode;
  label: string;
  description: string;
};

type TopMenuPositionOption = {
  value: TopMenuPositionMode;
  label: string;
  description: string;
};

const { t } = useI18n();

const themeOptions = computed<ThemeOption[]>(() => [
  {
    value: 'system',
    label: t('settings.theme.system.label'),
    description: t('settings.theme.system.description'),
  },
  {
    value: 'light',
    label: t('settings.theme.light.label'),
    description: t('settings.theme.light.description'),
  },
  {
    value: 'dark',
    label: t('settings.theme.dark.label'),
    description: t('settings.theme.dark.description'),
  },
]);

const layoutOptions = computed<LayoutOption[]>(() => [
  {
    value: 'default',
    label: t('settings.layout.default.label'),
    description: t('settings.layout.default.description'),
  },
  {
    value: 'comfortable',
    label: t('settings.layout.comfortable.label'),
    description: t('settings.layout.comfortable.description'),
  },
  {
    value: 'wide',
    label: t('settings.layout.wide.label'),
    description: t('settings.layout.wide.description'),
  },
  {
    value: 'full',
    label: t('settings.layout.full.label'),
    description: t('settings.layout.full.description'),
  },
]);

const sideMenuOptions = computed<SideMenuOption[]>(() => [
  {
    value: 'collapse',
    label: t('settings.sideMenu.collapse.label'),
    description: t('settings.sideMenu.collapse.description'),
  },
  {
    value: 'hidden',
    label: t('settings.sideMenu.hidden.label'),
    description: t('settings.sideMenu.hidden.description'),
  },
]);

const topMenuPositionOptions = computed<TopMenuPositionOption[]>(() => [
  {
    value: 'fixed',
    label: t('settings.topMenuPosition.fixed.label'),
    description: t('settings.topMenuPosition.fixed.description'),
  },
  {
    value: 'static',
    label: t('settings.topMenuPosition.static.label'),
    description: t('settings.topMenuPosition.static.description'),
  },
]);
const layoutStore = useLayoutStore();
const localeStore = useLocaleStore();
const { contentWidthPreset, sideMenuDisplayMode, topMenuPositionMode } = storeToRefs(layoutStore);
const { locale } = storeToRefs(localeStore);
const { setContentWidthPreset, setSideMenuDisplayMode, setTopMenuPositionMode, setTopMenuVisibilityMode } = layoutStore;
const { setLocale } = localeStore;

const languageOptions = computed(() => [
  {
    value: 'ko' as AppLocale,
    label: t('settings.language.ko'),
    description: t('settings.language.koDescription'),
  },
  {
    value: 'en' as AppLocale,
    label: t('settings.language.en'),
    description: t('settings.language.enDescription'),
  },
]);

const selectedLanguageOption = computed(() => languageOptions.value.find((option) => option.value === locale.value) ?? languageOptions.value[0]!);

const handleSelectLocale = (next: AppLocale) => {
  setLocale(next);
};
const selectedThemeMode = ref<ThemeMode>(getThemeState().mode);
const resolvedTheme = ref<ResolvedTheme>(getThemeState().resolvedTheme);
let stopThemeChangeSubscription: (() => void) | null = null;

const selectedLayoutOption = computed<LayoutOption>(
  () => layoutOptions.value.find((option) => option.value === contentWidthPreset.value) ?? layoutOptions.value[0]!,
);
const selectedSideMenuOption = computed<SideMenuOption>(
  () => sideMenuOptions.value.find((option) => option.value === sideMenuDisplayMode.value) ?? sideMenuOptions.value[0]!,
);
const selectedTopMenuPositionOption = computed<TopMenuPositionOption>(
  () => topMenuPositionOptions.value.find((option) => option.value === topMenuPositionMode.value) ?? topMenuPositionOptions.value[0]!,
);
const selectedThemeOption = computed<ThemeOption>(
  () => themeOptions.value.find((option) => option.value === selectedThemeMode.value) ?? themeOptions.value[0]!,
);
const resolvedThemeLabel = computed(() => (resolvedTheme.value === 'dark' ? t('settings.theme.resolvedDark') : t('settings.theme.resolvedLight')));

const handleSelectPreset = (preset: ContentWidthPreset) => {
  setContentWidthPreset(preset);
};

const handleSelectSideMenuMode = (mode: SideMenuDisplayMode) => {
  setSideMenuDisplayMode(mode);
};

const handleSelectTopMenuPositionMode = (mode: TopMenuPositionMode) => {
  setTopMenuPositionMode(mode);
  setTopMenuVisibilityMode('always');
};

const handleSelectThemeMode = (mode: ThemeMode) => {
  applyTheme(mode);
};

onMounted(() => {
  const syncThemeState = () => {
    const themeState = getThemeState();
    selectedThemeMode.value = themeState.mode;
    resolvedTheme.value = themeState.resolvedTheme;
  };

  syncThemeState();
  stopThemeChangeSubscription = subscribeThemeChange((themeState) => {
    selectedThemeMode.value = themeState.mode;
    resolvedTheme.value = themeState.resolvedTheme;
  });
});

onBeforeUnmount(() => {
  stopThemeChangeSubscription?.();
  stopThemeChangeSubscription = null;
});
</script>

<template>
  <AppShell>
    <PageContainer width="auto">
      <div class="space-y-6">
        <PageHeader :eyebrow="t('settings.page.eyebrow')" :title="t('settings.page.title')" :description="t('settings.page.description')" />

        <section class="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.9fr)]">
          <div class="space-y-4">
            <div class="ui-panel px-5 py-5 sm:px-6">
              <SectionHeader :title="t('settings.language.title')" :description="t('settings.language.description')" />

              <div class="mt-5 grid gap-3">
                <button
                  v-for="option in languageOptions"
                  :key="option.value"
                  type="button"
                  class="ui-option-tile"
                  :class="locale === option.value ? 'ui-option-tile-active' : ''"
                  :aria-pressed="locale === option.value"
                  @click="handleSelectLocale(option.value)"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="space-y-1">
                      <div class="text-base font-semibold text-ink">{{ option.label }}</div>
                      <p class="text-sm text-muted">
                        {{ option.description }}
                      </p>
                    </div>
                    <span
                      class="rounded-full px-3 py-1 text-xs font-semibold"
                      :class="
                        locale === option.value ? 'bg-emerald-600 text-white dark:bg-emerald-500' : 'bg-surface-soft text-muted dark:text-subtle'
                      "
                    >
                      {{ locale === option.value ? t('common.selected') : t('common.selectable') }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div class="ui-panel px-5 py-5 sm:px-6">
              <SectionHeader :title="t('settings.theme.title')" :description="t('settings.theme.description')" />

              <div class="mt-5 grid gap-3">
                <button
                  v-for="option in themeOptions"
                  :key="option.value"
                  type="button"
                  class="ui-option-tile"
                  :class="selectedThemeMode === option.value ? 'ui-option-tile-active' : ''"
                  :aria-pressed="selectedThemeMode === option.value"
                  @click="handleSelectThemeMode(option.value)"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="space-y-1">
                      <div class="text-base font-semibold text-ink">{{ option.label }}</div>
                      <p class="text-sm text-muted">
                        {{ option.description }}
                      </p>
                    </div>
                    <span
                      class="rounded-full px-3 py-1 text-xs font-semibold"
                      :class="
                        selectedThemeMode === option.value
                          ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                          : 'bg-surface-soft text-muted dark:text-subtle'
                      "
                    >
                      {{ selectedThemeMode === option.value ? t('common.selected') : t('common.selectable') }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div class="ui-panel px-5 py-5 sm:px-6">
              <SectionHeader :title="t('settings.layout.title')" :description="t('settings.layout.description')" />

              <div class="mt-5 grid gap-3">
                <button
                  v-for="option in layoutOptions"
                  :key="option.value"
                  type="button"
                  class="ui-option-tile"
                  :class="contentWidthPreset === option.value ? 'ui-option-tile-active' : ''"
                  :aria-pressed="contentWidthPreset === option.value"
                  @click="handleSelectPreset(option.value)"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="space-y-1">
                      <div class="text-base font-semibold text-ink">{{ option.label }}</div>
                      <p class="text-sm text-muted">
                        {{ option.description }}
                      </p>
                    </div>
                    <span
                      class="rounded-full px-3 py-1 text-xs font-semibold"
                      :class="
                        contentWidthPreset === option.value
                          ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                          : 'bg-surface-soft text-muted dark:text-subtle'
                      "
                    >
                      {{ contentWidthPreset === option.value ? t('common.selected') : t('common.selectable') }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div class="ui-panel px-5 py-5 sm:px-6">
              <SectionHeader :title="t('settings.topMenuPosition.title')" :description="t('settings.topMenuPosition.description')" />

              <div class="mt-5 grid gap-3">
                <button
                  v-for="option in topMenuPositionOptions"
                  :key="option.value"
                  type="button"
                  class="ui-option-tile"
                  :class="topMenuPositionMode === option.value ? 'ui-option-tile-active' : ''"
                  :aria-pressed="topMenuPositionMode === option.value"
                  @click="handleSelectTopMenuPositionMode(option.value)"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="space-y-1">
                      <div class="text-base font-semibold text-ink">{{ option.label }}</div>
                      <p class="text-sm text-muted">
                        {{ option.description }}
                      </p>
                    </div>
                    <span
                      class="rounded-full px-3 py-1 text-xs font-semibold"
                      :class="
                        topMenuPositionMode === option.value
                          ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                          : 'bg-surface-soft text-muted dark:text-subtle'
                      "
                    >
                      {{ topMenuPositionMode === option.value ? t('common.selected') : t('common.selectable') }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div class="ui-panel px-5 py-5 sm:px-6">
              <SectionHeader :title="t('settings.sideMenu.title')" :description="t('settings.sideMenu.description')" />

              <div class="mt-5 grid gap-3">
                <button
                  v-for="option in sideMenuOptions"
                  :key="option.value"
                  type="button"
                  class="ui-option-tile"
                  :class="sideMenuDisplayMode === option.value ? 'ui-option-tile-active' : ''"
                  :aria-pressed="sideMenuDisplayMode === option.value"
                  @click="handleSelectSideMenuMode(option.value)"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="space-y-1">
                      <div class="text-base font-semibold text-ink">{{ option.label }}</div>
                      <p class="text-sm text-muted">
                        {{ option.description }}
                      </p>
                    </div>
                    <span
                      class="rounded-full px-3 py-1 text-xs font-semibold"
                      :class="
                        sideMenuDisplayMode === option.value
                          ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                          : 'bg-surface-soft text-muted dark:text-subtle'
                      "
                    >
                      {{ sideMenuDisplayMode === option.value ? t('common.selected') : t('common.selectable') }}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <aside class="ui-panel px-5 py-5 sm:px-6">
            <div class="space-y-4">
              <SectionHeader
                :eyebrow="t('settings.summary.currentSettings')"
                :title="selectedLayoutOption.label"
                :description="selectedLayoutOption.description"
              />

              <div class="ui-card">
                <p class="text-sm font-semibold text-ink">{{ t('settings.language.current') }}</p>
                <p class="mt-2 text-sm text-muted">{{ selectedLanguageOption.label }}</p>
                <p class="mt-1 text-sm text-muted">{{ selectedLanguageOption.description }}</p>
              </div>

              <div class="ui-card">
                <p class="text-sm font-semibold text-ink">{{ t('settings.theme.summaryTitle') }}</p>
                <p class="mt-2 text-sm text-muted">{{ selectedThemeOption.label }}</p>
                <p class="mt-1 text-sm text-muted">{{ selectedThemeOption.description }}</p>
                <p class="mt-2 text-xs font-semibold text-subtle">{{ t('settings.theme.currentApplied', { theme: resolvedThemeLabel }) }}</p>
              </div>

              <div class="ui-card">
                <p class="text-sm font-semibold text-ink">{{ t('settings.sideMenu.summaryTitle') }}</p>
                <p class="mt-2 text-sm text-muted">{{ selectedSideMenuOption.label }}</p>
                <p class="mt-1 text-sm text-muted">{{ selectedSideMenuOption.description }}</p>
              </div>

              <div class="ui-card">
                <p class="text-sm font-semibold text-ink">{{ t('settings.topMenuPosition.summaryTitle') }}</p>
                <p class="mt-2 text-sm text-muted">{{ selectedTopMenuPositionOption.label }}</p>
                <p class="mt-1 text-sm text-muted">{{ selectedTopMenuPositionOption.description }}</p>
              </div>

              <div class="ui-card">
                <p class="text-sm font-semibold text-ink">{{ t('settings.summary.topMenuVisibility') }}</p>
                <p class="mt-2 text-sm text-muted">{{ t('settings.summary.alwaysVisible') }}</p>
                <p class="mt-1 text-sm text-muted">{{ t('settings.summary.alwaysVisibleDescription') }}</p>
              </div>

              <div class="ui-card">
                <p class="text-sm font-semibold text-ink">{{ t('settings.summary.scope') }}</p>
                <ul class="mt-3 space-y-2 text-sm text-muted">
                  <li>{{ t('settings.summary.scopeTheme') }}</li>
                  <li>{{ t('settings.summary.scopeLayout') }}</li>
                  <li>{{ t('settings.summary.scopeTopMenu') }}</li>
                  <li>{{ t('settings.summary.scopeSideMenu') }}</li>
                  <li>{{ t('settings.summary.scopePersonal') }}</li>
                  <li>{{ t('settings.summary.scopeMobile') }}</li>
                </ul>
              </div>

              <div class="ui-card border-dashed">
                <p class="text-sm font-semibold text-ink">{{ t('settings.summary.upcoming') }}</p>
                <p class="mt-2 text-sm text-muted">
                  {{ t('settings.summary.upcomingDescription') }}
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </PageContainer>
  </AppShell>
</template>
