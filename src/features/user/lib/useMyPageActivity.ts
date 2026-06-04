import { computed, ref } from 'vue';
import type { Router } from 'vue-router';

import { deleteAllNotifications, deleteNotification, getNotifications, markNotificationRead } from '../../notification';
import type { NotificationResponse } from '../../notification';
import { getMyArticles, getMyBoards, getMyComments } from '../../../entities/user';
import type { ArticleResponse, CommentResponse, MyBoardResponse, PageResponse } from '../../../entities/user';
import { ApiError } from '../../../shared/lib/http/api';
import { translate } from '../../../shared/i18n/translate';

export type MyPageActivityTab = 'boards' | 'articles' | 'comments' | 'notifications';

const PAGE_SIZE = 10;
const PAGE_WINDOW_SIZE = 10;

const tabMessageKey = (tab: MyPageActivityTab, kind: 'empty' | 'errors') => `myPage.activity.${kind}.${tab}`;

type ActivityFetcher<T> = (page: number, size: number) => Promise<PageResponse<T>>;

const useMyPageActivity = (router: Router) => {
  const activeTab = ref<MyPageActivityTab>('boards');
  const listLoading = ref(false);
  const listError = ref('');
  const boards = ref<PageResponse<MyBoardResponse> | null>(null);
  const articles = ref<PageResponse<ArticleResponse> | null>(null);
  const comments = ref<PageResponse<CommentResponse> | null>(null);
  const notifications = ref<PageResponse<NotificationResponse> | null>(null);
  const boardPage = ref(0);
  const articlePage = ref(0);
  const commentPage = ref(0);
  const notificationPage = ref(0);
  const listRequestSequence = ref(0);

  const beginListRequest = () => {
    listError.value = '';
    listLoading.value = true;
    return ++listRequestSequence.value;
  };

  const isStaleListRequest = (requestId: number) => requestId !== listRequestSequence.value;

  const finishListRequest = (requestId: number) => {
    if (requestId === listRequestSequence.value) {
      listLoading.value = false;
    }
  };

  const runPaginatedLoad = async <T>(
    tab: MyPageActivityTab,
    page: number,
    fetcher: ActivityFetcher<T>,
    assign: (data: PageResponse<T>) => void,
    syncPage: (page: number) => void,
  ) => {
    const requestId = beginListRequest();
    try {
      const data = await fetcher(page, PAGE_SIZE);
      if (isStaleListRequest(requestId)) {
        return;
      }
      assign(data);
      syncPage(data.page);
    } catch (error) {
      if (isStaleListRequest(requestId)) {
        return;
      }
      if (error instanceof ApiError && error.status === 401) {
        await router.push('/login');
        return;
      }
      listError.value = error instanceof ApiError ? error.message : translate(tabMessageKey(tab, 'errors'));
    } finally {
      finishListRequest(requestId);
    }
  };

  const loadBoards = (page = boardPage.value) =>
    runPaginatedLoad(
      'boards',
      page,
      getMyBoards,
      (data) => {
        boards.value = data;
      },
      (nextPage) => {
        boardPage.value = nextPage;
      },
    );

  const loadArticles = (page = articlePage.value) =>
    runPaginatedLoad(
      'articles',
      page,
      getMyArticles,
      (data) => {
        articles.value = data;
      },
      (nextPage) => {
        articlePage.value = nextPage;
      },
    );

  const loadComments = (page = commentPage.value) =>
    runPaginatedLoad(
      'comments',
      page,
      getMyComments,
      (data) => {
        comments.value = data;
      },
      (nextPage) => {
        commentPage.value = nextPage;
      },
    );

  const loadNotifications = (page = notificationPage.value) =>
    runPaginatedLoad(
      'notifications',
      page,
      getNotifications,
      (data) => {
        notifications.value = data;
      },
      (nextPage) => {
        notificationPage.value = nextPage;
      },
    );

  const tabLoaders: Record<MyPageActivityTab, (page?: number) => Promise<void>> = {
    boards: loadBoards,
    articles: loadArticles,
    comments: loadComments,
    notifications: loadNotifications,
  };

  const tabLists: Record<MyPageActivityTab, () => PageResponse<unknown> | null> = {
    boards: () => boards.value,
    articles: () => articles.value,
    comments: () => comments.value,
    notifications: () => notifications.value,
  };

  const tabPages: Record<MyPageActivityTab, () => number> = {
    boards: () => boardPage.value,
    articles: () => articlePage.value,
    comments: () => commentPage.value,
    notifications: () => notificationPage.value,
  };

  const loadActiveTab = async () => {
    await tabLoaders[activeTab.value](tabPages[activeTab.value]());
  };

  const setTab = async (tab: MyPageActivityTab) => {
    if (activeTab.value === tab) {
      return;
    }
    activeTab.value = tab;
    await loadActiveTab();
  };

  const setPage = async (page: number) => {
    if (page < 0) {
      return;
    }
    const data = tabLists[activeTab.value]();
    if (data && data.totalPages > 0 && page >= data.totalPages) {
      return;
    }
    await tabLoaders[activeTab.value](page);
  };

  const currentList = computed(() => tabLists[activeTab.value]());

  const isListEmpty = computed(() => {
    const data = currentList.value;
    return !data || data.items.length === 0;
  });

  const currentTotalPages = computed(() => currentList.value?.totalPages ?? 0);

  const currentPage = computed(() => tabPages[activeTab.value]());

  const showActivityPagination = computed(() => {
    const data = currentList.value;
    if (!data) {
      return false;
    }
    if (data.totalPages > 1) {
      return true;
    }
    return data.hasNext || data.hasPrevious;
  });

  const showActivityPageNumbers = computed(() => currentTotalPages.value > 1);

  const activityPageWindowStart = computed(() => Math.floor(currentPage.value / PAGE_WINDOW_SIZE) * PAGE_WINDOW_SIZE);
  const activityPageWindowEnd = computed(() => Math.min(activityPageWindowStart.value + PAGE_WINDOW_SIZE, currentTotalPages.value));
  const activityPageNumbers = computed(() =>
    Array.from(
      { length: Math.max(activityPageWindowEnd.value - activityPageWindowStart.value, 0) },
      (_, index) => activityPageWindowStart.value + index,
    ),
  );
  const hasPreviousActivityPageWindow = computed(() => activityPageWindowStart.value > 0);
  const hasNextActivityPageWindow = computed(() => activityPageWindowEnd.value < currentTotalPages.value);

  const activityEmptyMessage = computed(() => translate(tabMessageKey(activeTab.value, 'empty')));

  const boardTotalCount = computed(() => boards.value?.totalElements ?? null);
  const articleTotalCount = computed(() => articles.value?.totalElements ?? null);
  const commentTotalCount = computed(() => comments.value?.totalElements ?? null);
  const notificationTotalCount = computed(() => notifications.value?.totalElements ?? null);

  const handlePreviousActivityPageWindow = async () => {
    if (!hasPreviousActivityPageWindow.value) {
      return;
    }
    await setPage(Math.max(activityPageWindowStart.value - 1, 0));
  };

  const handleNextActivityPageWindow = async () => {
    if (!hasNextActivityPageWindow.value) {
      return;
    }
    await setPage(activityPageWindowEnd.value);
  };

  const handleBoardClick = async (item: MyBoardResponse) => {
    if (listLoading.value) {
      return;
    }
    await router.push(`/b/${item.slug}`);
  };

  const handleArticleClick = async (item: ArticleResponse) => {
    if (listLoading.value) {
      return;
    }
    await router.push(`/b/${item.boardSlug}/articles/${item.id}`);
  };

  const handleCommentClick = async (item: CommentResponse) => {
    if (listLoading.value) {
      return;
    }
    await router.push({
      path: `/b/${item.boardSlug}/articles/${item.articleId}`,
      query: { commentId: String(item.id) },
    });
  };

  const handleNotificationClick = async (notification: NotificationResponse) => {
    if (!notification.read) {
      try {
        const updated = await markNotificationRead(notification.id);
        notification.read = updated.read;
      } catch (error) {
        listError.value = error instanceof ApiError ? error.message : translate('myPage.activity.errors.markReadFailed');
      }
    }
    if (notification.redirectUrl) {
      await router.push(notification.redirectUrl);
    }
  };

  const handleDeleteNotification = async (notification: NotificationResponse) => {
    listError.value = '';
    try {
      await deleteNotification(notification.id);
      const currentItems = notifications.value?.items.length ?? 0;
      const nextPage = currentItems <= 1 && notificationPage.value > 0 ? notificationPage.value - 1 : notificationPage.value;
      await loadNotifications(nextPage);
    } catch (error) {
      listError.value = error instanceof ApiError ? error.message : translate('myPage.activity.errors.deleteFailed');
    }
  };

  const handleDeleteAllNotifications = async () => {
    listError.value = '';
    try {
      await deleteAllNotifications();
      await loadNotifications(0);
    } catch (error) {
      listError.value = error instanceof ApiError ? error.message : translate('myPage.activity.errors.deleteFailed');
    }
  };

  return {
    activeTab,
    listLoading,
    listError,
    boards,
    articles,
    comments,
    notifications,
    loadActiveTab,
    setTab,
    setPage,
    currentList,
    isListEmpty,
    currentTotalPages,
    currentPage,
    showActivityPagination,
    showActivityPageNumbers,
    activityPageNumbers,
    hasPreviousActivityPageWindow,
    hasNextActivityPageWindow,
    activityEmptyMessage,
    boardTotalCount,
    articleTotalCount,
    commentTotalCount,
    notificationTotalCount,
    handlePreviousActivityPageWindow,
    handleNextActivityPageWindow,
    handleBoardClick,
    handleArticleClick,
    handleCommentClick,
    handleNotificationClick,
    handleDeleteNotification,
    handleDeleteAllNotifications,
  };
};

export { useMyPageActivity };
