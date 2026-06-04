import { i18n } from './index';

type TranslateParams = Record<string, unknown>;

const translate = (key: string, params?: TranslateParams) => i18n.global.t(key, params ?? {});

export { translate };
