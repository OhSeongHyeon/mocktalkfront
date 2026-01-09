const THEME_KEY = 'mocktalk-theme';

export type ThemeMode = 'light' | 'dark';

export const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') {
    return saved;
  }

  const prefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

export const applyTheme = (theme: ThemeMode, persist = true) => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;

  if (persist && typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_KEY, theme);
  }
};

export const initTheme = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const theme = getInitialTheme();
  const hasSaved = window.localStorage.getItem(THEME_KEY) !== null;
  applyTheme(theme, hasSaved);
};
