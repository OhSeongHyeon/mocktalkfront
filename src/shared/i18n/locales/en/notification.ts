const notification = {
  loginRequired: 'Sign in required.',
  loadFailed: 'Failed to load notifications.',
  markReadFailed: 'Failed to mark notification as read.',
  deleteFailed: 'Failed to delete notification.',
  senderSuffix: '',
  titleSuffix: ': {title}',
  articleComment: '{prefix} commented on your post{suffix}',
  commentReply: '{prefix} replied to your comment{suffix}',
  mention: '{prefix} mentioned you{suffix}',
  reaction: '{prefix} reacted to your post{suffix}',
  boardNotice: 'A board notice was posted{suffix}',
  system: 'A system notification arrived.',
  default: 'You have a new notification.',
} as const;

export default notification;
