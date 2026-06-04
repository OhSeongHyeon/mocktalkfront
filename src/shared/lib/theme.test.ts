import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyTheme, getInitialTheme, getInitialThemeMode, initTheme } from './theme';

const createMatchMediaController = (initialMatches: boolean) => {
  let matches = initialMatches;
  let changeListener: ((event: MediaQueryListEvent) => void) | null = null;

  return {
    matchMedia: vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return matches;
      },
      media: query,
      onchange: null,
      addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          changeListener = listener;
        }
      }),
      removeEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === 'change' && changeListener === listener) {
          changeListener = null;
        }
      }),
      addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
        changeListener = listener;
      }),
      removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
        if (changeListener === listener) {
          changeListener = null;
        }
      }),
      dispatchEvent: vi.fn(),
    })),
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      changeListener?.({ matches: nextMatches } as MediaQueryListEvent);
    },
  };
};

describe('shared/lib/theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
    delete document.documentElement.dataset.themeMode;
    const matchMediaController = createMatchMediaController(false);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: matchMediaController.matchMedia,
      writable: true,
    });
  });

  it('저장된 테마가 있으면 그 값을 우선 반환한다', () => {
    // given
    window.localStorage.setItem('mocktalk-theme', 'dark');

    // when
    const theme = getInitialThemeMode();

    // then
    expect(theme).toBe('dark');
  });

  it('저장된 값이 없으면 기본 테마 모드를 시스템으로 간주한다', () => {
    // given

    // when
    const themeMode = getInitialThemeMode();

    // then
    expect(themeMode).toBe('system');
  });

  it('초기 적용 테마는 시스템 다크모드 선호를 따른다', () => {
    // given
    const matchMediaController = createMatchMediaController(true);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: matchMediaController.matchMedia,
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

  it('system 테마 적용 시 저장값은 system으로 유지하고 현재 시스템 테마를 반영한다', () => {
    // given
    const matchMediaController = createMatchMediaController(true);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: matchMediaController.matchMedia,
      writable: true,
    });

    // when
    applyTheme('system');

    // then
    expect(document.documentElement.dataset.themeMode).toBe('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(window.localStorage.getItem('mocktalk-theme')).toBe('system');
  });

  it('initTheme는 저장된 값이 없으면 시스템 테마를 적용하되 저장은 하지 않는다', () => {
    // given
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem');
    const matchMediaController = createMatchMediaController(true);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: matchMediaController.matchMedia,
      writable: true,
    });

    // when
    initTheme();

    // then
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('system 모드에서는 시스템 컬러 스킴 변경을 따라 다시 적용한다', () => {
    // given
    const matchMediaController = createMatchMediaController(false);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: matchMediaController.matchMedia,
      writable: true,
    });
    applyTheme('system');

    // when
    matchMediaController.setMatches(true);

    // then
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(window.localStorage.getItem('mocktalk-theme')).toBe('system');
  });
});
