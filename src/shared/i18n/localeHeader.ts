import { type AppLocale, i18n, readStoredLocale } from './index';

const resolveAcceptLanguage = (): AppLocale => {
  const active = i18n.global.locale.value;
  if (active === 'ko' || active === 'en') {
    return active;
  }
  return readStoredLocale();
};

export { resolveAcceptLanguage };
