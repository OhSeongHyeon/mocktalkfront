const boardMeta = {
  visibility: {
    option: {
      PUBLIC: '공개',
      GROUP: '구독 멤버만',
      PRIVATE: '소유자만',
      UNLISTED: '운영자만',
    },
    label: {
      PUBLIC: '공개',
      GROUP: '구독형',
      PRIVATE: '비공개',
      UNLISTED: '운영자 전용',
      other: '기타',
    },
  },
  writePolicy: {
    option: {
      ALL_AUTHENTICATED: '로그인 사용자 전체',
      MEMBER: '멤버 이상',
      MODERATOR: '운영진 이상',
      OWNER: '소유자만',
    },
    label: {
      ALL_AUTHENTICATED: '회원 글쓰기',
      MEMBER: '멤버 전용',
      MODERATOR: '운영진 전용',
      OWNER: '개설자 전용',
      unknown: '정책 미정',
    },
    unavailable: {
      loginRequired: '로그인 후 글쓰기가 가능합니다.',
      loadingBoard: '게시판 정보를 확인 중입니다.',
      pendingApproval: '가입 승인 후 글쓰기가 가능합니다.',
      banned: '제재 상태에서는 글을 작성할 수 없습니다.',
      memberOnly: '멤버 이상만 글을 작성할 수 있습니다.',
      moderatorOnly: '운영진 이상만 글을 작성할 수 있습니다.',
      ownerOnly: '게시판 소유자만 글을 작성할 수 있습니다.',
    },
  },
  role: {
    OWNER: '소유',
    MODERATOR: '운영',
  },
  noDescription: '설명이 없습니다.',
} as const;

export default boardMeta;
