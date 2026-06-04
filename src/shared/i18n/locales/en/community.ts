const community = {
  page: {
    eyebrow: 'Boards',
    title: 'Communities',
    boardCount: '{count} boards',
    loadingMore: 'Loading more',
    columns: {
      image: 'Image',
      board: 'Board',
      visibility: 'Visibility',
      createdAt: 'Created',
    },
    writePolicy: {
      member: 'Members can post',
      managed: 'Managed policy',
    },
    empty: 'No boards yet.',
    loading: 'Loading boards...',
    loadingMoreList: 'Loading more...',
    error: 'Could not load board list.',
  },
} as const;

export default community;
