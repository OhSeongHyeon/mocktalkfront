import { ref, watch } from 'vue';

const MENU_COLLAPSED_KEY = 'layout.menuCollapsed';
const CONTENT_WIDTH_PRESET_KEY = 'layout.contentWidthPreset';
const CONTENT_WIDTH_PRESETS = ['default', 'wide', 'full'] as const;

type ContentWidthPreset = (typeof CONTENT_WIDTH_PRESETS)[number];

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

const menuCollapsed = ref(readBoolean(MENU_COLLAPSED_KEY, false));
const contentWidthPreset = ref<ContentWidthPreset>(readContentWidthPreset('default'));

const setMenuCollapsed = (value: boolean) => {
  menuCollapsed.value = value;
};

const setContentWidthPreset = (value: ContentWidthPreset) => {
  contentWidthPreset.value = value;
};

watch(menuCollapsed, (value) => writeBoolean(MENU_COLLAPSED_KEY, value));
watch(contentWidthPreset, (value) => writeContentWidthPreset(value));

export { CONTENT_WIDTH_PRESETS, contentWidthPreset, menuCollapsed, setContentWidthPreset, setMenuCollapsed };
export type { ContentWidthPreset };
