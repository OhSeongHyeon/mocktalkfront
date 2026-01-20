import { ref, watch } from 'vue';

const ARTICLE_LIST_PAGE_SIZE_KEY = 'board.articleListPageSize';
const ARTICLE_LIST_ORDER_KEY = 'board.articleListOrder';
const ARTICLE_LIST_PAGE_SIZES = [10, 20, 30, 40, 50] as const;
const ARTICLE_LIST_ORDERS = ['LATEST', 'OLDEST'] as const;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_ORDER = 'LATEST';

type ArticleListPageSize = (typeof ARTICLE_LIST_PAGE_SIZES)[number];
type ArticleListOrder = (typeof ARTICLE_LIST_ORDERS)[number];

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

const readString = (key: string, fallback: string) => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const raw = window.localStorage.getItem(key);
  return raw ?? fallback;
};

const writeNumber = (key: string, value: number) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, String(value));
};

const writeString = (key: string, value: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, value);
};

const articleListPageSize = ref<ArticleListPageSize>(normalizePageSize(readNumber(ARTICLE_LIST_PAGE_SIZE_KEY, DEFAULT_PAGE_SIZE)));
const articleListOrder = ref<ArticleListOrder>(
  ARTICLE_LIST_ORDERS.includes(readString(ARTICLE_LIST_ORDER_KEY, DEFAULT_ORDER) as ArticleListOrder)
    ? (readString(ARTICLE_LIST_ORDER_KEY, DEFAULT_ORDER) as ArticleListOrder)
    : DEFAULT_ORDER,
);

const setArticleListPageSize = (value: number) => {
  articleListPageSize.value = normalizePageSize(value) as ArticleListPageSize;
};

watch(articleListPageSize, (value) => writeNumber(ARTICLE_LIST_PAGE_SIZE_KEY, value));
watch(articleListOrder, (value) => writeString(ARTICLE_LIST_ORDER_KEY, value));

const setArticleListOrder = (value: ArticleListOrder) => {
  articleListOrder.value = ARTICLE_LIST_ORDERS.includes(value) ? value : DEFAULT_ORDER;
};

export { ARTICLE_LIST_ORDERS, ARTICLE_LIST_PAGE_SIZES, articleListOrder, articleListPageSize, setArticleListOrder, setArticleListPageSize };
