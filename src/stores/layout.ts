import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const MENU_COLLAPSED_KEY = 'layout.menuCollapsed';
const CONTENT_WIDTH_PRESET_KEY = 'layout.contentWidthPreset';
const SIDE_MENU_DISPLAY_MODE_KEY = 'layout.sideMenuDisplayMode';
const CONTENT_WIDTH_PRESETS = ['default', 'comfortable', 'wide', 'full'] as const;
const SIDE_MENU_DISPLAY_MODES = ['collapse', 'hidden'] as const;

type ContentWidthPreset = (typeof CONTENT_WIDTH_PRESETS)[number];
type SideMenuDisplayMode = (typeof SIDE_MENU_DISPLAY_MODES)[number];

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

const useLayoutStore = defineStore('layout', () => {
  const menuCollapsed = ref(readBoolean(MENU_COLLAPSED_KEY, false));
  const contentWidthPreset = ref<ContentWidthPreset>(readContentWidthPreset('wide'));
  const sideMenuDisplayMode = ref<SideMenuDisplayMode>(readSideMenuDisplayMode('collapse'));

  const setMenuCollapsed = (value: boolean) => {
    menuCollapsed.value = value;
  };

  const setContentWidthPreset = (value: ContentWidthPreset) => {
    contentWidthPreset.value = value;
  };

  const setSideMenuDisplayMode = (value: SideMenuDisplayMode) => {
    sideMenuDisplayMode.value = value;
  };

  watch(menuCollapsed, (value) => writeBoolean(MENU_COLLAPSED_KEY, value));
  watch(contentWidthPreset, (value) => writeContentWidthPreset(value));
  watch(sideMenuDisplayMode, (value) => writeSideMenuDisplayMode(value));

  return {
    contentWidthPreset,
    menuCollapsed,
    setContentWidthPreset,
    setMenuCollapsed,
    setSideMenuDisplayMode,
    sideMenuDisplayMode,
  };
});

export { CONTENT_WIDTH_PRESETS, SIDE_MENU_DISPLAY_MODES, useLayoutStore };
export type { ContentWidthPreset, SideMenuDisplayMode };
