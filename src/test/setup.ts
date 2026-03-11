import { createPinia, setActivePinia } from 'pinia';
import { afterEach, vi } from 'vitest';

import { clearAccessToken } from '../stores/auth';

Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

setActivePinia(createPinia());

afterEach(() => {
  vi.restoreAllMocks();
  clearAccessToken();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.body.innerHTML = '';
});
