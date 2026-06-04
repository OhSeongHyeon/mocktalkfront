import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { i18n } from '../shared/i18n';
import { useLocaleStore } from './locale';

describe('stores/locale', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    i18n.global.locale.value = 'ko';
    document.documentElement.lang = 'ko';
  });

  it('로케일 변경 시 localStorage와 i18n에 반영한다', () => {
    i18n.global.locale.value = 'en';

    const store = useLocaleStore();
    expect(store.locale).toBe('en');
    expect(i18n.global.locale.value).toBe('en');

    store.setLocale('ko');

    expect(store.locale).toBe('ko');
    expect(i18n.global.locale.value).toBe('ko');
    expect(window.localStorage.getItem('app.locale')).toBe('ko');
    expect(document.documentElement.lang).toBe('ko');
  });
});
