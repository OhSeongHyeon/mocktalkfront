import { START_LOCATION, createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '../../stores/auth';
import { useAuthPromptStore } from '../../stores/authPrompt';

const LoginPage = () => import('../../pages/LoginPage.vue');
const MainPage = () => import('../../pages/MainPage.vue');
const SettingsPage = () => import('../../pages/SettingsPage.vue');
const MyPage = () => import('../../pages/MyPage.vue');
const OAuthCallbackPage = () => import('../../pages/OAuthCallbackPage.vue');
const RegisterPage = () => import('../../pages/RegisterPage.vue');
const CommunityPage = () => import('../../pages/CommunityPage.vue');
const BoardCreatePage = () => import('../../pages/BoardCreatePage.vue');
const BoardPage = () => import('../../pages/BoardPage.vue');
const BoardSubscribePage = () => import('../../pages/BoardSubscribePage.vue');
const ArticleDetailPage = () => import('../../pages/ArticleDetailPage.vue');
const ArticleCreatePage = () => import('../../pages/ArticleCreatePage.vue');
const ArticleEditPage = () => import('../../pages/ArticleEditPage.vue');
const ArticleBookmarkPage = () => import('../../pages/ArticleBookmarkPage.vue');
const HistoryPage = () => import('../../pages/HistoryPage.vue');
const SearchPage = () => import('../../pages/SearchPage.vue');
const ContentHubPage = () => import('../../pages/ContentHubPage.vue');
const ContentMarketPage = () => import('../../pages/ContentMarketPage.vue');
const AdminBackofficePage = () => import('../../pages/AdminBackofficePage.vue');
const AdminReportsPage = () => import('../../pages/AdminReportsPage.vue');
const AdminSanctionsPage = () => import('../../pages/AdminSanctionsPage.vue');
const AdminAuditLogsPage = () => import('../../pages/AdminAuditLogsPage.vue');
const AdminArticleImportsPage = () => import('../../pages/AdminArticleImportsPage.vue');
const AdminContentMarketPage = () => import('../../pages/AdminContentMarketPage.vue');
const AdminNewsBotPage = () => import('../../pages/AdminNewsBotPage.vue');
const AdminUsersPage = () => import('../../pages/AdminUsersPage.vue');
const AdminBoardsPage = () => import('../../pages/AdminBoardsPage.vue');
const BoardAdminCategoriesPage = () => import('../../pages/BoardAdminCategoriesPage.vue');
const BoardAdminContentsPage = () => import('../../pages/BoardAdminContentsPage.vue');
const BoardAdminMembersPage = () => import('../../pages/BoardAdminMembersPage.vue');
const BoardAdminReportsPage = () => import('../../pages/BoardAdminReportsPage.vue');
const BoardAdminSanctionsPage = () => import('../../pages/BoardAdminSanctionsPage.vue');
const BoardAdminSettingsPage = () => import('../../pages/BoardAdminSettingsPage.vue');

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: MainPage },
    { path: '/settings', name: 'settings', component: SettingsPage },
    { path: '/boards', name: 'boards', component: CommunityPage },
    { path: '/search', name: 'search', component: SearchPage },
    { path: '/contents', name: 'contents', component: ContentHubPage },
    { path: '/contents/market', name: 'content-market', component: ContentMarketPage },
    { path: '/boards/subscribes', name: 'board-subscribes', component: BoardSubscribePage, meta: { requiresAuth: true } },
    { path: '/bookmarks', name: 'bookmarks', component: ArticleBookmarkPage, meta: { requiresAuth: true } },
    { path: '/history', name: 'history', component: HistoryPage, meta: { requiresAuth: true } },
    { path: '/admin', name: 'admin-home', component: AdminBackofficePage, meta: { requiresAuth: true, requiresManagerOrAdmin: true } },
    { path: '/admin/users', name: 'admin-users', component: AdminUsersPage, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/boards', name: 'admin-boards', component: AdminBoardsPage, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/reports', name: 'admin-reports', component: AdminReportsPage, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/sanctions', name: 'admin-sanctions', component: AdminSanctionsPage, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/audit-logs', name: 'admin-audit-logs', component: AdminAuditLogsPage, meta: { requiresAuth: true, requiresAdmin: true } },
    {
      path: '/admin/article-imports',
      name: 'admin-article-imports',
      component: AdminArticleImportsPage,
      meta: { requiresAuth: true, requiresManagerOrAdmin: true },
    },
    {
      path: '/admin/content-market',
      name: 'admin-content-market',
      component: AdminContentMarketPage,
      meta: { requiresAuth: true, requiresManagerOrAdmin: true },
    },
    {
      path: '/admin/news-bot',
      name: 'admin-news-bot',
      component: AdminNewsBotPage,
      meta: { requiresAuth: true, requiresManagerOrAdmin: true },
    },
    { path: '/boards/create', name: 'board-create', component: BoardCreatePage, meta: { requiresAuth: true } },
    { path: '/b/:slug/admin/settings', name: 'board-admin-settings', component: BoardAdminSettingsPage, meta: { requiresAuth: true } },
    { path: '/b/:slug/admin/categories', name: 'board-admin-categories', component: BoardAdminCategoriesPage, meta: { requiresAuth: true } },
    { path: '/b/:slug/admin/contents', name: 'board-admin-contents', component: BoardAdminContentsPage, meta: { requiresAuth: true } },
    { path: '/b/:slug/admin/members', name: 'board-admin-members', component: BoardAdminMembersPage, meta: { requiresAuth: true } },
    { path: '/b/:slug/admin/reports', name: 'board-admin-reports', component: BoardAdminReportsPage, meta: { requiresAuth: true } },
    { path: '/b/:slug/admin/sanctions', name: 'board-admin-sanctions', component: BoardAdminSanctionsPage, meta: { requiresAuth: true } },
    { path: '/b/:slug', name: 'board', component: BoardPage },
    { path: '/b/:slug/articles/new', name: 'article-create', component: ArticleCreatePage, meta: { requiresAuth: true } },
    { path: '/b/:slug/articles/:articleId', name: 'article-detail', component: ArticleDetailPage },
    { path: '/b/:slug/articles/:articleId/edit', name: 'article-edit', component: ArticleEditPage, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/mypage', name: 'mypage', component: MyPage, meta: { requiresAuth: true } },
    { path: '/oauth/callback', name: 'oauth-callback', component: OAuthCallbackPage },
    { path: '/join', name: 'join', component: RegisterPage },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to, from) => {
  const authStore = useAuthStore();
  const authPromptStore = useAuthPromptStore();
  if (to.meta.requiresAuth && !authStore.getAccessToken()) {
    authPromptStore.requestLogin(to.fullPath);
    if (from === START_LOCATION || from.matched.length === 0) {
      return { path: '/', replace: true };
    }
    return false;
  }
  if (to.meta.requiresManagerOrAdmin && !authStore.isManagerOrAdmin) {
    return { path: '/' };
  }
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { path: '/' };
  }
  return true;
});

export default router;
