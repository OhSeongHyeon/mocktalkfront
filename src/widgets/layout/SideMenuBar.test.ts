import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';

import { useAuthStore } from '../../stores/auth';
import SideMenuBar from './SideMenuBar.vue';

const createToken = (role: 'USER' | 'MANAGER' | 'ADMIN') => `e30.${btoa(JSON.stringify({ role }))}.sig`;

const createRouterInstance = async (initialPath: string) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/boards', component: { template: '<div>boards</div>' } },
      { path: '/boards/subscribes', component: { template: '<div>subscribes</div>' } },
      { path: '/b/notice', component: { template: '<div>notice</div>' } },
      { path: '/b/inquiry', component: { template: '<div>inquiry</div>' } },
      { path: '/contents', component: { template: '<div>contents</div>' } },
      { path: '/bookmarks', component: { template: '<div>bookmarks</div>' } },
      { path: '/history', component: { template: '<div>history</div>' } },
      { path: '/settings', component: { template: '<div>settings</div>' } },
      { path: '/admin', component: { template: '<div>admin</div>' } },
      { path: '/admin/article-imports', component: { template: '<div>article-imports</div>' } },
      { path: '/admin/content-market', component: { template: '<div>content-market</div>' } },
      { path: '/admin/news-bot', component: { template: '<div>news-bot</div>' } },
      { path: '/admin/users', component: { template: '<div>users</div>' } },
      { path: '/admin/boards', component: { template: '<div>boards-admin</div>' } },
      { path: '/admin/reports', component: { template: '<div>reports</div>' } },
      { path: '/admin/sanctions', component: { template: '<div>sanctions</div>' } },
      { path: '/admin/audit-logs', component: { template: '<div>audit-logs</div>' } },
    ],
  });
  await router.push(initialPath);
  await router.isReady();
  return router;
};

describe('widgets/layout/SideMenuBar', () => {
  it('모바일 오픈 상태에서 배경을 누르면 close 이벤트를 발생시킨다', async () => {
    // given
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = await createRouterInstance('/boards');
    const wrapper = mount(SideMenuBar, {
      props: {
        collapsed: false,
        displayMode: 'collapse',
        mobileOpen: true,
        topMenuPositionMode: 'fixed',
      },
      global: {
        plugins: [pinia, router],
      },
    });

    // when
    await wrapper.get('[data-testid="side-menu-backdrop"]').trigger('click');

    // then
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.get('[data-testid="side-menu-backdrop"]').classes()).toContain('z-30');
    expect(wrapper.get('[data-testid="side-menu-panel"]').classes()).toContain('z-40');
  });

  it('백오피스 경로에서는 관리자 메뉴와 활성 항목을 렌더링한다', async () => {
    // given
    const pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore();
    authStore.setAccessToken(createToken('ADMIN'), 60);
    const router = await createRouterInstance('/admin/reports');
    const wrapper = mount(SideMenuBar, {
      props: {
        collapsed: false,
        displayMode: 'collapse',
        mobileOpen: false,
        topMenuPositionMode: 'fixed',
      },
      global: {
        plugins: [pinia, router],
      },
    });

    // when
    const activeLink = wrapper.find('[aria-current="page"]');

    // then
    expect(wrapper.text()).toContain('메뉴');
    expect(wrapper.text()).toContain('백오피스');
    expect(wrapper.text()).toContain('신고 관리');
    expect(activeLink.text()).toContain('신고 관리');
    expect(activeLink.classes()).toContain('bg-slate-900');
    expect(activeLink.text()).toContain('현재 화면');
  });
});
