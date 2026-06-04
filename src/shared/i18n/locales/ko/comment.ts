const comment = {
  section: {
    eyebrow: 'Comment',
    title: '댓글',
    total: '총 {count}개',
    placeholder: '댓글을 입력하세요',
    submit: '댓글 등록',
    loginRequired: '댓글 작성은 로그인 후 이용할 수 있습니다.',
    empty: '아직 댓글이 없습니다.',
    loading: '댓글을 불러오는 중입니다...',
    pageSummary: '페이지 {current} / {total}',
    previous: '이전',
    next: '다음',
  },
  item: {
    myComment: '내 댓글',
    articleAuthor: '게시글 작성자',
    edited: '수정 {date}',
    likeAria: '댓글 좋아요',
    dislikeAria: '댓글 싫어요',
    reply: '답글',
    edit: '수정',
    delete: '삭제',
    save: '저장',
    cancel: '취소',
    submitReply: '등록',
    replyPlaceholder: '답글을 입력하세요',
  },
  errors: {
    loadFailed: '댓글을 불러오지 못했습니다.',
    createFailed: '댓글 작성에 실패했습니다.',
    replyFailed: '답글 작성에 실패했습니다.',
    updateFailed: '댓글 수정에 실패했습니다.',
    deleteFailed: '댓글 삭제에 실패했습니다.',
    reactionFailed: '댓글 반응 처리에 실패했습니다.',
  },
} as const;

export default comment;
