import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, vi } from 'vitest';

import { useAuthStore } from '../stores/auth';

Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(() => {
  vi.restoreAllMocks();
  useAuthStore().clearAccessToken();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.body.innerHTML = '';
});
