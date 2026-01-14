import { ref, watch } from 'vue';

const MENU_COLLAPSED_KEY = 'layout.menuCollapsed';

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

const menuCollapsed = ref(readBoolean(MENU_COLLAPSED_KEY, false));

const setMenuCollapsed = (value: boolean) => {
  menuCollapsed.value = value;
};

watch(menuCollapsed, (value) => writeBoolean(MENU_COLLAPSED_KEY, value));

export { menuCollapsed, setMenuCollapsed };
