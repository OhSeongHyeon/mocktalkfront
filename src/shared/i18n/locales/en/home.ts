const home = {
  articles: {
    title: 'All posts',
    tabs: {
      recent: 'Recent',
      trending: 'Trending',
      recommended: 'For you',
    },
    columns: {
      title: 'Title',
      author: 'Author',
      date: 'Date',
      comments: 'Comments',
      views: 'Views',
      likes: 'Likes',
      trend: 'Trend',
    },
    loadMore: 'Load more',
    empty: 'No posts yet.',
    emptyTrending: 'No trending posts yet.',
    emptyRecommended: 'No recommended posts yet.',
    errors: {
      recent: 'Could not load recent public posts.',
      trending: 'Could not load trending posts.',
      recommended: 'Could not load recommended posts.',
    },
  },
  community: {
    title: 'Public boards',
    more: 'View more',
    empty: 'No boards yet.',
    error: 'Could not load public communities.',
  },
  subscription: {
    title: 'Subscribed boards',
    more: 'View more',
    empty: 'You have no subscribed boards.',
    error: 'Could not load subscriptions.',
  },
} as const;

export default home;
