const HISTORY_STORAGE_KEY = 'mocktalk:history';
const MAX_HISTORY_ITEMS = 50;

type HistoryItemInput = {
  articleId: number;
  title: string;
  boardSlug: string;
  boardName?: string | null;
  visitedAt?: string;
};

export type HistoryItem = {
  articleId: number;
  title: string;
  boardSlug: string;
  boardName: string | null;
  visitedAt: string;
};

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const sanitizeText = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const normalizeItem = (item: HistoryItemInput): HistoryItem | null => {
  const articleId = Number(item.articleId);
  if (!Number.isFinite(articleId) || articleId <= 0) {
    return null;
  }
  const title = sanitizeText(item.title);
  const boardSlug = sanitizeText(item.boardSlug);
  if (!title || !boardSlug) {
    return null;
  }
  const boardName = sanitizeText(item.boardName ?? '') || null;
  const visitedAt = sanitizeText(item.visitedAt ?? '') || new Date().toISOString();
  return {
    articleId,
    title,
    boardSlug,
    boardName,
    visitedAt,
  };
};

export const getHistoryItems = (): HistoryItem[] => {
  if (!isBrowser()) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => normalizeItem(item as HistoryItemInput))
      .filter((item): item is HistoryItem => Boolean(item));
  } catch {
    return [];
  }
};

const saveHistoryItems = (items: HistoryItem[]) => {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 저장 실패는 조용히 무시한다.
  }
};

export const recordHistoryItem = (input: HistoryItemInput) => {
  const normalized = normalizeItem(input);
  if (!normalized) {
    return;
  }
  const items = getHistoryItems();
  const filtered = items.filter((item) => item.articleId !== normalized.articleId);
  const nextItems = [normalized, ...filtered].slice(0, MAX_HISTORY_ITEMS);
  saveHistoryItems(nextItems);
};

export const removeHistoryItem = (articleId: number) => {
  if (!Number.isFinite(articleId)) {
    return;
  }
  const items = getHistoryItems();
  const nextItems = items.filter((item) => item.articleId !== articleId);
  saveHistoryItems(nextItems);
};

export const clearHistoryItems = () => {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // 저장소 접근 오류는 무시한다.
  }
};
