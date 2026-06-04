const notification = {
  loginRequired: '로그인이 필요합니다.',
  loadFailed: '알림을 불러오지 못했습니다.',
  markReadFailed: '알림 읽음 처리에 실패했습니다.',
  deleteFailed: '알림 삭제에 실패했습니다.',
  senderSuffix: '님이 ',
  titleSuffix: ': {title}',
  articleComment: '{prefix}내 게시글에 댓글을 남겼습니다{suffix}',
  commentReply: '{prefix}내 댓글에 답글을 남겼습니다{suffix}',
  mention: '{prefix}나를 언급했습니다{suffix}',
  reaction: '{prefix}내 글에 반응했습니다{suffix}',
  boardNotice: '게시판 공지가 등록되었습니다{suffix}',
  system: '시스템 알림이 도착했습니다.',
  default: '새 알림이 도착했습니다.',
} as const;

export default notification;
