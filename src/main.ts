import { createPinia, setActivePinia } from 'pinia';
import { createApp, watch } from 'vue';
import './style.css';
import 'highlight.js/styles/github.css';
import App from './App.vue';
import router from './app/router';
import { i18n } from './shared/i18n';
import { getMyProfile } from './entities/user';
import { refreshAccessToken } from './features/auth';
import { applyProfileSummary } from './shared/lib/profile';
import { initTheme } from './shared/lib/theme';
import { useAuthStore } from './stores/auth';

const pinia = createPinia();
setActivePinia(pinia);
initTheme();
const authStore = useAuthStore();

const bootstrap = async () => {
  try {
    const token = await refreshAccessToken();
    authStore.setAccessToken(token.accessToken, token.expiresInSec);
    try {
      const profile = await getMyProfile();
      applyProfileSummary(profile);
    } catch {
      // 프로필 자동 조회 실패는 무시
    }
  } catch {
    // 시작 시 토큰 갱신 실패는 무시
  }
  const app = createApp(App);
  app.use(pinia);
  app.use(i18n);
  app.use(router);
  app.mount('#app');
};

bootstrap();

let isLogoutRedirecting = false;

globalThis.addEventListener('auth:logout', () => {
  if (isLogoutRedirecting) {
    return;
  }
  isLogoutRedirecting = true;
  const homeHref = router.resolve({ path: '/' }).href;
  if (typeof window !== 'undefined') {
    window.location.replace(homeHref);
    return;
  }
  if (router.currentRoute.value.path !== '/') {
    void router.push('/');
  }
});

let refreshTimerId: number | null = null;

const scheduleRefresh = () => {
  const expiresAt = authStore.accessTokenExpiresAt;
  if (!expiresAt) {
    if (refreshTimerId !== null) {
      globalThis.clearTimeout(refreshTimerId);
      refreshTimerId = null;
    }
    return;
  }
  const now = Date.now();
  const skewMs = 60_000;
  const delay = Math.max(expiresAt - now - skewMs, 0);
  if (refreshTimerId !== null) {
    globalThis.clearTimeout(refreshTimerId);
  }
  refreshTimerId = globalThis.setTimeout(async () => {
    try {
      const token = await refreshAccessToken();
      authStore.setAccessToken(token.accessToken, token.expiresInSec);
    } catch {
      authStore.clearAccessToken();
      globalThis.dispatchEvent(new CustomEvent('auth:logout'));
    } finally {
      scheduleRefresh();
    }
  }, delay);
};

watch(() => authStore.accessTokenExpiresAt, scheduleRefresh, { immediate: true });

// env 테스트용 정크코드
if ('development' === import.meta.env.MODE) {
  console.log('MODE:', import.meta.env.MODE);
  console.log('DEV:', import.meta.env.DEV);
  console.log('ENV:', import.meta.env);
  console.log('API:', import.meta.env.VITE_API_BASE_URL);
  console.log('API FILE:', import.meta.env.VITE_FILE_BASE_URL);
} else {
  // console.log('모드 프로덕트인듯');
}
