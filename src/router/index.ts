import { createRouter, createWebHistory } from 'vue-router';

import LoginPage from '../views/LoginPage.vue';
import MainPage from '../views/MainPage.vue';
import MyPage from '../views/MyPage.vue';
import OAuthCallbackPage from '../views/OAuthCallbackPage.vue';
import RegisterPage from '../views/RegisterPage.vue';
import BoardCreatePage from '../views/BoardCreatePage.vue';
import BoardPage from '../views/BoardPage.vue';
import ArticleDetailPage from '../views/ArticleDetailPage.vue';
import ArticleCreatePage from '../views/ArticleCreatePage.vue';
import ArticleEditPage from '../views/ArticleEditPage.vue';
import { getAccessToken } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: MainPage },
    { path: '/boards/create', name: 'board-create', component: BoardCreatePage, meta: { requiresAuth: true } },
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
  return true;
});

export default router;
