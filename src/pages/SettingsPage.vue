<script setup lang="ts">
import { computed } from 'vue';

import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import SectionHeader from '../shared/ui/SectionHeader.vue';
import { contentWidthPreset, setContentWidthPreset } from '../stores/layout';
import type { ContentWidthPreset } from '../stores/layout';
import AppShell from '../widgets/layout/AppShell.vue';

type LayoutOption = {
  value: ContentWidthPreset;
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

const selectedOption = computed<LayoutOption>(() => layoutOptions.find((option) => option.value === contentWidthPreset.value) ?? layoutOptions[0]!);

const handleSelectPreset = (preset: ContentWidthPreset) => {
  setContentWidthPreset(preset);
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

          <aside class="ui-panel px-5 py-5 sm:px-6">
            <div class="space-y-4">
              <SectionHeader eyebrow="현재 설정" :title="selectedOption.label" :description="selectedOption.description" />

              <div class="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">적용 범위</p>
                <ul class="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                  <li>홈, 커뮤니티, 게시글 상세와 작성 화면 같은 공통 레이아웃 페이지</li>
                  <li>브라우저에만 저장되는 개인 설정</li>
                  <li>모바일 화면에서는 전체 폭 사용</li>
                </ul>
              </div>

              <div class="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">예정 항목</p>
                <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  이후에는 사이드메뉴 동작, 카드 밀도 같은 화면 관련 설정도 이 화면에 순차적으로 추가할 수 있습니다.
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </PageContainer>
  </AppShell>
</template>
