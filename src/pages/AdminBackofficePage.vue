<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { useAuthStore } from '../stores/auth';
import PageContainer from '../shared/ui/PageContainer.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const authStore = useAuthStore();
const { isAdmin, isManagerOrAdmin } = storeToRefs(authStore);

const adminTools = computed(() => {
  const base = [
    {
      title: '게시글 임포트',
      description: 'manifest.yml과 Markdown 묶음을 검토하고 일괄 생성합니다.',
      path: '/admin/article-imports',
      tone: 'emerald',
    },
    {
      title: '콘텐츠 시세 운영',
      description: '환율/금 시세를 즉시 최신화하고 CSV/XLSX 파일로 과거 데이터를 반영합니다.',
      path: '/admin/content-market',
      tone: 'sky',
    },
    {
      title: '뉴스봇 운영',
      description: '외부 공개 API/RSS를 주기적으로 수집해 게시판 새소식을 자동 발행합니다.',
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
      title: '사용자 관리',
      description: '회원 상태와 시스템 권한을 관리합니다.',
      path: '/admin/users',
      tone: 'neutral',
    },
    {
      title: '게시판 관리',
      description: '게시판 생성 상태와 공개 범위를 점검합니다.',
      path: '/admin/boards',
      tone: 'amber',
    },
    {
      title: '신고 관리',
      description: '처리 대기 신고를 검토하고 상태를 갱신합니다.',
      path: '/admin/reports',
      tone: 'rose',
    },
    {
      title: '제재 관리',
      description: '제재 등록과 해제를 수행합니다.',
      path: '/admin/sanctions',
      tone: 'violet',
    },
    {
      title: '운영 로그',
      description: '백오피스 작업 이력을 추적합니다.',
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
          <p class="text-xs font-semibold tracking-[0.28em] text-red-400 uppercase dark:text-red-300">Backoffice</p>
          <div class="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 class="text-3xl font-semibold text-ink">운영 작업 공간</h1>
              <p class="mt-2 text-sm text-muted">
                서비스 탐색 메뉴와 분리된 관리자 전용 진입 화면입니다. 작업 성격에 맞는 도구만 선택해서 이동합니다.
              </p>
            </div>
            <RouterLink
              to="/"
              class="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-line hover:bg-surface-soft"
            >
              서비스 홈으로 이동
            </RouterLink>
          </div>
        </section>

        <section class="mt-6">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-ink">관리 도구</h2>
              <p class="mt-1 text-sm text-muted">
                {{ isAdmin ? '시스템 관리자 권한으로 모든 백오피스 도구를 사용할 수 있습니다.' : '운영 권한 범위 내 도구만 노출합니다.' }}
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
