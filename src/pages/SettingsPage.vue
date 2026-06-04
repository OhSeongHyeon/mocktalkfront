<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { applyTheme, getThemeState, subscribeThemeChange } from '../shared/lib/theme';
import type { ResolvedTheme, ThemeMode } from '../shared/lib/theme';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import SectionHeader from '../shared/ui/SectionHeader.vue';
import { useLayoutStore } from '../stores/layout';
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

const themeOptions: ThemeOption[] = [
  {
    value: 'system',
    label: '시스템',
    description: '운영체제 또는 브라우저의 컬러 스킴 설정을 그대로 따라갑니다.',
  },
  {
    value: 'light',
    label: '화이트',
    description: '항상 밝은 테마로 고정합니다.',
  },
  {
    value: 'dark',
    label: '다크',
    description: '항상 어두운 테마로 고정합니다.',
  },
];

const layoutOptions: LayoutOption[] = [
  {
    value: 'default',
    label: '좁게',
    description: '데스크톱에서 1152px 폭으로 콘텐츠 영역을 집중감 있게 표시합니다.',
  },
  {
    value: 'comfortable',
    label: '중간',
    description: '기본보다 조금 더 넓은 1280px 폭으로 콘텐츠 영역을 표시합니다.',
  },
  {
    value: 'wide',
    label: '넓게',
    description: '신규 기본값입니다. 데스크톱에서 1536px 폭으로 콘텐츠 영역을 넉넉하게 표시합니다.',
  },
  {
    value: 'full',
    label: '최대 넓게',
    description: '데스크톱에서 메인 콘텐츠 폭 제한을 거의 두지 않습니다.',
  },
];

const sideMenuOptions: SideMenuOption[] = [
  {
    value: 'collapse',
    label: '축소-펼치기',
    description: '사이드메뉴를 아이콘만 남기는 축소 상태와 전체 펼침 상태로 전환합니다.',
  },
  {
    value: 'hidden',
    label: '숨기기-펼치기',
    description: '사이드메뉴를 완전히 숨겼다가 필요할 때 전체 메뉴를 다시 펼칩니다.',
  },
];

const topMenuPositionOptions: TopMenuPositionOption[] = [
  {
    value: 'fixed',
    label: '화면 상단 고정',
    description: '상단메뉴바를 화면 상단에 항상 보이도록 고정하고, 본문만 그 아래에서 스크롤합니다.',
  },
  {
    value: 'static',
    label: '본문과 함께 스크롤',
    description: '상단메뉴바를 본문 흐름 안에 두어 페이지를 내리면 함께 위로 사라지게 합니다.',
  },
];

const layoutStore = useLayoutStore();
const { contentWidthPreset, sideMenuDisplayMode, topMenuPositionMode } = storeToRefs(layoutStore);
const { setContentWidthPreset, setSideMenuDisplayMode, setTopMenuPositionMode, setTopMenuVisibilityMode } = layoutStore;
const selectedThemeMode = ref<ThemeMode>(getThemeState().mode);
const resolvedTheme = ref<ResolvedTheme>(getThemeState().resolvedTheme);
let stopThemeChangeSubscription: (() => void) | null = null;

