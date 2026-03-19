import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import { useLayoutStore } from '../../stores/layout';
import AppShell from './AppShell.vue';

const TopMenuBarStub = {
  emits: ['toggle-menu'],
  template: '<button type="button" data-testid="toggle-menu" @click="$emit(\'toggle-menu\')">toggle</button>',
};

const SideMenuBarStub = {
  props: {
    collapsed: { type: Boolean, required: true },
    displayMode: { type: String, required: true },
    mobileOpen: { type: Boolean, required: true },
  },
  emits: ['close'],
  template: `
    <div>
      <div
        data-testid="side-menu"
        :data-collapsed="String(collapsed)"
        :data-display-mode="displayMode"
        :data-mobile-open="String(mobileOpen)"
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
});
