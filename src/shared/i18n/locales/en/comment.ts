const comment = {
  section: {
    eyebrow: 'Comment',
    title: 'Comments',
    total: '{count} total',
    placeholder: 'Write a comment',
    submit: 'Post comment',
    loginRequired: 'Sign in to write comments.',
    empty: 'No comments yet.',
    loading: 'Loading comments...',
    pageSummary: 'Page {current} / {total}',
    previous: 'Previous',
    next: 'Next',
  },
  item: {
    myComment: 'My comment',
    articleAuthor: 'Post author',
    edited: 'Edited {date}',
    likeAria: 'Like comment',
    dislikeAria: 'Dislike comment',
    reply: 'Reply',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    submitReply: 'Post',
    replyPlaceholder: 'Write a reply',
  },
  errors: {
    loadFailed: 'Failed to load comments.',
    createFailed: 'Failed to post comment.',
    replyFailed: 'Failed to post reply.',
    updateFailed: 'Failed to update comment.',
    deleteFailed: 'Failed to delete comment.',
    reactionFailed: 'Failed to update comment reaction.',
  },
} as const;

export default comment;
