import { createApp, watch } from 'vue';
import './style.css';
import App from './App.vue';
import router from './router';
import { initTheme } from './lib/theme';
import { refreshAccessToken } from './services/auth';
import { accessTokenExpiresAt, clearAccessToken, setAccessToken } from './stores/auth';

initTheme();

const bootstrap = async () => {
  try {
    const token = await refreshAccessToken();
    setAccessToken(token.accessToken, token.expiresInSec);
  } catch {
    // ignore refresh failures on startup
  }
  createApp(App).use(router).mount('#app');
};

bootstrap();

globalThis.addEventListener('auth:logout', () => {
  if (router.currentRoute.value.path !== '/') {
    router.push('/');
  }
});

let refreshTimerId: number | null = null;

const scheduleRefresh = () => {
  const expiresAt = accessTokenExpiresAt.value;
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
      setAccessToken(token.accessToken, token.expiresInSec);
    } catch {
      clearAccessToken();
      globalThis.dispatchEvent(new CustomEvent('auth:logout'));
    } finally {
      scheduleRefresh();
    }
  }, delay);
};

watch(accessTokenExpiresAt, scheduleRefresh, { immediate: true });

// env 테스트용 정크코드
if ('development' === import.meta.env.MODE) {
  console.log('MODE:', import.meta.env.MODE);
  console.log('DEV:', import.meta.env.DEV);
  console.log('ENV:', import.meta.env);
  console.log('API:', import.meta.env.VITE_API_BASE_URL);
} else {
  console.log('모드 프로덕트인듯');
}
