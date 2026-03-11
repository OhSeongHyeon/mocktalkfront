import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('stores/layout characterization', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('기본값으로 메뉴 접힘 상태와 콘텐츠 폭 프리셋을 초기화한다', async () => {
    // given

    // when
    const layoutStore = await import('./layout');

    // then
    expect(layoutStore.menuCollapsed.value).toBe(false);
    expect(layoutStore.contentWidthPreset.value).toBe('default');
  });

  it('레이아웃 상태를 변경하면 로컬 저장소에 반영한다', async () => {
    // given
    const layoutStore = await import('./layout');

    // when
    layoutStore.setMenuCollapsed(true);
    layoutStore.setContentWidthPreset('wide');
    await nextTick();

    // then
    expect(layoutStore.menuCollapsed.value).toBe(true);
    expect(layoutStore.contentWidthPreset.value).toBe('wide');
    expect(window.localStorage.getItem('layout.menuCollapsed')).toBe('1');
    expect(window.localStorage.getItem('layout.contentWidthPreset')).toBe('wide');
  });

  it('잘못된 폭 저장값은 기본 프리셋으로 보정한다', async () => {
    // given
    window.localStorage.setItem('layout.contentWidthPreset', 'invalid');

    // when
    const layoutStore = await import('./layout');

    // then
    expect(layoutStore.contentWidthPreset.value).toBe('default');
  });
});
