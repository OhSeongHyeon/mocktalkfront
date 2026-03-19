<script setup lang="ts">
import { storeToRefs } from 'pinia';
import HomeCommunitySection from '../widgets/home/HomeCommunitySection.vue';
import HomeRecentArticleSection from '../widgets/home/HomeRecentArticleSection.vue';
import HomeSubscriptionSection from '../widgets/home/HomeSubscriptionSection.vue';
import PageContainer from '../shared/ui/PageContainer.vue';
import { useAuthStore } from '../stores/auth';
import AppShell from '../widgets/layout/AppShell.vue';

const authStore = useAuthStore();
const { isAuthenticated } = storeToRefs(authStore);
</script>

<template>
  <AppShell>
    <PageContainer width="auto">
      <div class="space-y-6">
        <section class="ui-panel animate-rise overflow-hidden">
          <div class="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div class="space-y-4">
              <div class="flex flex-wrap items-center gap-2">
                <span class="ui-badge ui-badge-accent">Daily Flow</span>
                <span class="ui-badge ui-badge-muted">정보 밀도형 레이아웃</span>
                <span v-if="isAuthenticated" class="ui-badge ui-badge-success">로그인 상태</span>
              </div>

              <div class="space-y-3">
                <p class="text-[11px] font-bold tracking-[0.24em] text-slate-400 uppercase dark:text-slate-500">MockTalk Front</p>
                <h1 class="text-3xl font-black tracking-tight text-slate-900 sm:text-[2.4rem] dark:text-slate-100">
                  오늘의 커뮤니티 흐름을 빠르게 확인하세요.
                </h1>
                <p class="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  구독 커뮤니티, 공개 커뮤니티, 최신 글을 한 화면에서 이어서 확인할 수 있게 정리했습니다. 카드보다 목록과 메타 정보에 집중해 탐색
                  속도를 높였습니다.
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <RouterLink v-if="isAuthenticated" to="/boards/subscribes" class="ui-button-primary h-10 px-4 text-xs">구독 커뮤니티</RouterLink>
                <RouterLink to="/boards" class="ui-button-ghost h-10 px-4 text-xs">전체 커뮤니티</RouterLink>
                <RouterLink to="/search" class="ui-button-ghost h-10 px-4 text-xs">통합 검색</RouterLink>
                <RouterLink to="/contents" class="ui-button-ghost h-10 px-4 text-xs">콘텐츠 허브</RouterLink>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <RouterLink to="/boards" class="ui-data-panel group p-4 transition hover:border-slate-300/80 dark:hover:border-slate-700">
                <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Explore</p>
                <p
                  class="group-hover:text-brand-700 dark:group-hover:text-brand-300 mt-2 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100"
                >
                  공개 커뮤니티 둘러보기
                </p>
                <p class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  전체 게시판 목록을 빠르게 스캔하고 관심 있는 커뮤니티로 이동합니다.
                </p>
              </RouterLink>

              <RouterLink to="/search" class="ui-data-panel group p-4 transition hover:border-slate-300/80 dark:hover:border-slate-700">
                <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Search</p>
                <p
                  class="group-hover:text-brand-700 dark:group-hover:text-brand-300 mt-2 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100"
                >
                  게시글과 댓글 검색
                </p>
                <p class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  게시판, 게시글, 댓글, 사용자 키워드를 한 번에 찾아볼 수 있습니다.
                </p>
              </RouterLink>

              <RouterLink to="/mypage" class="ui-data-panel group p-4 transition hover:border-slate-300/80 dark:hover:border-slate-700">
                <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">My Flow</p>
                <p
                  class="group-hover:text-brand-700 dark:group-hover:text-brand-300 mt-2 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100"
                >
                  활동과 보관함 정리
                </p>
                <p class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  마이페이지에서 북마크, 기록, 설정을 같은 토큰 체계로 확인합니다.
                </p>
              </RouterLink>
            </div>
          </div>
        </section>

        <HomeSubscriptionSection v-if="isAuthenticated" />
        <HomeCommunitySection />
        <HomeRecentArticleSection />
      </div>
    </PageContainer>
  </AppShell>
</template>
