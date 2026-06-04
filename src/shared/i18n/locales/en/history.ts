const history = {
  title: 'History',
  description: 'Recently viewed posts are listed here. History is stored only in this browser.',
  clearAll: 'Clear all',
  searchPlaceholder: 'Search by title, board name, or slug',
  totalCount: '{count} total',
  visitedAt: 'Visited {date}',
  empty: 'No history yet.',
  clearModal: {
    title: 'Clear all history',
    description: 'Delete all history? Deleted entries cannot be restored.',
  },
} as const;

export default history;
