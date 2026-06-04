import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, vi } from 'vitest';

import { i18n } from '../shared/i18n';
import { useAuthStore } from '../stores/auth';

Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

beforeEach(() => {
  setActivePinia(createPinia());
  i18n.global.locale.value = 'ko';
  document.documentElement.lang = 'ko';
});

afterEach(() => {
  vi.restoreAllMocks();
  useAuthStore().clearAccessToken();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.body.innerHTML = '';
});
