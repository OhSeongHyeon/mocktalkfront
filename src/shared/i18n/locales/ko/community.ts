const community = {
  page: {
    eyebrow: 'Boards',
    title: '커뮤니티',
    boardCount: '게시판 {count}개',
    loadingMore: '추가 로딩 중',
    columns: {
      image: '이미지',
      board: '게시판',
      visibility: '공개 범위',
      createdAt: '개설일',
    },
    writePolicy: {
      member: '회원 글쓰기',
      managed: '운영 정책 적용',
    },
    empty: '아직 게시판이 없습니다.',
    loading: '게시판을 불러오는 중입니다.',
    loadingMoreList: '더 불러오는 중...',
    error: '게시판 목록을 불러오지 못했습니다.',
  },
} as const;

export default community;
