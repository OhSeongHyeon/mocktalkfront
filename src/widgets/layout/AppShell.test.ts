import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import { useLayoutStore } from '../../stores/layout';
import AppShell from './AppShell.vue';

const TopMenuBarStub = {
  props: {
    hiddenByScroll: { type: Boolean, default: false },
  },
  emits: ['toggle-menu'],
  template:
    '<button type="button" data-testid="toggle-menu" :data-hidden-by-scroll="String(hiddenByScroll)" @click="$emit(\'toggle-menu\')">toggle</button>',
};

const SideMenuBarStub = {
  props: {
    collapsed: { type: Boolean, required: true },
    displayMode: { type: String, required: true },
    mobileOpen: { type: Boolean, required: true },
    topMenuPositionMode: { type: String, required: true },
  },
  emits: ['close'],
  template: `
    <div>
      <div
        data-testid="side-menu"
        :data-collapsed="String(collapsed)"
        :data-display-mode="displayMode"
        :data-mobile-open="String(mobileOpen)"
        :data-top-menu-position-mode="topMenuPositionMode"
      />
      <button type="button" data-testid="close-mobile" @click="$emit('close')">close</button>
    </div>
  `,
};

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
    writable: true,
  });
};

describe('widgets/layout/AppShell', () => {
  beforeEach(() => {
    const layoutStore = useLayoutStore();
    layoutStore.setMenuCollapsed(false);
    layoutStore.setSideMenuDisplayMode('collapse');
    layoutStore.setTopMenuPositionMode('fixed');
    layoutStore.setTopMenuVisibilityMode('always');
    setViewportWidth(1280);
  });

  it('데스크톱에서는 메뉴 버튼 클릭 시 접힘 상태를 토글한다', async () => {
    // given
    const layoutStore = useLayoutStore();
    const wrapper = mount(AppShell, {
      global: {
        stubs: {
          SideMenuBar: SideMenuBarStub,
          TopMenuBar: TopMenuBarStub,
        },
      },
    });

    // when
    await wrapper.get('[data-testid="toggle-menu"]').trigger('click');

    // then
    expect(layoutStore.menuCollapsed).toBe(true);
    expect(wrapper.get('[data-testid="side-menu"]').attributes('data-collapsed')).toBe('true');
    expect(wrapper.get('[data-testid="side-menu"]').attributes('data-mobile-open')).toBe('false');
    expect(wrapper.find('[data-testid="layout-main-frame"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="layout-main-frame"]').classes()).not.toContain('max-w-[1280px]');
    expect(wrapper.get('main').classes()).not.toContain('rounded-[0.8rem]');
    expect(wrapper.get('main').classes()).not.toContain('border');
  });

  it('모바일에서는 메뉴 버튼이 오프캔버스 상태만 토글하고 close 이벤트로 닫힌다', async () => {
    // given
    const layoutStore = useLayoutStore();
    setViewportWidth(480);
    const wrapper = mount(AppShell, {
      global: {
        stubs: {
          SideMenuBar: SideMenuBarStub,
          TopMenuBar: TopMenuBarStub,
        },
      },
    });

    // when
    await wrapper.get('[data-testid="toggle-menu"]').trigger('click');

    // then
    expect(layoutStore.menuCollapsed).toBe(false);
    expect(wrapper.get('[data-testid="side-menu"]').attributes('data-mobile-open')).toBe('true');

    // when
    await wrapper.get('[data-testid="close-mobile"]').trigger('click');

    // then
    expect(wrapper.get('[data-testid="side-menu"]').attributes('data-mobile-open')).toBe('false');
  });

  it('화면 상단 고정 모드에서는 뷰포트 높이를 고정하고 상단메뉴를 항상 표시한다', async () => {
    // given
    const wrapper = mount(AppShell, {
      global: {
        stubs: {
          SideMenuBar: SideMenuBarStub,
          TopMenuBar: TopMenuBarStub,
        },
      },
    });
    const mainElement = wrapper.get('main').element as HTMLElement;
    Object.defineProperty(mainElement, 'scrollTop', {
      configurable: true,
      value: 0,
      writable: true,
    });

    // when
    mainElement.scrollTop = 80;
    await wrapper.get('main').trigger('scroll');

    // then
    expect(wrapper.get('[data-testid="app-shell"]').classes()).toContain('h-screen');
    expect(wrapper.get('[data-testid="app-shell"]').classes()).toContain('overflow-hidden');
    expect(wrapper.get('[data-testid="top-menu-wrapper"]').classes()).toContain('h-[3.75rem]');
    expect(wrapper.get('[data-testid="toggle-menu"]').attributes('data-hidden-by-scroll')).toBe('false');

    // when
    mainElement.scrollTop = 10;
    await wrapper.get('main').trigger('scroll');

    // then
    expect(wrapper.get('[data-testid="top-menu-wrapper"]').classes()).toContain('h-[3.75rem]');
    expect(wrapper.get('[data-testid="toggle-menu"]').attributes('data-hidden-by-scroll')).toBe('false');
  });

  it('상단메뉴를 본문과 함께 스크롤로 바꾸면 헤더를 스크롤 영역 안에 렌더링한다', async () => {
    // given
    const layoutStore = useLayoutStore();
    layoutStore.setTopMenuPositionMode('static');
    const wrapper = mount(AppShell, {
      global: {
        stubs: {
          SideMenuBar: SideMenuBarStub,
          TopMenuBar: TopMenuBarStub,
        },
      },
    });
    // then
    expect(wrapper.get('[data-testid="app-shell"]').classes()).toContain('min-h-screen');
    expect(wrapper.get('[data-testid="app-shell"]').classes()).not.toContain('h-screen');
    expect(wrapper.find('[data-testid="top-menu-wrapper"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="top-menu-inline"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="toggle-menu"]').attributes('data-hidden-by-scroll')).toBe('false');
    expect(wrapper.get('[data-testid="side-menu"]').attributes('data-top-menu-position-mode')).toBe('static');
  });
});
