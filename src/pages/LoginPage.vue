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
      // ignore
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
  <div class="auth-shell">
    <header class="auth-header">
      <div class="mx-auto flex h-[3.75rem] max-w-md items-center justify-between px-4">
        <RouterLink to="/" class="app-brand-title">MockTalk</RouterLink>
        <RouterLink to="/" class="ui-button-ghost h-8 px-2.5 text-xs">홈</RouterLink>
      </div>
    </header>

    <main class="mx-auto w-full max-w-md px-4 py-8">
      <form class="bbs-box p-4" @submit.prevent="handleSubmit">
        <h1 class="ui-heading-page">로그인</h1>
        <p class="ui-caption mt-1">아이디 또는 소셜 계정으로 로그인합니다.</p>

        <div class="mt-4 space-y-3">
          <div>
            <label for="login-id" class="ui-field-label">아이디</label>
            <input id="login-id" v-model="loginId" type="text" autocomplete="username" class="ui-input mt-1 w-full" :disabled="isSubmitting" />
          </div>
          <div>
            <label for="login-password" class="ui-field-label">비밀번호</label>
            <input
              id="login-password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              class="ui-input mt-1 w-full"
              :disabled="isSubmitting"
            />
          </div>
        </div>

        <div class="mt-3 flex items-center justify-between text-xs text-muted">
          <label class="inline-flex items-center gap-1.5">
            <input v-model="rememberMe" type="checkbox" class="h-3.5 w-3.5" />
            로그인 유지
          </label>
          <a href="#" class="text-link hover:underline" @click.prevent="handleForgotPassword">비밀번호 찾기</a>
        </div>

        <button type="submit" class="ui-button-accent mt-4 h-9 w-full text-sm" :disabled="!canSubmit">
          {{ isSubmitting ? '로그인 중...' : '로그인' }}
        </button>

        <div class="mt-3 grid gap-2">
          <a :href="googleAuthUrl" class="ui-oauth-button">
            <img :src="googleColorIcon" alt="" class="h-4 w-4 dark:hidden" />
            <img :src="googleMonoIcon" alt="" class="hidden h-4 w-4 dark:block" />
            Google
          </a>
          <a :href="githubAuthUrl" class="ui-oauth-button">
            <img :src="githubIcon" alt="" class="h-4 w-4" />
            GitHub
          </a>
        </div>

        <p v-if="errorMessage" class="ui-state ui-state-danger mt-3 text-sm" role="alert">{{ errorMessage }}</p>

        <p class="mt-4 text-center text-xs text-muted">
          계정이 없으신가요?
          <RouterLink to="/join" class="font-semibold text-link hover:underline">회원가입</RouterLink>
        </p>
      </form>
    </main>
  </div>
</template>
