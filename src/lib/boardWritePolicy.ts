import type { BoardDetailResponse, BoardMemberStatus } from '../entities/board';

export type BoardArticleWritePolicy = 'ALL_AUTHENTICATED' | 'MEMBER' | 'MODERATOR' | 'OWNER';

interface WritePolicyOption {
  value: BoardArticleWritePolicy;
  label: string;
}

const BOARD_ARTICLE_WRITE_POLICY_OPTIONS: WritePolicyOption[] = [
  { value: 'ALL_AUTHENTICATED', label: '로그인 사용자 전체' },
  { value: 'MEMBER', label: '멤버 이상' },
  { value: 'MODERATOR', label: '운영진 이상' },
  { value: 'OWNER', label: '소유자만' },
];

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
    return '로그인 후 글쓰기가 가능합니다.';
  }
  if (!board) {
    return '게시판 정보를 확인 중입니다.';
  }
  const role = board.memberStatus;
  if (role === 'PENDING') {
    return '가입 승인 후 글쓰기가 가능합니다.';
  }
  if (role === 'BANNED') {
    return '제재 상태에서는 글을 작성할 수 없습니다.';
  }
  if (siteAdmin) {
    return '';
  }
  if (board.articleWritePolicy === 'ALL_AUTHENTICATED') {
    return '';
  }
  if (board.articleWritePolicy === 'MEMBER') {
    return '멤버 이상만 글을 작성할 수 있습니다.';
  }
  if (board.articleWritePolicy === 'MODERATOR') {
    return '운영진 이상만 글을 작성할 수 있습니다.';
  }
  return '게시판 소유자만 글을 작성할 수 있습니다.';
};

export { BOARD_ARTICLE_WRITE_POLICY_OPTIONS, canWriteArticle, resolveWriteUnavailableReason };
