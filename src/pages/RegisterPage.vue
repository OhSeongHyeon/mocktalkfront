<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { ApiError } from '../shared/lib/http/api';
import { register } from '../features/auth';

const { t } = useI18n();
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
const submitLabel = computed(() => (isSubmitting.value ? t('auth.register.submitting') : t('auth.register.submit')));

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
    errorMessage.value = t('auth.register.errors.required');
    return;
  }

  if (payload.password.length < 8) {
    errorMessage.value = t('auth.register.errors.passwordMinLength');
    return;
  }

  if (payload.password !== payload.confirmPassword) {
    errorMessage.value = t('auth.register.errors.passwordMismatch');
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
      errorMessage.value = t('auth.register.errors.failed');
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
        <RouterLink to="/" class="ui-button-ghost h-8 px-2.5 text-xs">{{ t('nav.home') }}</RouterLink>
      </div>
    </header>

    <main class="mx-auto w-full max-w-md px-4 py-8">
      <form class="bbs-box p-4" @submit.prevent="handleSubmit">
        <h1 class="ui-heading-page">{{ t('auth.register.title') }}</h1>
        <p class="ui-caption mt-1">{{ t('auth.register.subtitle') }}</p>

        <div class="mt-4 space-y-3">
          <div>
            <label for="register-login-id" class="ui-field-label">{{ t('auth.register.loginId') }}</label>
            <input
              id="register-login-id"
              v-model="loginId"
              name="loginId"
              type="text"
              autocomplete="username"
              :placeholder="t('auth.register.placeholders.loginId')"
              class="ui-input mt-1 w-full"
              :disabled="isSubmitting"
            />
          </div>

          <div>
            <label for="register-email" class="ui-field-label">{{ t('auth.register.email') }}</label>
            <input
              id="register-email"
              v-model="email"
              name="email"
              type="email"
              autocomplete="email"
              placeholder="example@mocktalk.local"
              class="ui-input mt-1 w-full"
              :disabled="isSubmitting"
            />
          </div>

          <div>
            <label for="register-password" class="ui-field-label">{{ t('auth.register.password') }}</label>
            <input
              id="register-password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="new-password"
              :placeholder="t('auth.register.placeholders.password')"
              class="ui-input mt-1 w-full"
              :disabled="isSubmitting"
            />
            <p class="ui-caption mt-1">{{ t('auth.register.passwordHint') }}</p>
          </div>

          <div>
            <label for="register-confirm-password" class="ui-field-label">{{ t('auth.register.confirmPassword') }}</label>
            <input
              id="register-confirm-password"
              v-model="confirmPassword"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              :placeholder="t('auth.register.placeholders.confirmPassword')"
              class="ui-input mt-1 w-full"
              :disabled="isSubmitting"
            />
          </div>

          <div>
            <label for="register-user-name" class="ui-field-label">{{ t('auth.register.userName') }}</label>
            <input
              id="register-user-name"
              v-model="userName"
              name="userName"
              type="text"
              autocomplete="name"
              :placeholder="t('auth.register.placeholders.userName')"
              class="ui-input mt-1 w-full"
              :disabled="isSubmitting"
            />
          </div>

          <div>
            <label for="register-display-name" class="ui-field-label">{{ t('auth.register.displayName') }}</label>
            <input
              id="register-display-name"
              v-model="displayName"
              name="displayName"
              type="text"
              autocomplete="nickname"
              :placeholder="t('auth.register.placeholders.displayName')"
              class="ui-input mt-1 w-full"
              :disabled="isSubmitting"
            />
          </div>

          <div>
            <label for="register-handle" class="ui-field-label">{{ t('auth.register.handle') }}</label>
            <input
              id="register-handle"
              v-model="handle"
              name="handle"
              type="text"
              autocomplete="off"
              :placeholder="t('auth.register.placeholders.handle')"
              class="ui-input mt-1 w-full"
              :disabled="isSubmitting"
            />
          </div>
        </div>

        <button type="submit" class="ui-button-accent mt-4 h-9 w-full text-sm" :disabled="isSubmitting">
          {{ submitLabel }}
        </button>

        <p v-if="errorMessage" class="ui-state ui-state-danger mt-3 text-sm" role="alert">{{ errorMessage }}</p>

        <p class="mt-4 text-center text-xs text-muted">
          {{ t('auth.register.hasAccount') }}
          <RouterLink to="/login" class="font-semibold text-link hover:underline">{{ t('auth.register.signIn') }}</RouterLink>
        </p>
      </form>
    </main>
  </div>
</template>
