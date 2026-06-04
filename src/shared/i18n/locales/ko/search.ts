const search = {
  title: '통합검색',
  description: '게시판, 게시글, 댓글, 사용자를 같은 밀도로 한 번에 찾을 수 있습니다.',
  keywordLabel: '검색어',
  keywordPlaceholder: '게시판, 게시글, 댓글, 사용자',
  searchButton: '검색',
  scopeLabel: '검색 범위',
  sortLabel: '정렬',
  pageSizeLabel: '표시 개수',
  pageSizeOption: '{count}개',
  badge: {
    displayCount: '표시 {count}개',
    latest: '최신순',
    oldest: '과거순',
  },
  types: {
    ALL: '전체',
    BOARD: '게시판',
    ARTICLE: '게시글',
    COMMENT: '댓글',
    USER: '사용자',
  },
  order: {
    LATEST: '최신순',
    OLDEST: '과거순',
  },
  loading: '검색 결과를 불러오는 중입니다...',
  errors: {
    failed: '검색에 실패했습니다.',
  },
  sections: {
    board: '게시판',
    article: '게시글',
    comment: '댓글',
    user: '사용자',
  },
  loadMore: '더보기',
  emptyResult: '‘{keyword}’ 검색 결과가 없습니다.',
  go: '이동',
  badgeArticle: '게시글',
  badgeUser: '사용자',
  filteredTitle: '{type} 검색 결과',
  filteredDescription: '현재 선택한 범위의 검색 결과입니다.',
  resultCount: '{type} {count}건',
  pageNumber: '페이지 {page}',
  fallbackTypeLabel: '검색',
  pagination: {
    first: '처음',
    previousWindow: '이전 10',
    nextWindow: '다음 10',
  },
} as const;

export default search;
