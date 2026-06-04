import { defineStore } from 'pinia';
import { ref } from 'vue';

const normalizeRequestedPath = (path: string) => {
  if (!path.startsWith('/') || path.startsWith('//') || path === '/login') {
    return '/';
  }
  return path;
};

const useAuthPromptStore = defineStore('authPrompt', () => {
  const isOpen = ref(false);
  const requestedPath = ref('/');

  const requestLogin = (path: string) => {
    requestedPath.value = normalizeRequestedPath(path);
    isOpen.value = true;
  };

  const closePrompt = () => {
    isOpen.value = false;
    requestedPath.value = '/';
  };

  return {
    closePrompt,
    isOpen,
    requestLogin,
    requestedPath,
  };
});

export { useAuthPromptStore };
