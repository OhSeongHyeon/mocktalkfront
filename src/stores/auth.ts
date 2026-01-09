import { computed, ref } from 'vue';

const accessToken = ref<string | null>(null);
const accessTokenExpiresAt = ref<number | null>(null);
const profileImageUrl = ref<string | null>(null);
const displayName = ref<string | null>(null);
const userPoint = ref<number>(0);

const isAuthenticated = computed(() => Boolean(accessToken.value));

const getAccessToken = () => accessToken.value;

const setAccessToken = (token: string, expiresInSec: number) => {
  accessToken.value = token;
  accessTokenExpiresAt.value = Date.now() + expiresInSec * 1000;
};

const setProfileImageUrl = (url: string | null) => {
  const trimmed = url?.trim();
  profileImageUrl.value = trimmed && trimmed.length > 0 ? trimmed : null;
};

const setProfileSummary = (payload: { displayName?: string | null; point?: number | null }) => {
  const name = payload.displayName?.trim();
  displayName.value = name && name.length > 0 ? name : null;
  userPoint.value = typeof payload.point === 'number' ? payload.point : 0;
};

const clearAccessToken = () => {
  accessToken.value = null;
  accessTokenExpiresAt.value = null;
  profileImageUrl.value = null;
  displayName.value = null;
  userPoint.value = 0;
};

export {
  accessToken,
  accessTokenExpiresAt,
  clearAccessToken,
  getAccessToken,
  isAuthenticated,
  displayName,
  profileImageUrl,
  setAccessToken,
  setProfileImageUrl,
  setProfileSummary,
  userPoint,
};
