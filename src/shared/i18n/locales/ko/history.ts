const history = {
  title: '기록',
  description: '최근 열람한 게시글을 확인할 수 있습니다. 이 기록은 브라우저에만 저장됩니다.',
  clearAll: '전체 삭제',
  searchPlaceholder: '제목, 게시판명, 슬러그 검색',
  totalCount: '총 {count}건',
  visitedAt: '방문 {date}',
  empty: '기록이 없습니다.',
  clearModal: {
    title: '기록 전체 삭제',
    description: '기록을 모두 삭제할까요? 삭제한 기록은 복구할 수 없습니다.',
  },
} as const;

export default history;
