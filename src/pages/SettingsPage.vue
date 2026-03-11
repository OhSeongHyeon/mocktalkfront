<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import SectionHeader from '../shared/ui/SectionHeader.vue';
import { useLayoutStore } from '../stores/layout';
import type { ContentWidthPreset, SideMenuDisplayMode } from '../stores/layout';
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

const layoutOptions: LayoutOption[] = [
  {
    value: 'default',
    label: '기본',
    description: '기본 폭으로 콘텐츠 영역을 표시합니다.',
  },
  {
    value: 'wide',
    label: '넓게',
    description: '목록형 화면과 본문형 화면을 기본보다 더 넓게 표시합니다.',
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
const layoutStore = useLayoutStore();
const { contentWidthPreset, sideMenuDisplayMode } = storeToRefs(layoutStore);
const { setContentWidthPreset, setSideMenuDisplayMode } = layoutStore;

const selectedOption = computed<LayoutOption>(() => layoutOptions.find((option) => option.value === contentWidthPreset.value) ?? layoutOptions[0]!);
const selectedSideMenuOption = computed<SideMenuOption>(
  () => sideMenuOptions.find((option) => option.value === sideMenuDisplayMode.value) ?? sideMenuOptions[0]!,
);

const handleSelectPreset = (preset: ContentWidthPreset) => {
  setContentWidthPreset(preset);
};

const handleSelectSideMenuMode = (mode: SideMenuDisplayMode) => {
  setSideMenuDisplayMode(mode);
};
</script>

<template>
  <AppShell>
    <PageContainer width="auto">
      <div class="space-y-6">
        <PageHeader
          eyebrow="설정"
          title="사이트 레이아웃"
          description="데스크톱 화면에서 공통 레이아웃을 사용하는 메인 콘텐츠 영역의 폭을 조절합니다. 모바일에서는 화면 전체 폭을 그대로 사용합니다."
        />

        <section class="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.9fr)]">
          <div class="space-y-4">
            <div class="ui-panel px-5 py-5 sm:px-6">
              <SectionHeader title="사이트 레이아웃 사이즈" description="공통 레이아웃을 사용하는 화면 전반에 바로 반영됩니다." />

              <div class="mt-5 grid gap-3">
                <button
                  v-for="option in layoutOptions"
                  :key="option.value"
                  type="button"
                  class="rounded-3xl border px-5 py-4 text-left transition"
                  :class="
                    contentWidthPreset === option.value
                      ? 'border-emerald-200 bg-emerald-50 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30'
                      : 'border-slate-200/80 bg-white/70 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700 dark:hover:bg-slate-900'
                  "
                  :aria-pressed="contentWidthPreset === option.value"
                  @click="handleSelectPreset(option.value)"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="space-y-1">
                      <div class="text-base font-semibold text-slate-900 dark:text-slate-100">{{ option.label }}</div>
                      <p class="text-sm text-slate-500 dark:text-slate-400">
                        {{ option.description }}
                      </p>
                    </div>
                    <span
                      class="rounded-full px-3 py-1 text-xs font-semibold"
                      :class="
                        contentWidthPreset === option.value
                          ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400'
                      "
                    >
                      {{ contentWidthPreset === option.value ? '선택됨' : '선택 가능' }}
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
                  class="rounded-3xl border px-5 py-4 text-left transition"
                  :class="
                    sideMenuDisplayMode === option.value
                      ? 'border-emerald-200 bg-emerald-50 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30'
                      : 'border-slate-200/80 bg-white/70 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700 dark:hover:bg-slate-900'
                  "
                  :aria-pressed="sideMenuDisplayMode === option.value"
                  @click="handleSelectSideMenuMode(option.value)"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="space-y-1">
                      <div class="text-base font-semibold text-slate-900 dark:text-slate-100">{{ option.label }}</div>
                      <p class="text-sm text-slate-500 dark:text-slate-400">
                        {{ option.description }}
                      </p>
                    </div>
                    <span
                      class="rounded-full px-3 py-1 text-xs font-semibold"
                      :class="
                        sideMenuDisplayMode === option.value
                          ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400'
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
              <SectionHeader eyebrow="현재 레이아웃" :title="selectedOption.label" :description="selectedOption.description" />

              <div class="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">사이드메뉴 동작</p>
                <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ selectedSideMenuOption.label }}</p>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ selectedSideMenuOption.description }}</p>
              </div>

              <div class="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">적용 범위</p>
                <ul class="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                  <li>홈, 커뮤니티, 게시글 상세와 작성 화면 같은 공통 레이아웃 페이지</li>
                  <li>데스크톱 사이드메뉴 펼치기 방식</li>
                  <li>브라우저에만 저장되는 개인 설정</li>
                  <li>모바일 화면에서는 전체 폭 사용</li>
                </ul>
              </div>

              <div class="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">예정 항목</p>
                <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
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
