<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { API_BASE_URL, ApiError } from '../shared/lib/http/api';
import { applyProfileSummary } from '../shared/lib/profile';
import { login } from '../features/auth';
import { getMyProfile } from '../entities/user';
import { useAuthStore } from '../stores/auth';
import githubIcon from '../assets/icons/icon-github.svg';
import googleColorIcon from '../assets/icons/icon-google-color.svg';
import googleMonoIcon from '../assets/icons/icon-google-mono.svg';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const loginId = ref('');
const password = ref('');
const rememberMe = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');
const canSubmit = computed(() => Boolean(loginId.value.trim() && password.value) && !isSubmitting.value);

const apiBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
const googleAuthUrl = `${apiBase}/oauth2/authorization/google`;
const githubAuthUrl = `${apiBase}/oauth2/authorization/github`;

const handleForgotPassword = () => {
  errorMessage.value = '비밀번호 찾기 기능은 준비 중입니다.';
};

const resolveLoginSuccessPath = () => {
  const redirect = route.query.redirect;
  if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//') || redirect === '/login') {
    return '/';
  }
  return redirect;
};

const handleSubmit = async () => {
  errorMessage.value = '';
  const trimmedId = loginId.value.trim();

  if (!trimmedId || !password.value) {
    errorMessage.value = '아이디와 비밀번호를 입력하세요.';
    return;
  }

  isSubmitting.value = true;
  try {
    const token = await login({
      loginId: trimmedId,
      password: password.value,
      rememberMe: rememberMe.value,
    });
    authStore.setAccessToken(token.accessToken, token.expiresInSec);
    try {
      const profile = await getMyProfile();
      applyProfileSummary(profile);
    } catch {
      // 로그인 직후 프로필 조회 실패는 무시
    }
    await router.push(resolveLoginSuccessPath());
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        const message = error.message?.trim();
        errorMessage.value = message && message !== 'Unauthorized' ? message : '아이디 또는 비밀번호가 올바르지 않습니다.';
      } else {
        errorMessage.value = error.message;
      }
    } else {
      errorMessage.value = '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.';
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <header class="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div class="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <RouterLink to="/" class="flex items-center gap-3">
          <span class="bg-brand-600 hidden h-8 w-8 items-center justify-center rounded-[0.55rem] text-xs font-black text-white sm:grid">MT</span>
          <div>
            <p class="text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Community</p>
            <p class="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">MockTalk</p>
          </div>
        </RouterLink>
        <RouterLink to="/" class="ui-button-ghost h-9 px-3.5 text-xs">홈으로</RouterLink>
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-[1280px] flex-1 items-start px-4 py-6 sm:px-6 lg:px-8">
      <div class="grid w-full gap-5 lg:grid-cols-[minmax(0,1.1fr)_420px]">
        <section class="ui-panel overflow-hidden">
          <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <p class="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">로그인</p>
            <h1 class="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">커뮤니티로 돌아가기</h1>
            <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">구독 게시판, 북마크, 알림, 활동 기록을 이어서 확인할 수 있습니다.</p>
          </div>

          <div class="grid gap-px bg-slate-200 md:grid-cols-2 dark:bg-slate-800">
            <div class="bg-white px-5 py-4 dark:bg-slate-900">
              <p class="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">정책</p>
              <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <li>Access Token은 메모리 저장 정책을 따릅니다.</li>
                <li>Refresh Token은 HttpOnly Cookie만 사용합니다.</li>
                <li>회원 정보는 최소 항목만 유지합니다.</li>
              </ul>
            </div>
            <div class="bg-white px-5 py-4 dark:bg-slate-900">
              <p class="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">빠른 이동</p>
              <div class="mt-3 space-y-2">
                <RouterLink to="/join" class="ui-button-ghost h-9 w-full justify-start px-3.5 text-xs">회원가입으로 이동</RouterLink>
                <RouterLink to="/boards" class="ui-button-ghost h-9 w-full justify-start px-3.5 text-xs">게시판 둘러보기</RouterLink>
                <RouterLink to="/search" class="ui-button-ghost h-9 w-full justify-start px-3.5 text-xs">통합 검색</RouterLink>
              </div>
            </div>
          </div>
        </section>

        <section class="w-full">
          <form class="ui-panel flex flex-col gap-5 p-5" @submit.prevent="handleSubmit">
            <div class="space-y-1.5 border-b border-slate-200 pb-3 dark:border-slate-800">
              <p class="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">Sign In</p>
              <h2 class="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">계정 로그인</h2>
              <p class="text-sm leading-6 text-slate-500 dark:text-slate-400">일반 로그인과 소셜 로그인을 같은 화면에서 바로 선택할 수 있습니다.</p>
            </div>

            <div class="flex flex-col gap-2">
              <label for="login-id" class="text-sm font-semibold text-slate-700 dark:text-slate-200">로그인 아이디</label>
              <input
                id="login-id"
                v-model="loginId"
                name="loginId"
                type="text"
                autocomplete="username"
                placeholder="아이디를 입력하세요"
                class="ui-input"
                :disabled="isSubmitting"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label for="login-password" class="text-sm font-semibold text-slate-700 dark:text-slate-200">비밀번호</label>
              <input
                id="login-password"
                v-model="password"
                name="password"
                type="password"
                autocomplete="current-password"
                placeholder="비밀번호를 입력하세요"
                class="ui-input"
                :disabled="isSubmitting"
              />
            </div>

            <div class="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <label class="inline-flex items-center gap-2">
                <input v-model="rememberMe" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-red-500 dark:border-slate-700" />
                로그인 유지
              </label>
              <a
                href="#"
                class="hover:text-brand-700 dark:hover:text-brand-300 font-semibold text-slate-600 transition dark:text-slate-300"
                @click.prevent="handleForgotPassword"
              >
                비밀번호 찾기
              </a>
            </div>

            <button type="submit" class="ui-button-accent h-10 text-sm disabled:cursor-not-allowed disabled:opacity-70" :disabled="!canSubmit">
              {{ isSubmitting ? '로그인 중...' : '로그인' }}
            </button>

            <div class="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
              <div class="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
              또는
              <div class="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
            </div>

            <div class="grid gap-2">
              <a
                :href="googleAuthUrl"
                class="flex h-10 items-center justify-center gap-2 rounded-[0.55rem] border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-950"
              >
                <span
                  class="grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  aria-hidden="true"
                >
                  <img :src="googleColorIcon" alt="" aria-hidden="true" class="h-4 w-4 dark:hidden" />
                  <img :src="googleMonoIcon" alt="" aria-hidden="true" class="hidden h-4 w-4 dark:block" />
                </span>
                Google로 계속하기
              </a>
              <a
                :href="githubAuthUrl"
                class="flex h-10 items-center justify-center gap-2 rounded-[0.55rem] border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-950"
              >
                <span
                  class="grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  aria-hidden="true"
                >
                  <img :src="githubIcon" alt="" aria-hidden="true" class="h-4 w-4 dark:invert" />
                </span>
                GitHub로 계속하기
              </a>
            </div>

            <p v-if="errorMessage" class="ui-state ui-state-danger text-sm font-semibold" role="alert">
              {{ errorMessage }}
            </p>

            <div class="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              아직 계정이 없나요?
              <RouterLink to="/join" class="hover:text-brand-700 dark:hover:text-brand-300 font-semibold text-slate-700 dark:text-slate-200">
                회원가입
              </RouterLink>
            </div>
          </form>
        </section>
      </div>
    </main>
  </div>
</template>
