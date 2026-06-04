const search = {
  title: 'Search',
  description: 'Find boards, posts, comments, and users in one place.',
  keywordLabel: 'Keyword',
  keywordPlaceholder: 'Boards, posts, comments, users',
  searchButton: 'Search',
  scopeLabel: 'Scope',
  sortLabel: 'Sort',
  pageSizeLabel: 'Page size',
  pageSizeOption: '{count}',
  badge: {
    displayCount: 'Show {count}',
    latest: 'Newest first',
    oldest: 'Oldest first',
  },
  types: {
    ALL: 'All',
    BOARD: 'Boards',
    ARTICLE: 'Posts',
    COMMENT: 'Comments',
    USER: 'Users',
  },
  order: {
    LATEST: 'Newest first',
    OLDEST: 'Oldest first',
  },
  loading: 'Loading search results...',
  errors: {
    failed: 'Search failed.',
  },
  sections: {
    board: 'Boards',
    article: 'Posts',
    comment: 'Comments',
    user: 'Users',
  },
  loadMore: 'Load more',
  emptyResult: 'No results for “{keyword}”.',
  go: 'Open',
  badgeArticle: 'Post',
  badgeUser: 'User',
  filteredTitle: '{type} results',
  filteredDescription: 'Results for the selected scope.',
  resultCount: '{type} · {count}',
  pageNumber: 'Page {page}',
  fallbackTypeLabel: 'Search',
  pagination: {
    first: 'First',
    previousWindow: 'Previous 10',
    nextWindow: 'Next 10',
  },
} as const;

export default search;
