import { createRouter, createWebHistory } from 'vue-router';

import { getAccessToken, isAdmin } from '../stores/auth';

const LoginPage = () => import('../views/LoginPage.vue');
const MainPage = () => import('../views/MainPage.vue');
const MyPage = () => import('../views/MyPage.vue');
const OAuthCallbackPage = () => import('../views/OAuthCallbackPage.vue');
const RegisterPage = () => import('../views/RegisterPage.vue');
const BoardCreatePage = () => import('../views/BoardCreatePage.vue');
const BoardPage = () => import('../views/BoardPage.vue');
const BoardSubscribePage = () => import('../views/BoardSubscribePage.vue');
const ArticleDetailPage = () => import('../views/ArticleDetailPage.vue');
const ArticleCreatePage = () => import('../views/ArticleCreatePage.vue');
const ArticleEditPage = () => import('../views/ArticleEditPage.vue');
const ArticleBookmarkPage = () => import('../views/ArticleBookmarkPage.vue');
const HistoryPage = () => import('../views/HistoryPage.vue');
const SearchPage = () => import('../views/SearchPage.vue');
const AdminReportsPage = () => import('../views/AdminReportsPage.vue');
const AdminSanctionsPage = () => import('../views/AdminSanctionsPage.vue');
const AdminAuditLogsPage = () => import('../views/AdminAuditLogsPage.vue');
const AdminUsersPage = () => import('../views/AdminUsersPage.vue');
const AdminBoardsPage = () => import('../views/AdminBoardsPage.vue');
const BoardAdminCategoriesPage = () => import('../views/BoardAdminCategoriesPage.vue');
const BoardAdminContentsPage = () => import('../views/BoardAdminContentsPage.vue');
const BoardAdminMembersPage = () => import('../views/BoardAdminMembersPage.vue');
const BoardAdminReportsPage = () => import('../views/BoardAdminReportsPage.vue');
const BoardAdminSanctionsPage = () => import('../views/BoardAdminSanctionsPage.vue');
const BoardAdminSettingsPage = () => import('../views/BoardAdminSettingsPage.vue');

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: MainPage },
    { path: '/boards', name: 'boards', component: MainPage },
    { path: '/search', name: 'search', component: SearchPage },
    { path: '/boards/subscribes', name: 'board-subscribes', component: BoardSubscribePage, meta: { requiresAuth: true } },
    { path: '/bookmarks', name: 'bookmarks', component: ArticleBookmarkPage, meta: { requiresAuth: true } },
    { path: '/history', name: 'history', component: HistoryPage, meta: { requiresAuth: true } },
    { path: '/admin/users', name: 'admin-users', component: AdminUsersPage, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/boards', name: 'admin-boards', component: AdminBoardsPage, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/reports', name: 'admin-reports', component: AdminReportsPage, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/sanctions', name: 'admin-sanctions', component: AdminSanctionsPage, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/audit-logs', name: 'admin-audit-logs', component: AdminAuditLogsPage, meta: { requiresAuth: true, requiresAdmin: true } },
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

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !getAccessToken()) {
    return { path: '/login' };
  }
  if (to.meta.requiresAdmin && !isAdmin.value) {
    return { path: '/' };
  }
  return true;
});

export default router;
