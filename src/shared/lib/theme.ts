const THEME_KEY = 'mocktalk-theme';
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';
export const THEME_CHANGE_EVENT = 'theme:change';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

type ThemeChangeDetail = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
};

type ThemeMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

let stopSystemThemeSync: (() => void) | null = null;

const isThemeMode = (value: string | null): value is ThemeMode => value === 'system' || value === 'light' || value === 'dark';

export const getStoredThemeMode = (): ThemeMode | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const saved = window.localStorage.getItem(THEME_KEY);
  if (isThemeMode(saved)) {
    return saved;
  }
  return null;
};

export const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const prefersDark = window.matchMedia && window.matchMedia(SYSTEM_THEME_QUERY).matches;
  return prefersDark ? 'dark' : 'light';
};

export const resolveTheme = (theme: ThemeMode): ResolvedTheme => {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

export const getInitialThemeMode = (): ThemeMode => getStoredThemeMode() ?? 'system';

export const getInitialTheme = (): ResolvedTheme => resolveTheme(getInitialThemeMode());

export const getThemeState = (): ThemeChangeDetail => {
  if (typeof document === 'undefined') {
    const mode = getInitialThemeMode();
    return {
      mode,
      resolvedTheme: resolveTheme(mode),
    };
  }

  const mode = isThemeMode(document.documentElement.dataset.themeMode ?? null)
    ? (document.documentElement.dataset.themeMode as ThemeMode)
    : getInitialThemeMode();

  return {
    mode,
    resolvedTheme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  };
};

const dispatchThemeChange = (detail: ThemeChangeDetail) => {
  globalThis.dispatchEvent?.(new CustomEvent<ThemeChangeDetail>(THEME_CHANGE_EVENT, { detail }));
};

const clearSystemThemeSync = () => {
  stopSystemThemeSync?.();
  stopSystemThemeSync = null;
};

const syncSystemThemeChange = () => {
  const currentMode = getThemeState().mode;
  if (currentMode !== 'system') {
    return;
  }
  applyTheme('system', false);
};

const registerSystemThemeSync = () => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return;
  }

  const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY) as ThemeMediaQueryList;
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', syncSystemThemeChange);
    stopSystemThemeSync = () => mediaQuery.removeEventListener('change', syncSystemThemeChange);
    return;
  }

  mediaQuery.addListener?.(syncSystemThemeChange);
  stopSystemThemeSync = () => mediaQuery.removeListener?.(syncSystemThemeChange);
};

export const subscribeThemeChange = (listener: (detail: ThemeChangeDetail) => void) => {
  const handleChange = (event: Event) => {
    listener((event as CustomEvent<ThemeChangeDetail>).detail);
  };

  globalThis.addEventListener?.(THEME_CHANGE_EVENT, handleChange);
  return () => {
    globalThis.removeEventListener?.(THEME_CHANGE_EVENT, handleChange);
  };
};

export const applyTheme = (theme: ThemeMode, persist = true) => {
  clearSystemThemeSync();
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const resolvedTheme = resolveTheme(theme);

  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.style.colorScheme = resolvedTheme;
  root.dataset.themeMode = theme;

  if (persist && typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_KEY, theme);
  }

  if (theme === 'system') {
    registerSystemThemeSync();
  }

  dispatchThemeChange({ mode: theme, resolvedTheme });
};

export const initTheme = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const theme = getInitialThemeMode();
  const hasSaved = getStoredThemeMode() !== null;
  applyTheme(theme, hasSaved);
};
