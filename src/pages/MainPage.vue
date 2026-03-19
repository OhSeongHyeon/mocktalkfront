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
      <div class="space-y-4">
        <section class="ui-panel animate-rise overflow-hidden">
          <div class="border-b border-slate-200 px-4 py-4 sm:px-5 dark:border-slate-800">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="ui-badge ui-badge-accent">커뮤니티 포털</span>
                  <span class="ui-badge ui-badge-muted">리스트 중심 홈</span>
                  <span v-if="isAuthenticated" class="ui-badge ui-badge-success">로그인 중</span>
                </div>
                <div>
                  <p class="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">MockTalk Home</p>
                  <h1 class="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">오늘의 커뮤니티 흐름</h1>
                  <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    구독 게시판, 최신 글, 공개 게시판을 같은 밀도로 연결해 바로 탐색할 수 있게 정리했습니다.
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <RouterLink v-if="isAuthenticated" to="/boards/subscribes" class="ui-button-primary h-9 px-3.5 text-xs">구독 목록</RouterLink>
                <RouterLink to="/boards" class="ui-button-ghost h-9 px-3.5 text-xs">전체 게시판</RouterLink>
                <RouterLink to="/search" class="ui-button-ghost h-9 px-3.5 text-xs">통합 검색</RouterLink>
                <RouterLink to="/mypage" class="ui-button-ghost h-9 px-3.5 text-xs">내 활동</RouterLink>
              </div>
            </div>
          </div>

          <div class="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div class="border-b border-slate-200 px-4 py-4 sm:px-5 lg:border-r lg:border-b-0 dark:border-slate-800">
              <div class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <h2 class="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">바로가기</h2>
                  <span class="text-xs text-slate-400 dark:text-slate-500">빠른 이동</span>
                </div>
                <div
                  class="grid gap-px overflow-hidden rounded-[0.65rem] border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800"
                >
                  <RouterLink
                    to="/boards"
                    class="bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-950"
                  >
                    공개 커뮤니티 둘러보기
                  </RouterLink>
                  <RouterLink
                    to="/search"
                    class="bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-950"
                  >
                    게시글과 댓글 검색
                  </RouterLink>
                  <RouterLink
                    to="/contents"
                    class="bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-950"
                  >
                    콘텐츠 허브 이동
                  </RouterLink>
                  <RouterLink
                    to="/bookmarks"
                    class="bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-950"
                  >
                    북마크와 보관함 확인
                  </RouterLink>
                </div>
              </div>
            </div>

            <div class="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-1 dark:bg-slate-800">
              <div class="bg-white px-4 py-4 sm:px-5 dark:bg-slate-900">
                <p class="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">탐색 방식</p>
                <p class="mt-1 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">게시판형 레이아웃</p>
                <p class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  큰 카드보다 제목, 작성자, 날짜, 반응 정보를 짧게 배치해 스캔 속도를 높였습니다.
                </p>
              </div>
              <div class="bg-white px-4 py-4 sm:px-5 dark:bg-slate-900">
                <p class="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">활동 동선</p>
                <p class="mt-1 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">상단 검색 + 좌측 채널</p>
                <p class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  상단 검색과 좌측 메뉴를 기준으로 게시판과 관리 화면을 같은 위계로 정리했습니다.
                </p>
              </div>
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
