<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { ApiError } from '../shared/lib/http/api';
import { exchangeOAuth2Code } from '../features/auth';
import { useAuthStore } from '../stores/auth';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

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

const pageTitle = computed(() => (isLoading.value ? t('auth.oauth.loadingTitle') : t('auth.oauth.resultTitle')));
const pageDescription = computed(() => (isLoading.value ? t('auth.oauth.loadingDescription') : t('auth.oauth.resultDescription')));

const resolveErrorMessage = (code: string) => {
  switch (code) {
    case 'unsupported_provider':
      return t('auth.oauth.errors.unsupportedProvider');
    case 'missing_provider_id':
      return t('auth.oauth.errors.missingProviderId');
    case 'provider_already_linked':
      return t('auth.oauth.errors.providerAlreadyLinked');
    case 'user_disabled':
      return t('auth.oauth.errors.userDisabled');
    case 'oauth2_login_failed':
      return t('auth.oauth.errors.oauth2LoginFailed');
    default:
      return t('auth.oauth.errors.default');
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
    errorMessage.value = t('auth.oauth.errors.missingCode');
    isLoading.value = false;
    return;
  }

  try {
    const token = await exchangeOAuth2Code({ code: code.value });
    authStore.setAccessToken(token.accessToken, token.expiresInSec);
    await router.replace('/');
  } catch (err) {
    if (err instanceof ApiError) {
      errorMessage.value = err.status === 401 ? t('auth.oauth.errors.expired') : err.message;
    } else {
      errorMessage.value = t('auth.oauth.errors.exchangeFailed');
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
  <div class="min-h-screen text-ink">
    <main class="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center sm:px-6">
      <div class="ui-panel w-full max-w-md p-8">
        <p class="text-sm font-semibold tracking-[0.3em] text-subtle uppercase">{{ t('auth.oauth.eyebrow') }}</p>
        <h1 class="mt-4 text-2xl font-semibold text-ink">
          {{ pageTitle }}
        </h1>
        <p class="mt-3 text-sm text-muted">
          {{ pageDescription }}
        </p>

        <p v-if="errorMessage" class="ui-state ui-state-danger mt-6 text-sm font-semibold" role="alert">
          {{ errorMessage }}
        </p>

        <div v-if="!isLoading && errorMessage" class="mt-6 flex flex-col gap-3">
          <button
            type="button"
            class="h-11 w-full rounded-ui bg-[color:var(--accent-strong)] text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            @click="retryLogin"
          >
            {{ t('auth.oauth.retry') }}
          </button>
          <button
            type="button"
            class="ui-panel h-11 w-full text-sm font-semibold text-ink shadow-sm transition hover:bg-surface-soft"
            @click="redirectToLogin"
          >
            {{ t('auth.oauth.goToLogin') }}
          </button>
        </div>
      </div>
    </main>
  </div>
</template>
