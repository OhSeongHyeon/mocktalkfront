import { createPinia, type Pinia } from 'pinia';

import { i18n } from '../shared/i18n';

const createTestPinia = (): Pinia => createPinia();

const getTestPlugins = (pinia: Pinia) => [pinia, i18n] as const;

export { createTestPinia, getTestPlugins, i18n };
