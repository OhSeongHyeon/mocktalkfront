type BoardRoleLabelSource = 'OWNER' | 'MODERATOR' | 'MEMBER' | 'PENDING' | 'BANNED' | string;

const resolveBoardSummaryDescription = (description: string | null, fallback = '설명이 없습니다.') => {
  const trimmed = description?.trim();
  return trimmed ? trimmed : fallback;
};

const resolveBoardRoleLabel = (role: BoardRoleLabelSource) => {
  if (role === 'OWNER') {
    return '소유';
  }
  if (role === 'MODERATOR') {
    return '운영';
  }
  return role;
};

export { resolveBoardRoleLabel, resolveBoardSummaryDescription };
