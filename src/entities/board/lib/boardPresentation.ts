import { translate } from '../../../shared/i18n/translate';

type BoardRoleLabelSource = 'OWNER' | 'MODERATOR' | 'MEMBER' | 'PENDING' | 'BANNED' | string;

const resolveBoardSummaryDescription = (description: string | null, fallback?: string) => {
  const trimmed = description?.trim();
  return trimmed ? trimmed : (fallback ?? translate('board.defaults.noDescription'));
};

const resolveBoardRoleLabel = (role: BoardRoleLabelSource) => {
  if (role === 'OWNER') {
    return translate('boardMeta.role.OWNER');
  }
  if (role === 'MODERATOR') {
    return translate('boardMeta.role.MODERATOR');
  }
  return role;
};

export { resolveBoardRoleLabel, resolveBoardSummaryDescription };
