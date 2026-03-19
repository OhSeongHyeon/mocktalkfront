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
    expect(layoutStore.sideMenuDisplayMode).toBe('collapse');
    expect(layoutStore.topMenuBehavior).toBe('fixed');
  });

  it('레이아웃 상태를 변경하면 로컬 저장소에 반영한다', async () => {
    // given
    const { useLayoutStore } = await import('./layout');
    const layoutStore = useLayoutStore();

    // when
    layoutStore.setMenuCollapsed(true);
    layoutStore.setContentWidthPreset('comfortable');
    layoutStore.setSideMenuDisplayMode('hidden');
    layoutStore.setTopMenuBehavior('auto-hide');
    await nextTick();

    // then
    expect(layoutStore.menuCollapsed).toBe(true);
    expect(layoutStore.contentWidthPreset).toBe('comfortable');
    expect(layoutStore.sideMenuDisplayMode).toBe('hidden');
    expect(layoutStore.topMenuBehavior).toBe('auto-hide');
    expect(window.localStorage.getItem('layout.menuCollapsed')).toBe('1');
    expect(window.localStorage.getItem('layout.contentWidthPreset')).toBe('comfortable');
    expect(window.localStorage.getItem('layout.sideMenuDisplayMode')).toBe('hidden');
    expect(window.localStorage.getItem('layout.topMenuBehavior')).toBe('auto-hide');
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
    expect(layoutStore.sideMenuDisplayMode).toBe('collapse');
  });

  it('잘못된 상단메뉴 저장값은 기본 동작으로 보정한다', async () => {
    // given
    window.localStorage.setItem('layout.topMenuBehavior', 'invalid');

    // when
    const { useLayoutStore } = await import('./layout');
    const layoutStore = useLayoutStore();

    // then
    expect(layoutStore.topMenuBehavior).toBe('fixed');
  });
});
