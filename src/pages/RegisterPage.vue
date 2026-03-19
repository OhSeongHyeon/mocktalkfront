<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { ApiError } from '../shared/lib/http/api';
import { register } from '../features/auth';

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
      <div class="grid w-full gap-5 lg:grid-cols-[minmax(0,1.05fr)_460px]">
        <section class="ui-panel overflow-hidden">
          <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <p class="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">회원가입</p>
            <h1 class="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">최소 정보로 가입</h1>
            <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              로그인 아이디, 이메일, 비밀번호만 먼저 받고 나머지 프로필 정보는 나중에 마이페이지에서 수정할 수 있습니다.
            </p>
          </div>

          <div class="grid gap-px bg-slate-200 md:grid-cols-2 dark:bg-slate-800">
            <div class="bg-white px-5 py-4 dark:bg-slate-900">
              <p class="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">필수 입력</p>
              <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <li>아이디, 이메일, 비밀번호는 반드시 입력합니다.</li>
                <li>비밀번호는 8자 이상이어야 합니다.</li>
                <li>가입 후 로그인 화면으로 이동합니다.</li>
              </ul>
            </div>
            <div class="bg-white px-5 py-4 dark:bg-slate-900">
              <p class="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">선택 입력</p>
              <div class="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <p>표시명과 핸들은 비워둘 수 있고, 나중에 변경할 수 있습니다.</p>
                <RouterLink to="/login" class="ui-button-ghost mt-2 h-9 px-3.5 text-xs">로그인으로 이동</RouterLink>
              </div>
            </div>
          </div>
        </section>

        <section class="w-full">
          <form class="ui-panel flex flex-col gap-4 p-5" @submit.prevent="handleSubmit">
            <div class="space-y-1.5 border-b border-slate-200 pb-3 dark:border-slate-800">
              <p class="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">Create Account</p>
              <h2 class="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">새 계정 만들기</h2>
              <p class="text-sm leading-6 text-slate-500 dark:text-slate-400">필수 항목만 먼저 입력하면 바로 가입을 시작할 수 있습니다.</p>
            </div>

            <div class="flex flex-col gap-2">
              <label for="register-login-id" class="text-sm font-semibold text-slate-700 dark:text-slate-200">로그인 아이디</label>
              <input
                id="register-login-id"
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
              <label for="register-email" class="text-sm font-semibold text-slate-700 dark:text-slate-200">이메일</label>
              <input
                id="register-email"
                v-model="email"
                name="email"
                type="email"
                autocomplete="email"
                placeholder="example@mocktalk.local"
                class="ui-input"
                :disabled="isSubmitting"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label for="register-password" class="text-sm font-semibold text-slate-700 dark:text-slate-200">비밀번호</label>
              <input
                id="register-password"
                v-model="password"
                name="password"
                type="password"
                autocomplete="new-password"
                placeholder="비밀번호를 입력하세요"
                class="ui-input"
                :disabled="isSubmitting"
              />
              <span class="text-xs font-semibold text-slate-400 dark:text-slate-500">비밀번호는 8자 이상 입력하세요.</span>
            </div>

            <div class="flex flex-col gap-2">
              <label for="register-confirm-password" class="text-sm font-semibold text-slate-700 dark:text-slate-200">비밀번호 확인</label>
              <input
                id="register-confirm-password"
                v-model="confirmPassword"
                name="confirmPassword"
                type="password"
                autocomplete="new-password"
                placeholder="비밀번호를 다시 입력하세요"
                class="ui-input"
                :disabled="isSubmitting"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label for="register-user-name" class="text-sm font-semibold text-slate-700 dark:text-slate-200">사용자명</label>
              <input
                id="register-user-name"
                v-model="userName"
                name="userName"
                type="text"
                autocomplete="name"
                placeholder="이름을 입력하세요"
                class="ui-input"
                :disabled="isSubmitting"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label for="register-display-name" class="text-sm font-semibold text-slate-700 dark:text-slate-200">표시명(선택)</label>
              <input
                id="register-display-name"
                v-model="displayName"
                name="displayName"
                type="text"
                autocomplete="nickname"
                placeholder="입력하지 않으면 사용자명으로 대체됩니다"
                class="ui-input"
                :disabled="isSubmitting"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label for="register-handle" class="text-sm font-semibold text-slate-700 dark:text-slate-200">핸들(선택)</label>
              <input
                id="register-handle"
                v-model="handle"
                name="handle"
                type="text"
                autocomplete="off"
                placeholder="입력하지 않으면 자동 생성됩니다"
                class="ui-input"
                :disabled="isSubmitting"
              />
            </div>

            <button type="submit" class="ui-button-accent h-10 text-sm disabled:cursor-not-allowed disabled:opacity-70" :disabled="isSubmitting">
              회원가입
            </button>

            <p v-if="errorMessage" class="ui-state ui-state-danger text-sm font-semibold" role="alert">
              {{ errorMessage }}
            </p>

            <div class="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              이미 계정이 있나요?
              <RouterLink to="/login" class="hover:text-brand-700 dark:hover:text-brand-300 font-semibold text-slate-700 dark:text-slate-200">
                로그인
              </RouterLink>
            </div>
          </form>
        </section>
      </div>
    </main>
  </div>
</template>
