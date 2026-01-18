import type { NotificationResponse } from '../services/notifications';

const buildSenderLabel = (notification: NotificationResponse) => {
  const name = notification.senderName?.trim() ?? '';
  const handle = notification.senderHandle?.trim() ?? '';
  if (name && handle) {
    return `${name}(@${handle})`;
  }
  if (name) {
    return name;
  }
  if (handle) {
    return `@${handle}`;
  }
  return '';
};

const formatNotificationMessage = (notification: NotificationResponse) => {
  const senderLabel = buildSenderLabel(notification);
  const senderPrefix = senderLabel ? `${senderLabel}님이 ` : '';
  const titleSuffix = notification.articleTitle ? `: ${notification.articleTitle}` : '';

  switch (notification.notiType) {
    case 'ARTICLE_COMMENT':
      return `${senderPrefix}내 게시글에 댓글을 남겼습니다${titleSuffix}`;
    case 'COMMENT_REPLY':
      return `${senderPrefix}내 댓글에 답글을 남겼습니다${titleSuffix}`;
    case 'MENTION':
      return `${senderPrefix}나를 언급했습니다${titleSuffix}`;
    case 'REACTION':
      return `${senderPrefix}내 글에 반응했습니다${titleSuffix}`;
    case 'BOARD_NOTICE':
      return `게시판 공지가 등록되었습니다${titleSuffix}`;
    case 'SYSTEM':
      return '시스템 알림이 도착했습니다.';
    default:
      return '새 알림이 도착했습니다.';
  }
};

export { formatNotificationMessage };
