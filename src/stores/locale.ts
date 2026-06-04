import { defineStore } from 'pinia';
import { ref } from 'vue';

import { type AppLocale, i18n, syncDocumentLocale, writeStoredLocale } from '../shared/i18n';

export const useLocaleStore = defineStore('locale', () => {
  const locale = ref<AppLocale>(i18n.global.locale.value as AppLocale);

  const setLocale = (next: AppLocale) => {
    locale.value = next;
    i18n.global.locale.value = next;
    writeStoredLocale(next);
    syncDocumentLocale(next);
  };

  return {
    locale,
    setLocale,
  };
});
