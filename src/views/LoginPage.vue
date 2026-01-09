<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { ApiError } from '../lib/api';
import { login } from '../services/auth';
import { setAccessToken } from '../stores/auth';

const router = useRouter();
const loginId = ref('');
const password = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

const handleSubmit = async () => {
  errorMessage.value = '';
  const trimmedId = loginId.value.trim();

  if (!trimmedId || !password.value) {
    errorMessage.value = '아이디와 비밀번호를 입력하세요.';
    return;
  }

  isSubmitting.value = true;
  try {
    const token = await login({ loginId: trimmedId, password: password.value });
    setAccessToken(token.accessToken, token.expiresInSec);
    await router.push('/');
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value =
        error.status === 401 ? '아이디 또는 비밀번호가 올바르지 않습니다.' : error.message;
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
      <RouterLink
        to="/"
        class="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
      >
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
      <RouterLink
        to="/"
        class="text-sm font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        홈으로
      </RouterLink>
    </header>

    <main
      class="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 pb-16 pt-4 sm:px-6 lg:flex-row lg:items-start lg:gap-16 lg:px-8"
    >
      <section class="flex w-full flex-1 flex-col gap-6 pt-4">
        <p
          class="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500"
        >
          MockTalk Login
        </p>
        <h1 class="text-3xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-4xl">
          크리에이터처럼 꾸미고,<br />
          커뮤니티처럼 소통하세요.
        </h1>
        <p class="text-base text-slate-600 dark:text-slate-300">
          로그인 아이디로 빠르게 입장해서 게시판, 갤러리, 알림을 한곳에서 관리합니다.
        </p>
        <div class="flex flex-wrap gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span
            class="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900"
          >
            게시판
          </span>
          <span
            class="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900"
          >
            갤러리
          </span>
          <span
            class="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900"
          >
            알림
          </span>
        </div>
      </section>

      <section class="w-full max-w-md">
        <form
          class="flex flex-col gap-6 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90"
          @submit.prevent="handleSubmit"
        >
          <div class="flex flex-col gap-2">
            <label for="login-id" class="text-sm font-semibold text-slate-700 dark:text-slate-200">
              로그인 아이디
            </label>
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
            <label
              for="login-password"
              class="text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              비밀번호
            </label>
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
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300 text-red-500 dark:border-slate-700"
              />
              로그인 유지
            </label>
            <a
              href="#"
              class="font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
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

          <p
            v-if="errorMessage"
            class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {{ errorMessage }}
          </p>

          <div
            class="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400"
          >
            아직 계정이 없나요?
            <RouterLink
              to="/join"
              class="font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
            >
              회원가입
            </RouterLink>
          </div>
        </form>
      </section>
    </main>
  </div>
</template>
