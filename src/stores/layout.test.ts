import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('stores/layout characterization', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
    setActivePinia(createPinia());
  });

  it('기본값으로 메뉴 접힘 상태와 콘텐츠 폭 프리셋을 초기화한다', async () => {
    // given

    // when
    const { useLayoutStore } = await import('./layout');
    const layoutStore = useLayoutStore();

    // then
    expect(layoutStore.menuCollapsed).toBe(false);
    expect(layoutStore.contentWidthPreset).toBe('wide');
    expect(layoutStore.sideMenuDisplayMode).toBe('hidden');
    expect(layoutStore.topMenuPositionMode).toBe('fixed');
    expect(layoutStore.topMenuVisibilityMode).toBe('always');
  });

  it('레이아웃 상태를 변경하면 로컬 저장소에 반영한다', async () => {
    // given
    const { useLayoutStore } = await import('./layout');
    const layoutStore = useLayoutStore();

    // when
    layoutStore.setMenuCollapsed(true);
    layoutStore.setContentWidthPreset('comfortable');
    layoutStore.setSideMenuDisplayMode('collapse');
    layoutStore.setTopMenuPositionMode('static');
    layoutStore.setTopMenuVisibilityMode('always');
    await nextTick();

    // then
    expect(layoutStore.menuCollapsed).toBe(true);
    expect(layoutStore.contentWidthPreset).toBe('comfortable');
    expect(layoutStore.sideMenuDisplayMode).toBe('collapse');
    expect(layoutStore.topMenuPositionMode).toBe('static');
    expect(layoutStore.topMenuVisibilityMode).toBe('always');
    expect(window.localStorage.getItem('layout.menuCollapsed')).toBe('1');
    expect(window.localStorage.getItem('layout.contentWidthPreset')).toBe('comfortable');
    expect(window.localStorage.getItem('layout.sideMenuDisplayMode')).toBe('collapse');
    expect(window.localStorage.getItem('layout.topMenuPositionMode')).toBe('static');
    expect(window.localStorage.getItem('layout.topMenuVisibilityMode')).toBe('always');
  });

  it('잘못된 폭 저장값은 기본 프리셋으로 보정한다', async () => {
    // given
    window.localStorage.setItem('layout.contentWidthPreset', 'invalid');

    // when
    const { useLayoutStore } = await import('./layout');
    const layoutStore = useLayoutStore();

    // then
    expect(layoutStore.contentWidthPreset).toBe('wide');
  });

  it('잘못된 사이드메뉴 저장값은 기본 동작으로 보정한다', async () => {
    // given
    window.localStorage.setItem('layout.sideMenuDisplayMode', 'invalid');

    // when
    const { useLayoutStore } = await import('./layout');
    const layoutStore = useLayoutStore();

    // then
    expect(layoutStore.sideMenuDisplayMode).toBe('hidden');
  });

  it('잘못된 상단메뉴 위치 저장값은 기본 동작으로 보정한다', async () => {
    // given
    window.localStorage.setItem('layout.topMenuPositionMode', 'invalid');

    // when
    const { useLayoutStore } = await import('./layout');
    const layoutStore = useLayoutStore();

    // then
    expect(layoutStore.topMenuPositionMode).toBe('fixed');
  });

  it('잘못된 상단메뉴 노출 저장값은 기본 동작으로 보정한다', async () => {
    // given
    window.localStorage.setItem('layout.topMenuVisibilityMode', 'invalid');

    // when
    const { useLayoutStore } = await import('./layout');
    const layoutStore = useLayoutStore();

    // then
    expect(layoutStore.topMenuVisibilityMode).toBe('always');
  });

  it('이전 자동 숨김 저장값도 상단 고정과 항상 표시로 정규화한다', async () => {
    // given
    window.localStorage.setItem('layout.topMenuVisibilityMode', 'auto-hide');
    window.localStorage.setItem('layout.topMenuBehavior', 'auto-hide');

    // when
    const { useLayoutStore } = await import('./layout');
    const layoutStore = useLayoutStore();

    // then
    expect(layoutStore.topMenuPositionMode).toBe('fixed');
    expect(layoutStore.topMenuVisibilityMode).toBe('always');
    expect(window.localStorage.getItem('layout.topMenuVisibilityMode')).toBe('always');
  });
});
