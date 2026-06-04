import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginMock = vi.hoisted(() => vi.fn());
const getMyProfileMock = vi.hoisted(() => vi.fn());
const applyProfileSummaryMock = vi.hoisted(() => vi.fn());

vi.mock('../features/auth', () => ({
  login: loginMock,
}));

vi.mock('../entities/user', () => ({
  getMyProfile: getMyProfileMock,
}));

vi.mock('../shared/lib/profile', () => ({
  applyProfileSummary: applyProfileSummaryMock,
}));

import { i18n } from '../test/plugins';
import LoginPage from './LoginPage.vue';

const createRouterInstance = async (initialPath = '/login') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/mypage', component: { template: '<div>mypage</div>' } },
      { path: '/join', component: { template: '<div>join</div>' } },
      { path: '/boards', component: { template: '<div>boards</div>' } },
      { path: '/search', component: { template: '<div>search</div>' } },
    ],
  });
  await router.push(initialPath);
  await router.isReady();
  return router;
};

describe('pages/LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
    loginMock.mockResolvedValue({
      accessToken: 'token',
      expiresInSec: 3600,
    });
    getMyProfileMock.mockReset();
    getMyProfileMock.mockResolvedValue({
      id: 1,
      loginId: 'tester',
      email: 'tester@mocktalk.local',
      name: '테스터',
      nickname: '테스터',
      point: 0,
      roles: ['USER'],
    });
    applyProfileSummaryMock.mockReset();
  });

  it('redirect query가 있으면 로그인 후 해당 화면으로 이동한다', async () => {
    // given
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = await createRouterInstance('/login?redirect=%2Fmypage');
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [pinia, router, i18n],
      },
    });
    await flushPromises();

    // when
    await wrapper.get('#login-id').setValue('tester');
    await wrapper.get('#login-password').setValue('password');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    // then
    expect(router.currentRoute.value.path).toBe('/mypage');
  });
});
