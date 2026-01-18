import { ref, watch } from 'vue';

const ARTICLE_LIST_PAGE_SIZE_KEY = 'board.articleListPageSize';
const ARTICLE_LIST_PAGE_SIZES = [10, 20, 30, 40, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

type ArticleListPageSize = (typeof ARTICLE_LIST_PAGE_SIZES)[number];

const normalizePageSize = (value: number) =>
  ARTICLE_LIST_PAGE_SIZES.includes(value as ArticleListPageSize) ? (value as ArticleListPageSize) : DEFAULT_PAGE_SIZE;

const readNumber = (key: string, fallback: number) => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const raw = window.localStorage.getItem(key);
  if (raw === null) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
};

const writeNumber = (key: string, value: number) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, String(value));
};

const articleListPageSize = ref<ArticleListPageSize>(normalizePageSize(readNumber(ARTICLE_LIST_PAGE_SIZE_KEY, DEFAULT_PAGE_SIZE)));

const setArticleListPageSize = (value: number) => {
  articleListPageSize.value = normalizePageSize(value) as ArticleListPageSize;
};

watch(articleListPageSize, (value) => writeNumber(ARTICLE_LIST_PAGE_SIZE_KEY, value));

export { ARTICLE_LIST_PAGE_SIZES, articleListPageSize, setArticleListPageSize };
