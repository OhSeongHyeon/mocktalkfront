import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const MENU_COLLAPSED_KEY = 'layout.menuCollapsed';
const CONTENT_WIDTH_PRESET_KEY = 'layout.contentWidthPreset';
const SIDE_MENU_DISPLAY_MODE_KEY = 'layout.sideMenuDisplayMode';
const TOP_MENU_POSITION_MODE_KEY = 'layout.topMenuPositionMode';
const TOP_MENU_VISIBILITY_MODE_KEY = 'layout.topMenuVisibilityMode';
const LEGACY_TOP_MENU_BEHAVIOR_KEY = 'layout.topMenuBehavior';
const CONTENT_WIDTH_PRESETS = ['default', 'comfortable', 'wide', 'full'] as const;
const SIDE_MENU_DISPLAY_MODES = ['collapse', 'hidden'] as const;
const TOP_MENU_POSITION_MODES = ['fixed', 'static'] as const;
const TOP_MENU_VISIBILITY_MODES = ['always'] as const;

type ContentWidthPreset = (typeof CONTENT_WIDTH_PRESETS)[number];
type SideMenuDisplayMode = (typeof SIDE_MENU_DISPLAY_MODES)[number];
type TopMenuPositionMode = (typeof TOP_MENU_POSITION_MODES)[number];
type TopMenuVisibilityMode = (typeof TOP_MENU_VISIBILITY_MODES)[number];

const readBoolean = (key: string, fallback: boolean) => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const raw = window.localStorage.getItem(key);
  if (raw === null) {
    return fallback;
  }
  return raw === '1' || raw === 'true';
};

const writeBoolean = (key: string, value: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, value ? '1' : '0');
};

const isContentWidthPreset = (value: string): value is ContentWidthPreset => (CONTENT_WIDTH_PRESETS as readonly string[]).includes(value);
const isSideMenuDisplayMode = (value: string): value is SideMenuDisplayMode => (SIDE_MENU_DISPLAY_MODES as readonly string[]).includes(value);

const readContentWidthPreset = (fallback: ContentWidthPreset) => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const raw = window.localStorage.getItem(CONTENT_WIDTH_PRESET_KEY);
  if (!raw) {
    return fallback;
  }
  return isContentWidthPreset(raw) ? raw : fallback;
};

const writeContentWidthPreset = (value: ContentWidthPreset) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(CONTENT_WIDTH_PRESET_KEY, value);
};

const readSideMenuDisplayMode = (fallback: SideMenuDisplayMode) => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const raw = window.localStorage.getItem(SIDE_MENU_DISPLAY_MODE_KEY);
  if (!raw) {
    return fallback;
  }
  return isSideMenuDisplayMode(raw) ? raw : fallback;
};

const writeSideMenuDisplayMode = (value: SideMenuDisplayMode) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(SIDE_MENU_DISPLAY_MODE_KEY, value);
};

const isTopMenuPositionMode = (value: string): value is TopMenuPositionMode => (TOP_MENU_POSITION_MODES as readonly string[]).includes(value);
const isTopMenuVisibilityMode = (value: string): value is TopMenuVisibilityMode => (TOP_MENU_VISIBILITY_MODES as readonly string[]).includes(value);

const readLegacyTopMenuBehavior = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(LEGACY_TOP_MENU_BEHAVIOR_KEY);
  if (!raw) {
    return null;
  }
  return raw === 'fixed' || raw === 'auto-hide' ? raw : null;
};

const readTopMenuPositionMode = (fallback: TopMenuPositionMode) => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const raw = window.localStorage.getItem(TOP_MENU_POSITION_MODE_KEY);
  if (raw) {
    return isTopMenuPositionMode(raw) ? raw : fallback;
  }
  return readLegacyTopMenuBehavior() ? 'fixed' : fallback;
};

const writeTopMenuPositionMode = (value: TopMenuPositionMode) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(TOP_MENU_POSITION_MODE_KEY, value);
};

const readTopMenuVisibilityMode = (fallback: TopMenuVisibilityMode) => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const raw = window.localStorage.getItem(TOP_MENU_VISIBILITY_MODE_KEY);
  if (raw) {
    return isTopMenuVisibilityMode(raw) ? raw : fallback;
  }
  return fallback;
};

const writeTopMenuVisibilityMode = (value: TopMenuVisibilityMode) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(TOP_MENU_VISIBILITY_MODE_KEY, value);
};

const useLayoutStore = defineStore('layout', () => {
  const menuCollapsed = ref(readBoolean(MENU_COLLAPSED_KEY, false));
  const contentWidthPreset = ref<ContentWidthPreset>(readContentWidthPreset('wide'));
  const sideMenuDisplayMode = ref<SideMenuDisplayMode>(readSideMenuDisplayMode('hidden'));
  const topMenuPositionMode = ref<TopMenuPositionMode>(readTopMenuPositionMode('fixed'));
  const topMenuVisibilityMode = ref<TopMenuVisibilityMode>(readTopMenuVisibilityMode('always'));

  writeTopMenuVisibilityMode('always');

  const setMenuCollapsed = (value: boolean) => {
    menuCollapsed.value = value;
  };

  const setContentWidthPreset = (value: ContentWidthPreset) => {
    contentWidthPreset.value = value;
  };

  const setSideMenuDisplayMode = (value: SideMenuDisplayMode) => {
    sideMenuDisplayMode.value = value;
  };

  const setTopMenuPositionMode = (value: TopMenuPositionMode) => {
    topMenuPositionMode.value = value;
  };

  const setTopMenuVisibilityMode = (value: TopMenuVisibilityMode) => {
    void value;
    topMenuVisibilityMode.value = 'always';
  };

  watch(menuCollapsed, (value) => writeBoolean(MENU_COLLAPSED_KEY, value));
  watch(contentWidthPreset, (value) => writeContentWidthPreset(value));
  watch(sideMenuDisplayMode, (value) => writeSideMenuDisplayMode(value));
  watch(topMenuPositionMode, (value) => writeTopMenuPositionMode(value));
  watch(topMenuVisibilityMode, (value) => writeTopMenuVisibilityMode(value));

  return {
    contentWidthPreset,
    menuCollapsed,
    setContentWidthPreset,
    setMenuCollapsed,
    setSideMenuDisplayMode,
    setTopMenuPositionMode,
    setTopMenuVisibilityMode,
    sideMenuDisplayMode,
    topMenuPositionMode,
    topMenuVisibilityMode,
  };
});

export { CONTENT_WIDTH_PRESETS, SIDE_MENU_DISPLAY_MODES, TOP_MENU_POSITION_MODES, TOP_MENU_VISIBILITY_MODES, useLayoutStore };
export type { ContentWidthPreset, SideMenuDisplayMode, TopMenuPositionMode, TopMenuVisibilityMode };
