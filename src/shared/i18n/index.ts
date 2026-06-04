import { createI18n } from 'vue-i18n';

import en from './locales/en';
import ko from './locales/ko';

export const APP_LOCALES = ['ko', 'en'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

const LOCALE_STORAGE_KEY = 'app.locale';

const isAppLocale = (value: string): value is AppLocale => (APP_LOCALES as readonly string[]).includes(value);

const detectBrowserLocale = (): AppLocale => {
  if (typeof navigator === 'undefined') {
    return 'ko';
  }
  const language = navigator.language.toLowerCase();
  if (language.startsWith('en')) {
    return 'en';
  }
  return 'ko';
};

export const readStoredLocale = (fallback: AppLocale = detectBrowserLocale()): AppLocale => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (!raw || !isAppLocale(raw)) {
    return fallback;
  }
  return raw;
};

export const writeStoredLocale = (locale: AppLocale) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
};

export const toIntlLocaleTag = (locale: AppLocale | string) => (locale === 'en' ? 'en-US' : 'ko-KR');

export const syncDocumentLocale = (locale: AppLocale) => {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.lang = locale === 'en' ? 'en' : 'ko';
};

const initialLocale = readStoredLocale();

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'ko',
  messages: {
    ko,
    en,
  },
});

syncDocumentLocale(initialLocale);
