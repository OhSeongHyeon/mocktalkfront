const home = {
  articles: {
    title: '전체글',
    tabs: {
      recent: '최신',
      trending: '트렌딩',
      recommended: '추천',
    },
    columns: {
      title: '제목',
      author: '글쓴이',
      date: '날짜',
      comments: '댓글',
      views: '조회',
      likes: '추천',
      trend: '트렌드',
    },
    loadMore: '더보기',
    empty: '글이 없습니다.',
    emptyTrending: '트렌딩 글이 없습니다.',
    emptyRecommended: '추천 글이 없습니다.',
    errors: {
      recent: '공개 최신글을 불러오지 못했습니다.',
      trending: '트렌딩 글을 불러오지 못했습니다.',
      recommended: '추천 글을 불러오지 못했습니다.',
    },
  },
  community: {
    title: '공개 게시판',
    more: '더보기',
    empty: '게시판이 없습니다.',
    error: '공개 커뮤니티를 불러오지 못했습니다.',
  },
  subscription: {
    title: '구독 게시판',
    more: '더보기',
    empty: '구독한 게시판이 없습니다.',
    error: '구독 목록을 불러오지 못했습니다.',
  },
} as const;

export default home;
