import { translate } from '../../../shared/i18n/translate';

export type BoardVisibility = 'PUBLIC' | 'GROUP' | 'PRIVATE' | 'UNLISTED';

export type BoardVisibilityOption = {
  value: BoardVisibility;
  label: string;
  adminOnly?: boolean;
};

export const BOARD_VISIBILITY_VALUES: BoardVisibility[] = ['PUBLIC', 'GROUP', 'PRIVATE', 'UNLISTED'];

const buildVisibilityOptions = (): BoardVisibilityOption[] =>
  BOARD_VISIBILITY_VALUES.map((value) => ({
    value,
    label: translate(`board.visibility.option.${value}`),
    adminOnly: value === 'UNLISTED',
  }));

export const resolveBoardVisibilityLabel = (visibility: string) => {
  const key = `board.visibility.${visibility}`;
  const translated = translate(key);
  if (translated !== key) {
    return translated;
  }
  return translate('board.visibility.OTHER');
};

export const resolveBoardVisibilityOptions = (isAdminUser: boolean, currentVisibility?: BoardVisibility) => {
  const options = buildVisibilityOptions().filter((option) => !option.adminOnly || isAdminUser);
  if (!isAdminUser && currentVisibility === 'UNLISTED') {
    const unlistedOption = buildVisibilityOptions().find((option) => option.value === 'UNLISTED');
    if (unlistedOption) {
      return [...options, unlistedOption];
    }
  }
  return options;
};

/** @deprecated Use resolveBoardVisibilityOptions at runtime for locale-aware labels */
export const BOARD_VISIBILITY_OPTIONS = buildVisibilityOptions();
