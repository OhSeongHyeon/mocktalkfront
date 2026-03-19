import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyTheme, getInitialTheme, initTheme } from './theme';

const createMatchMedia = (matches: boolean) =>
  vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

describe('shared/lib/theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: createMatchMedia(false),
      writable: true,
    });
  });

  it('저장된 테마가 있으면 그 값을 우선 반환한다', () => {
    // given
    window.localStorage.setItem('mocktalk-theme', 'dark');

    // when
    const theme = getInitialTheme();

    // then
    expect(theme).toBe('dark');
  });

  it('저장된 값이 없으면 시스템 다크모드 선호를 따른다', () => {
    // given
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: createMatchMedia(true),
      writable: true,
    });

    // when
    const theme = getInitialTheme();

    // then
    expect(theme).toBe('dark');
  });

  it('applyTheme는 루트 class와 colorScheme, 저장값을 함께 갱신한다', () => {
    // given

    // when
    applyTheme('dark');

    // then
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(window.localStorage.getItem('mocktalk-theme')).toBe('dark');
  });

  it('initTheme는 저장된 값이 없으면 시스템 테마를 적용하되 저장은 하지 않는다', () => {
    // given
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: createMatchMedia(true),
      writable: true,
    });

    // when
    initTheme();

    // then
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});
