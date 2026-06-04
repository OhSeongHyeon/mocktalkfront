import type { NotificationResponse } from '../../features/notification';
import { translate } from '../i18n/translate';

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
  const senderPrefix = senderLabel ? `${senderLabel}${translate('notification.senderSuffix')}` : '';
  const titleSuffix = notification.articleTitle ? translate('notification.titleSuffix', { title: notification.articleTitle }) : '';

  switch (notification.notiType) {
    case 'ARTICLE_COMMENT':
      return translate('notification.articleComment', { prefix: senderPrefix, suffix: titleSuffix });
    case 'COMMENT_REPLY':
      return translate('notification.commentReply', { prefix: senderPrefix, suffix: titleSuffix });
    case 'MENTION':
      return translate('notification.mention', { prefix: senderPrefix, suffix: titleSuffix });
    case 'REACTION':
      return translate('notification.reaction', { prefix: senderPrefix, suffix: titleSuffix });
    case 'BOARD_NOTICE':
      return translate('notification.boardNotice', { suffix: titleSuffix });
    case 'SYSTEM':
      return translate('notification.system');
    default:
      return translate('notification.default');
  }
};

export { formatNotificationMessage };
