import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../stores/auth';
import { useNotificationStore } from '../../stores/notification';
import TopMenuBar from './TopMenuBar.vue';

const USER_TOKEN = 'e30.eyJyb2xlIjoiVVNFUiJ9.sig';

const logoutMock = vi.hoisted(() => vi.fn());
const stopNotificationPresenceMock = vi.hoisted(() => vi.fn());
const applyThemeMock = vi.hoisted(() => vi.fn());
const getThemeStateMock = vi.hoisted(() => vi.fn());
const subscribeThemeChangeMock = vi.hoisted(() => vi.fn());

vi.mock('../../features/auth', () => ({
  logout: logoutMock,
}));

vi.mock('../../features/notification', () => ({
  useNotificationPresence: () => ({
    stopNotificationPresence: stopNotificationPresenceMock,
  }),
}));

vi.mock('../../shared/lib/theme', () => ({
  applyTheme: applyThemeMock,
  getThemeState: getThemeStateMock,
  subscribeThemeChange: subscribeThemeChangeMock,
}));

const createRouterInstance = async (initialPath = '/') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/boards', component: { template: '<div>boards</div>' } },
      { path: '/contents', component: { template: '<div>contents</div>' } },
      { path: '/bookmarks', component: { template: '<div>bookmarks</div>' } },
      { path: '/search', component: { template: '<div>search</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/mypage', component: { template: '<div>mypage</div>' } },
      { path: '/boards/create', component: { template: '<div>create</div>' } },
      { path: '/admin', component: { template: '<div>admin</div>' } },
    ],
  });
  await router.push(initialPath);
  await router.isReady();
  return router;
};

const mountTopMenuBar = async (initialPath = '/', props: Record<string, unknown> = {}) => {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = await createRouterInstance(initialPath);
  const wrapper = mount(TopMenuBar, {
    props,
    global: {
      plugins: [pinia, router],
    },
  });
  await flushPromises();
  return {
    router,
    wrapper,
  };
};

describe('widgets/layout/TopMenuBar', () => {
  beforeEach(() => {
    logoutMock.mockReset();
    logoutMock.mockResolvedValue(undefined);
    applyThemeMock.mockReset();
    getThemeStateMock.mockReset();
    getThemeStateMock.mockReturnValue({ mode: 'system', resolvedTheme: 'light' });
    subscribeThemeChangeMock.mockReset();
    subscribeThemeChangeMock.mockReturnValue(vi.fn());
    stopNotificationPresenceMock.mockReset();
    document.documentElement.classList.remove('dark');
  });

  it('데스크톱 검색 아이콘 버튼을 누르면 통합검색으로 이동한다', async () => {
    // given
    const { router, wrapper } = await mountTopMenuBar('/');

    // when
    await wrapper.get('#global-search').setValue('레이아웃');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    // then
    expect(router.currentRoute.value.path).toBe('/search');
    expect(router.currentRoute.value.query.q).toBe('레이아웃');
    expect(router.currentRoute.value.query.type).toBe('ALL');
  });

  it('모바일 검색 아이콘 버튼을 누르면 검색 페이지로 이동한다', async () => {
    // given
    const { router, wrapper } = await mountTopMenuBar('/');

    // when
    await wrapper.get('[data-testid="mobile-search-button"]').trigger('click');
    await flushPromises();

    // then
    expect(router.currentRoute.value.path).toBe('/search');
  });

  it('비로그인 상단 메뉴는 빠른이동 없이 검색과 핵심 액션만 노출한다', async () => {
    // given
    const { wrapper } = await mountTopMenuBar('/');

    // then
    expect(wrapper.find('nav[aria-label="빠른 이동"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="mobile-search-button"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="desktop-search-button"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="로그인"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="알림"]').exists()).toBe(false);
    expect(wrapper.find('button[aria-label="프로필"]').exists()).toBe(false);
  });

  it('상단 메뉴는 다른 오버레이보다 우선되는 z-index를 유지한다', async () => {
    // given
    const { wrapper } = await mountTopMenuBar('/');

    // then
    expect(wrapper.get('[data-testid="top-menu-bar"]').classes()).toContain('z-50');
  });

  it('스크롤 숨김 상태를 받으면 상단 메뉴를 위로 올린다', async () => {
    // given
    const { wrapper } = await mountTopMenuBar('/', { hiddenByScroll: true });

    // then
    expect(wrapper.get('[data-testid="top-menu-bar"]').classes()).toContain('-translate-y-full');
  });

  it('화이트 계열에서 테마 토글 버튼 클릭 시 다크를 적용한다', async () => {
    // given
    const { wrapper } = await mountTopMenuBar('/');

    // when
    await wrapper.get('[data-testid="theme-toggle-button"]').trigger('click');

    // then
    expect(applyThemeMock).toHaveBeenCalledWith('dark');
  });

  it('다크 계열에서 테마 토글 버튼 클릭 시 화이트를 적용한다', async () => {
    // given
    getThemeStateMock.mockReturnValue({ mode: 'dark', resolvedTheme: 'dark' });
    const { wrapper } = await mountTopMenuBar('/');

    // when
    await wrapper.get('[data-testid="theme-toggle-button"]').trigger('click');

    // then
    expect(applyThemeMock).toHaveBeenCalledWith('light');
  });

  it('인증된 사용자로 마운트되면 알림 realtime을 시작하고 알림 메뉴를 열 때 목록을 불러온다', async () => {
    // given
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore();
    const notificationStore = useNotificationStore();
    authStore.setAccessToken(USER_TOKEN, 60);
    authStore.setProfileSummary({ displayName: '테스터', point: 7 });
    notificationStore.notificationUnreadCount = 1;
    notificationStore.notificationListDirty = true;

    const startRealtimeSpy = vi.spyOn(notificationStore, 'startNotificationRealtime').mockImplementation(() => {});
    const refreshUnreadSpy = vi.spyOn(notificationStore, 'refreshUnreadCount').mockResolvedValue(undefined);
    const loadNotificationsSpy = vi.spyOn(notificationStore, 'loadNotifications').mockResolvedValue(undefined);
    const router = await createRouterInstance('/');

    const wrapper = mount(TopMenuBar, {
      global: {
        plugins: [pinia, router],
      },
    });
    await flushPromises();

    // then
    expect(startRealtimeSpy).toHaveBeenCalled();
    expect(refreshUnreadSpy).toHaveBeenCalled();

    // when
    await wrapper.get('button[aria-label="알림 1개"]').trigger('click');
    await flushPromises();

    // then
    expect(loadNotificationsSpy).toHaveBeenCalled();
  });

  it('프로필 메뉴에서 로그아웃을 누르면 인증 상태를 비운다', async () => {
    // given
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore();
    const notificationStore = useNotificationStore();
    authStore.setAccessToken(USER_TOKEN, 60);
    authStore.setProfileSummary({ displayName: '테스터', point: 7 });

    vi.spyOn(notificationStore, 'startNotificationRealtime').mockImplementation(() => {});
    vi.spyOn(notificationStore, 'refreshUnreadCount').mockResolvedValue(undefined);

    const router = await createRouterInstance('/');
    const wrapper = mount(TopMenuBar, {
      global: {
        plugins: [pinia, router],
      },
    });
    await flushPromises();

    // when
    await wrapper.get('button[aria-label="프로필"]').trigger('click');
    const logoutButton = wrapper.findAll('button').find((button) => button.text().includes('로그아웃'));
    await logoutButton?.trigger('click');
    await flushPromises();

    // then
    expect(logoutMock).toHaveBeenCalled();
    expect(authStore.isAuthenticated).toBe(false);
  });
});
