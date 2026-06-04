import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const applyThemeMock = vi.hoisted(() => vi.fn());
const getThemeStateMock = vi.hoisted(() => vi.fn());
const subscribeThemeChangeMock = vi.hoisted(() => vi.fn());

vi.mock('../shared/lib/theme', () => ({
  applyTheme: applyThemeMock,
  getThemeState: getThemeStateMock,
  subscribeThemeChange: subscribeThemeChangeMock,
}));

import SettingsPage from './SettingsPage.vue';

const mountPage = async () => {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(SettingsPage, {
    global: {
      plugins: [pinia],
      stubs: {
        AppShell: {
          template: '<div><slot /></div>',
        },
        PageContainer: {
          template: '<div><slot /></div>',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('pages/SettingsPage', () => {
  beforeEach(() => {
    applyThemeMock.mockReset();
    getThemeStateMock.mockReset();
    getThemeStateMock.mockReturnValue({ mode: 'system', resolvedTheme: 'light' });
    subscribeThemeChangeMock.mockReset();
    subscribeThemeChangeMock.mockReturnValue(vi.fn());
    window.localStorage.clear();
  });

  it('현재 테마 설정을 요약 영역에 표시한다', async () => {
    // given
    const wrapper = await mountPage();

    // when
    const pageText = wrapper.text();

    // then
    expect(pageText).toContain('테마 모드');
    expect(pageText).toContain('시스템');
    expect(pageText).toContain('현재 적용 테마: 화이트');
  });

  it('다크 테마 옵션을 누르면 공통 테마 유틸을 호출한다', async () => {
    // given
    const wrapper = await mountPage();
    const darkButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('다크') && button.text().includes('항상 어두운 테마로 고정합니다.'));

    // when
    await darkButton?.trigger('click');

    // then
    expect(applyThemeMock).toHaveBeenCalledWith('dark');
  });

  it('상단메뉴 위치를 본문 스크롤로 바꾸면 레이아웃 저장소에 반영한다', async () => {
    // given
    const wrapper = await mountPage();
    const staticButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('본문과 함께 스크롤') && button.text().includes('페이지를 내리면 함께 위로 사라지게'));

    // when
    await staticButton?.trigger('click');

    // then
    expect(window.localStorage.getItem('layout.topMenuPositionMode')).toBe('static');
    expect(window.localStorage.getItem('layout.topMenuVisibilityMode')).toBe('always');
    expect(wrapper.text()).toContain('상단메뉴바 위치 방식');
  });

  it('상단메뉴 노출 방식은 항상 표시 고정 안내만 노출한다', async () => {
    // given
    const wrapper = await mountPage();

    // then
    expect(wrapper.text()).toContain('상단메뉴바 노출');
    expect(wrapper.text()).toContain('항상 표시');
    expect(wrapper.text()).toContain('상단메뉴바는 자동 숨김 없이 계속 표시합니다.');
  });

  it('이전 자동 숨김 저장값이 남아 있어도 항상 표시로 정규화한다', async () => {
    // given
    window.localStorage.setItem('layout.topMenuVisibilityMode', 'auto-hide');
    await mountPage();

    // then
    expect(window.localStorage.getItem('layout.topMenuVisibilityMode')).toBe('always');
  });
});
