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
  <div class="auth-shell">
    <header class="auth-header">
      <div class="mx-auto flex h-[3.75rem] max-w-md items-center justify-between px-4">
        <RouterLink to="/" class="app-brand-title">MockTalk</RouterLink>
        <RouterLink to="/" class="ui-button-ghost h-8 px-2.5 text-xs">홈</RouterLink>
      </div>
    </header>

    <main class="mx-auto w-full max-w-md px-4 py-8">
      <form class="bbs-box p-4" @submit.prevent="handleSubmit">
        <h1 class="ui-heading-page">회원가입</h1>
        <p class="ui-caption mt-1">필수 항목만 입력하면 가입을 완료할 수 있습니다. 프로필은 나중에 마이페이지에서 수정할 수 있습니다.</p>

        <div class="mt-4 space-y-3">
          <div>
            <label for="register-login-id" class="ui-field-label">로그인 아이디</label>
            <input
              id="register-login-id"
              v-model="loginId"
              name="loginId"
              type="text"
              autocomplete="username"
              placeholder="아이디를 입력하세요"
              class="ui-input mt-1 w-full"
              :disabled="isSubmitting"
            />
          </div>

          <div>
            <label for="register-email" class="ui-field-label">이메일</label>
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
            <label for="register-password" class="ui-field-label">비밀번호</label>
            <input
              id="register-password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="new-password"
              placeholder="비밀번호를 입력하세요"
              class="ui-input mt-1 w-full"
              :disabled="isSubmitting"
            />
            <p class="ui-caption mt-1">8자 이상 입력하세요.</p>
          </div>

          <div>
            <label for="register-confirm-password" class="ui-field-label">비밀번호 확인</label>
            <input
              id="register-confirm-password"
              v-model="confirmPassword"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder="비밀번호를 다시 입력하세요"
              class="ui-input mt-1 w-full"
              :disabled="isSubmitting"
            />
          </div>

          <div>
            <label for="register-user-name" class="ui-field-label">사용자명</label>
            <input
              id="register-user-name"
              v-model="userName"
              name="userName"
              type="text"
              autocomplete="name"
              placeholder="이름을 입력하세요"
              class="ui-input mt-1 w-full"
              :disabled="isSubmitting"
            />
          </div>

          <div>
            <label for="register-display-name" class="ui-field-label">표시명 (선택)</label>
            <input
              id="register-display-name"
              v-model="displayName"
              name="displayName"
              type="text"
              autocomplete="nickname"
              placeholder="입력하지 않으면 사용자명으로 대체됩니다"
              class="ui-input mt-1 w-full"
              :disabled="isSubmitting"
            />
          </div>

          <div>
            <label for="register-handle" class="ui-field-label">핸들 (선택)</label>
            <input
              id="register-handle"
              v-model="handle"
              name="handle"
              type="text"
              autocomplete="off"
              placeholder="입력하지 않으면 자동 생성됩니다"
              class="ui-input mt-1 w-full"
              :disabled="isSubmitting"
            />
          </div>
        </div>

        <button type="submit" class="ui-button-accent mt-4 h-9 w-full text-sm" :disabled="isSubmitting">
          {{ isSubmitting ? '가입 처리 중...' : '회원가입' }}
        </button>

        <p v-if="errorMessage" class="ui-state ui-state-danger mt-3 text-sm" role="alert">{{ errorMessage }}</p>

        <p class="mt-4 text-center text-xs text-muted">
          이미 계정이 있나요?
          <RouterLink to="/login" class="font-semibold text-link hover:underline">로그인</RouterLink>
        </p>
      </form>
    </main>
  </div>
</template>