const selectedLayoutOption = computed<LayoutOption>(
  () => layoutOptions.find((option) => option.value === contentWidthPreset.value) ?? layoutOptions[0]!,
);
const selectedSideMenuOption = computed<SideMenuOption>(
  () => sideMenuOptions.find((option) => option.value === sideMenuDisplayMode.value) ?? sideMenuOptions[0]!,
);
const selectedTopMenuPositionOption = computed<TopMenuPositionOption>(
  () => topMenuPositionOptions.find((option) => option.value === topMenuPositionMode.value) ?? topMenuPositionOptions[0]!,
);
const selectedThemeOption = computed<ThemeOption>(() => themeOptions.find((option) => option.value === selectedThemeMode.value) ?? themeOptions[0]!);
const resolvedThemeLabel = computed(() => (resolvedTheme.value === 'dark' ? '다크' : '화이트'));

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
        <PageHeader
          eyebrow="설정"
          title="사이트 레이아웃과 테마"
          description="테마 모드와 데스크톱 공통 레이아웃 동작을 브라우저 단위 개인 설정으로 저장합니다. 모바일에서는 화면 전체 폭을 그대로 사용합니다."
        />

        <section class="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.9fr)]">
          <div class="space-y-4">
            <div class="ui-panel px-5 py-5 sm:px-6">
              <SectionHeader title="테마 모드" description="시스템 설정을 따르거나 화이트, 다크 테마로 직접 고정할 수 있습니다." />

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
                      {{ selectedThemeMode === option.value ? '선택됨' : '선택 가능' }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div class="ui-panel px-5 py-5 sm:px-6">
              <SectionHeader title="사이트 레이아웃 사이즈" description="공통 레이아웃을 사용하는 화면 전반에 바로 반영됩니다." />

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
                      {{ contentWidthPreset === option.value ? '선택됨' : '선택 가능' }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div class="ui-panel px-5 py-5 sm:px-6">
              <SectionHeader
                title="상단메뉴바 위치 방식"
                description="상단메뉴바는 항상 표시로 유지하고, 화면 상단에 고정할지 본문과 함께 스크롤할지만 정합니다."
              />

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
                      {{ topMenuPositionMode === option.value ? '선택됨' : '선택 가능' }}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div class="ui-panel px-5 py-5 sm:px-6">
              <SectionHeader title="사이드메뉴 펼치기 방식" description="데스크톱에서 메뉴 버튼을 눌렀을 때 사이드메뉴가 어떻게 동작할지 정합니다." />

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
                      {{ sideMenuDisplayMode === option.value ? '선택됨' : '선택 가능' }}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <aside class="ui-panel px-5 py-5 sm:px-6">
            <div class="space-y-4">
              <SectionHeader eyebrow="현재 설정" :title="selectedLayoutOption.label" :description="selectedLayoutOption.description" />

              <div class="ui-card">
                <p class="text-sm font-semibold text-ink">테마 모드</p>
                <p class="mt-2 text-sm text-muted">{{ selectedThemeOption.label }}</p>
                <p class="mt-1 text-sm text-muted">{{ selectedThemeOption.description }}</p>
                <p class="mt-2 text-xs font-semibold text-subtle">현재 적용 테마: {{ resolvedThemeLabel }}</p>
              </div>

              <div class="ui-card">
                <p class="text-sm font-semibold text-ink">사이드메뉴 동작</p>
                <p class="mt-2 text-sm text-muted">{{ selectedSideMenuOption.label }}</p>
                <p class="mt-1 text-sm text-muted">{{ selectedSideMenuOption.description }}</p>
              </div>

              <div class="ui-card">
                <p class="text-sm font-semibold text-ink">상단메뉴바 위치</p>
                <p class="mt-2 text-sm text-muted">{{ selectedTopMenuPositionOption.label }}</p>
                <p class="mt-1 text-sm text-muted">{{ selectedTopMenuPositionOption.description }}</p>
              </div>

              <div class="ui-card">
                <p class="text-sm font-semibold text-ink">상단메뉴바 노출</p>
                <p class="mt-2 text-sm text-muted">항상 표시</p>
                <p class="mt-1 text-sm text-muted">상단메뉴바는 자동 숨김 없이 계속 표시합니다.</p>
              </div>

              <div class="ui-card">
                <p class="text-sm font-semibold text-ink">적용 범위</p>
                <ul class="mt-3 space-y-2 text-sm text-muted">
                  <li>시스템, 화이트, 다크 테마 모드</li>
                  <li>홈, 커뮤니티, 게시글 상세와 작성 화면 같은 공통 레이아웃 페이지</li>
                  <li>상단메뉴바 위치 방식과 항상 표시 동작</li>
                  <li>데스크톱 사이드메뉴 펼치기 방식</li>
                  <li>브라우저에만 저장되는 개인 설정</li>
                  <li>모바일 화면에서는 전체 폭 사용</li>
                </ul>
              </div>

              <div class="ui-card border-dashed">
                <p class="text-sm font-semibold text-ink">예정 항목</p>
                <p class="mt-2 text-sm text-muted">
                  이후에는 카드 밀도, 목록 표시 방식 같은 화면 관련 설정도 이 화면에 순차적으로 추가할 수 있습니다.
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </PageContainer>
  </AppShell>
</template>
