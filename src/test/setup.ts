import { afterEach, vi } from 'vitest';

import { clearAccessToken } from '../stores/auth';

Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

afterEach(() => {
  vi.restoreAllMocks();
  clearAccessToken();
});
