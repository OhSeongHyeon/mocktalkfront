<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { ApiError } from '../lib/api';
import { register } from '../services/auth';

const router = useRouter();
const loginId = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const userName = ref('');
const displayName = ref('');
const handle = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

const handleSubmit = async () => {
  errorMessage.value = '';

  const payload = {
    loginId: loginId.value.trim(),
    email: email.value.trim(),
    password: password.value,
    confirmPassword: confirmPassword.value,
    userName: userName.value.trim() || undefined,
    displayName: displayName.value.trim() || undefined,
    handle: handle.value.trim() || undefined,
  };

  if (!payload.loginId || !payload.email || !payload.password || !payload.confirmPassword) {
    errorMessage.value = '필수 항목을 입력하세요.';
    return;
  }

  if (payload.password.length < 8) {
    errorMessage.value = '비밀번호는 8자 이상이어야 합니다.';
    return;
  }

  if (payload.password !== payload.confirmPassword) {
    errorMessage.value = '비밀번호가 일치하지 않습니다.';
    return;
  }

  isSubmitting.value = true;
  try {
    await register(payload);
    await router.push('/login');
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message;
    } else {
      errorMessage.value = '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.';
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
        <span class="inline">MockTalk</span>
      </RouterLink>
      <RouterLink to="/login" class="text-sm font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
        로그인으로
      </RouterLink>
    </header>

    <main
      class="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 pb-16 pt-4 sm:px-6 lg:flex-row lg:items-start lg:justify-center lg:gap-16 lg:px-8"
    >
      <section class="w-full max-w-md">
        <form
          class="flex flex-col gap-5 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90"
          @submit.prevent="handleSubmit"
        >
          <div class="flex flex-col gap-2">
            <label for="register-login-id" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 로그인 아이디 </label>
            <input
              id="register-login-id"
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
            <label for="register-email" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 이메일 </label>
            <input
              id="register-email"
              v-model="email"
              name="email"
              type="email"
              autocomplete="email"
              placeholder="example@mocktalk.local"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
              :disabled="isSubmitting"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="register-password" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 비밀번호 </label>
            <input
              id="register-password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="new-password"
              placeholder="비밀번호를 입력하세요"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
              :disabled="isSubmitting"
            />
            <span class="text-xs font-semibold text-slate-400 dark:text-slate-500"> 비밀번호는 8자 이상 입력하세요. </span>
          </div>

          <div class="flex flex-col gap-2">
            <label for="register-confirm-password" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 비밀번호 확인 </label>
            <input
              id="register-confirm-password"
              v-model="confirmPassword"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder="비밀번호를 다시 입력하세요"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
              :disabled="isSubmitting"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="register-user-name" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 사용자명 </label>
            <input
              id="register-user-name"
              v-model="userName"
              name="userName"
              type="text"
              autocomplete="name"
              placeholder="입력하지 않으면 아이디로 대체됩니다"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
              :disabled="isSubmitting"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="register-display-name" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 표시명(선택) </label>
            <input
              id="register-display-name"
              v-model="displayName"
              name="displayName"
              type="text"
              autocomplete="nickname"
              placeholder="입력하지 않으면 사용자명으로 대체됩니다"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
              :disabled="isSubmitting"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="register-handle" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 핸들(선택) </label>
            <input
              id="register-handle"
              v-model="handle"
              name="handle"
              type="text"
              autocomplete="off"
              placeholder="입력하지 않으면 자동 생성됩니다"
              class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
              :disabled="isSubmitting"
            />
          </div>

          <button
            type="submit"
            class="h-11 rounded-2xl bg-[color:var(--accent-strong)] text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            :disabled="isSubmitting"
          >
            회원가입
          </button>

          <p
            v-if="errorMessage"
            class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {{ errorMessage }}
          </p>

          <div class="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            이미 계정이 있나요?
            <RouterLink to="/login" class="font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white">
              로그인
            </RouterLink>
          </div>
        </form>
      </section>
    </main>
  </div>
</template>
