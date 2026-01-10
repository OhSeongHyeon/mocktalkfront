<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ApiError } from '../lib/api';
import { exchangeOAuth2Code } from '../services/auth';
import { setAccessToken } from '../stores/auth';

const route = useRoute();
const router = useRouter();

const isLoading = ref(true);
const errorMessage = ref('');

const code = computed(() => {
  const raw = route.query.code;
  return typeof raw === 'string' ? raw : '';
});

const error = computed(() => {
  const raw = route.query.error;
  return typeof raw === 'string' ? raw : '';
});

const resolveErrorMessage = (code: string) => {
  switch (code) {
    case 'unsupported_provider':
      return '지원하지 않는 소셜 로그인입니다.';
    case 'missing_provider_id':
      return '제공자 정보가 부족합니다. 다시 시도해주세요.';
    case 'provider_already_linked':
      return '이미 연결된 계정입니다. 다른 계정으로 시도해주세요.';
    case 'user_disabled':
      return '계정이 비활성화/잠금 상태입니다. 관리자에게 문의하세요.';
    case 'oauth2_login_failed':
      return '소셜 로그인에 실패했습니다. 다시 시도해주세요.';
    default:
      return '소셜 로그인 처리 중 오류가 발생했습니다.';
  }
};

const redirectToLogin = () => router.push('/login');
const retryLogin = () => router.push('/login');

const handleExchange = async () => {
  if (error.value) {
    errorMessage.value = resolveErrorMessage(error.value);
    isLoading.value = false;
    return;
  }

  if (!code.value) {
    errorMessage.value = '인증 코드가 없습니다. 다시 시도해주세요.';
    isLoading.value = false;
    return;
  }

  try {
    const token = await exchangeOAuth2Code({ code: code.value });
    setAccessToken(token.accessToken, token.expiresInSec);
    await router.replace('/');
  } catch (err) {
    if (err instanceof ApiError) {
      errorMessage.value =
        err.status === 401 ? '인증이 만료되었습니다. 다시 로그인해주세요.' : err.message;
    } else {
      errorMessage.value = '로그인 처리에 실패했습니다. 다시 시도해주세요.';
    }
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  handleExchange();
});
</script>

<template>
  <div class="min-h-screen text-slate-900 dark:text-slate-100">
    <main
      class="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center sm:px-6"
    >
      <div class="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-sm">
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          OAuth Callback
        </p>
        <h1 class="mt-4 text-2xl font-semibold text-slate-900">
          {{ isLoading ? '로그인 확인 중' : '로그인 결과' }}
        </h1>
        <p class="mt-3 text-sm text-slate-600">
          {{
            isLoading
              ? '잠시만 기다려주세요. 인증 상태를 확인하고 있습니다.'
              : '로그인 상태를 확인했습니다.'
          }}
        </p>

        <p
          v-if="errorMessage"
          class="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
          role="alert"
        >
          {{ errorMessage }}
        </p>

        <div v-if="!isLoading && errorMessage" class="mt-6 flex flex-col gap-3">
          <button
            type="button"
            class="h-11 w-full rounded-2xl bg-[color:var(--accent-strong)] text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            @click="retryLogin"
          >
            다시 로그인하기
          </button>
          <button
            type="button"
            class="h-11 w-full rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            @click="redirectToLogin"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    </main>
  </div>
</template>
