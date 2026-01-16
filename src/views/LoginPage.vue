<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { API_BASE_URL, ApiError } from '../lib/api';
import { applyProfileSummary } from '../lib/profile';
import { login } from '../services/auth';
import { getMyProfile } from '../services/mypage';
import { setAccessToken } from '../stores/auth';

const router = useRouter();
const loginId = ref('');
const password = ref('');
const rememberMe = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');

const apiBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
const googleAuthUrl = `${apiBase}/oauth2/authorization/google`;
const githubAuthUrl = `${apiBase}/oauth2/authorization/github`;

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
    setAccessToken(token.accessToken, token.expiresInSec);
    try {
      const profile = await getMyProfile();
      applyProfileSummary(profile);
    } catch {
      // 로그인 직후 프로필 조회 실패는 무시
    }
    await router.push('/');
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
  <div class="min-h-screen text-slate-900 dark:text-slate-100">
    <header class="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
      <RouterLink to="/" class="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        <!-- <span
          class="grid h-9 w-9 place-items-center rounded-2xl shadow-sm"
          style="background-color: var(--accent-strong)"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="white" class="h-4 w-4">
            <path d="M9 7l8 5-8 5V7z" />
          </svg>
        </span> -->
        <span class="hidden sm:inline">MockTalk</span>
      </RouterLink>
      <RouterLink to="/" class="text-sm font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
        홈으로
      </RouterLink>
    </header>

    <main class="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 pb-16 pt-4 sm:px-6 lg:flex-row lg:items-start lg:gap-16 lg:px-8">
      <section class="flex w-full flex-1 flex-col gap-6 pt-4">
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">MockTalk Login</p>
        <h1 class="text-3xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-4xl">
          크리에이터처럼 꾸미고,<br />
          커뮤니티처럼 소통하세요.
        </h1>
        <p class="text-base text-slate-600 dark:text-slate-300">로그인 아이디로 빠르게 입장해서 게시판, 갤러리, 알림을 한곳에서 관리합니다.</p>
        <div class="flex flex-wrap gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span class="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900"> 게시판 </span>
          <span class="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900"> 갤러리 </span>
          <span class="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900"> 알림 </span>
        </div>
      </section>

      <section class="w-full max-w-md">
        <form
          class="flex flex-col gap-6 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90"
          @submit.prevent="handleSubmit"
        >
          <div class="flex flex-col gap-2">
            <label for="login-id" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 로그인 아이디 </label>
            <input
              id="login-id"
              v-model="loginId"
              name="loginId"
              type="text"
              autocomplete="username"
              placeholder="아이디를 입력하세요"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
              :disabled="isSubmitting"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="login-password" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 비밀번호 </label>
            <input
              id="login-password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="비밀번호를 입력하세요"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
              :disabled="isSubmitting"
            />
          </div>

          <div class="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <label class="inline-flex items-center gap-2">
              <input v-model="rememberMe" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-red-500 dark:border-slate-700" />
              로그인 유지
            </label>
            <a href="#" class="font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              비밀번호 찾기
            </a>
          </div>

          <button
            type="submit"
            class="h-11 rounded-2xl bg-[color:var(--accent-strong)] text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            :disabled="isSubmitting"
          >
            로그인
          </button>

          <div class="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <div class="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
            또는
            <div class="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
          </div>

          <div class="flex flex-col gap-3">
            <a
              :href="googleAuthUrl"
              class="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <span
                class="grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                aria-hidden="true"
              >
                <svg viewBox="0 0 48 48" class="h-4 w-4 dark:hidden">
                  <path
                    d="M44.5 20H24v8.5h11.8C34.5 33.9 29.9 38 24 38c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.3 0 6.2 1.2 8.5 3.2l6-6C34.9 5.1 29.8 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20.3-7.6 20.3-21 0-1.4-.1-2.7-.3-4z"
                    fill="#4285F4"
                  />
                  <path
                    d="M6.3 14.7l7 5.1C15.2 16 19.3 13 24 13c3.3 0 6.2 1.2 8.5 3.2l6-6C34.9 5.1 29.8 3 24 3c-7.9 0-14.7 4.3-18.7 10.7z"
                    fill="#34A853"
                  />
                  <path
                    d="M24 45c5.7 0 10.8-1.9 14.4-5.1l-6.6-5.4C29.9 36.9 27.1 38 24 38c-5.8 0-10.8-3.9-12.5-9.2l-7 5.4C8.5 40.5 15.8 45 24 45z"
                    fill="#FBBC05"
                  />
                  <path d="M11.5 28.8c-.4-1.2-.6-2.4-.6-3.8s.2-2.6.6-3.8l-7-5.1C3.5 18.5 3 21.2 3 24s.5 5.5 1.5 7.9l7-5.1z" fill="#EA4335" />
                </svg>
                <svg viewBox="0 0 48 48" class="hidden h-4 w-4 dark:block" fill="currentColor">
                  <path d="M24 10.9c3.1 0 6.1 1.1 8.4 3.2l5.8-5.8C34.9 5.1 29.8 3 24 3 15.8 3 8.5 7.5 4.8 14.6l6.8 5.2C13 14.3 18.2 10.9 24 10.9z" />
                  <path
                    d="M44.5 20H24v8.5h11.8c-1.5 4.1-5.9 7.6-11.8 7.6-5.8 0-10.8-3.9-12.5-9.2l-6.8 5.2C8.5 40.5 15.8 45 24 45c10.5 0 20.3-7.6 20.3-21 0-1.4-.1-2.7-.3-4z"
                  />
                  <path d="M9.8 24c0-1.3.2-2.6.6-3.8l-6.8-5.2C3.5 18.5 3 21.2 3 24s.5 5.5 1.5 7.9l6.8-5.2c-.4-1.2-.5-2.4-.5-3.7z" />
                </svg>
              </span>
              Google로 계속하기
            </a>
            <a
              :href="githubAuthUrl"
              class="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <span
                class="grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                  <path
                    d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.3 6.9 9.6.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.7.1-.7.1-.7 1 0 1.6 1.1 1.6 1.1.9 1.6 2.5 1.1 3.1.8.1-.7.4-1.1.6-1.4-2.2-.2-4.5-1.1-4.5-5 0-1.1.4-2 1.1-2.8-.1-.2-.5-1.3.1-2.7 0 0 .9-.3 2.9 1.1.9-.3 1.8-.4 2.7-.4.9 0 1.8.1 2.7.4 2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.5.1 2.7.7.8 1.1 1.7 1.1 2.8 0 3.9-2.3 4.8-4.5 5 .4.3.7 1 .7 2.1v3.2c0 .3.2.6.7.5 4-1.3 6.9-5.1 6.9-9.6C22 6.6 17.5 2 12 2z"
                  />
                </svg>
              </span>
              GitHub로 계속하기
            </a>
          </div>

          <p
            v-if="errorMessage"
            class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {{ errorMessage }}
          </p>

          <div class="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            아직 계정이 없나요?
            <RouterLink to="/join" class="font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white">
              회원가입
            </RouterLink>
          </div>
        </form>
      </section>
    </main>
  </div>
</template>
