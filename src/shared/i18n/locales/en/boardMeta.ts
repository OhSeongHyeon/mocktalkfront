const boardMeta = {
  visibility: {
    option: {
      PUBLIC: 'Public',
      GROUP: 'Subscribers only',
      PRIVATE: 'Owner only',
      UNLISTED: 'Operators only',
    },
    label: {
      PUBLIC: 'Public',
      GROUP: 'Subscription',
      PRIVATE: 'Private',
      UNLISTED: 'Staff only',
      other: 'Other',
    },
  },
  writePolicy: {
    option: {
      ALL_AUTHENTICATED: 'All signed-in users',
      MEMBER: 'Members and above',
      MODERATOR: 'Moderators and above',
      OWNER: 'Owner only',
    },
    label: {
      ALL_AUTHENTICATED: 'Members can post',
      MEMBER: 'Members only',
      MODERATOR: 'Moderators only',
      OWNER: 'Creator only',
      unknown: 'Policy unset',
    },
    unavailable: {
      loginRequired: 'Log in to write posts.',
      loadingBoard: 'Loading board information.',
      pendingApproval: 'You can post after membership is approved.',
      banned: 'You cannot post while sanctioned.',
      memberOnly: 'Only members and above can post.',
      moderatorOnly: 'Only moderators and above can post.',
      ownerOnly: 'Only the board owner can post.',
    },
  },
  role: {
    OWNER: 'Owner',
    MODERATOR: 'Mod',
  },
  noDescription: 'No description.',
} as const;

export default boardMeta;
