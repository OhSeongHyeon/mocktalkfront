import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';

import { useAuthPromptStore } from '../../../stores/authPrompt';
import AuthRequiredModal from './AuthRequiredModal.vue';

const createRouterInstance = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } },
    ],
  });
  await router.push('/');
  await router.isReady();
  return router;
};

describe('features/auth/ui/AuthRequiredModal', () => {
  it('로그인하기를 누르면 redirect query를 붙여 로그인 화면으로 이동한다', async () => {
    // given
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = await createRouterInstance();
    const authPromptStore = useAuthPromptStore();
    authPromptStore.requestLogin('/mypage');

    const wrapper = mount(AuthRequiredModal, {
      global: {
        plugins: [pinia, router],
      },
    });
    await flushPromises();

    // when
    const loginButton = wrapper.findAll('button').find((button) => button.text().includes('로그인하기'));
    await loginButton?.trigger('click');
    await flushPromises();

    // then
    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.query.redirect).toBe('/mypage');
    expect(authPromptStore.isOpen).toBe(false);
  });

  it('닫기를 누르면 현재 화면에 머물면서 모달만 닫는다', async () => {
    // given
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = await createRouterInstance();
    const authPromptStore = useAuthPromptStore();
    authPromptStore.requestLogin('/bookmarks');

    const wrapper = mount(AuthRequiredModal, {
      global: {
        plugins: [pinia, router],
      },
    });
    await flushPromises();

    // when
    const closeButton = wrapper.findAll('button').find((button) => button.text().includes('닫기'));
    await closeButton?.trigger('click');
    await flushPromises();

    // then
    expect(router.currentRoute.value.path).toBe('/');
    expect(authPromptStore.isOpen).toBe(false);
  });
});
