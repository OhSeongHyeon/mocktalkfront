import type { BoardDetailResponse, BoardMemberStatus } from '..';
import { translate } from '../../../shared/i18n/translate';

export type BoardArticleWritePolicy = 'ALL_AUTHENTICATED' | 'MEMBER' | 'MODERATOR' | 'OWNER';

export const BOARD_ARTICLE_WRITE_POLICY_VALUES: BoardArticleWritePolicy[] = ['ALL_AUTHENTICATED', 'MEMBER', 'MODERATOR', 'OWNER'];

const resolveBoardWritePolicyLabel = (writePolicy: string) => {
  const key = `board.writePolicy.short.${writePolicy}`;
  const translated = translate(key);
  if (translated !== key) {
    return translated;
  }
  return translate('board.writePolicy.short.UNKNOWN');
};

const isActiveMember = (role: BoardMemberStatus | null | undefined) => role === 'OWNER' || role === 'MODERATOR' || role === 'MEMBER';

const canWriteByPolicy = (policy: BoardArticleWritePolicy, role: BoardMemberStatus | null | undefined) => {
  if (policy === 'ALL_AUTHENTICATED') {
    return true;
  }
  if (policy === 'MEMBER') {
    return isActiveMember(role);
  }
  if (policy === 'MODERATOR') {
    return role === 'OWNER' || role === 'MODERATOR';
  }
  return role === 'OWNER';
};

const canWriteArticle = (board: BoardDetailResponse | null, authenticated: boolean, siteAdmin: boolean) => {
  if (!authenticated || !board) {
    return false;
  }
  const role = board.memberStatus;
  if (role === 'BANNED' || role === 'PENDING') {
    return false;
  }
  if (siteAdmin) {
    return true;
  }
  return canWriteByPolicy(board.articleWritePolicy, role);
};

const resolveWriteUnavailableReason = (board: BoardDetailResponse | null, authenticated: boolean, siteAdmin: boolean) => {
  if (!authenticated) {
    return translate('board.writePolicy.unavailable.loginRequired');
  }
  if (!board) {
    return translate('board.writePolicy.unavailable.loadingBoard');
  }
  const role = board.memberStatus;
  if (role === 'PENDING') {
    return translate('board.writePolicy.unavailable.pendingApproval');
  }
  if (role === 'BANNED') {
    return translate('board.writePolicy.unavailable.banned');
  }
  if (siteAdmin) {
    return '';
  }
  if (board.articleWritePolicy === 'ALL_AUTHENTICATED') {
    return '';
  }
  if (board.articleWritePolicy === 'MEMBER') {
    return translate('board.writePolicy.unavailable.membersOnly');
  }
  if (board.articleWritePolicy === 'MODERATOR') {
    return translate('board.writePolicy.unavailable.moderatorsOnly');
  }
  return translate('board.writePolicy.unavailable.ownerOnly');
};

export { canWriteArticle, resolveBoardWritePolicyLabel, resolveWriteUnavailableReason };
