import { createRouter, createWebHistory } from 'vue-router';

import LoginPage from '../views/LoginPage.vue';
import MainPage from '../views/MainPage.vue';
import OAuthCallbackPage from '../views/OAuthCallbackPage.vue';
import RegisterPage from '../views/RegisterPage.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: MainPage },
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/oauth/callback', name: 'oauth-callback', component: OAuthCallbackPage },
    { path: '/join', name: 'join', component: RegisterPage },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
