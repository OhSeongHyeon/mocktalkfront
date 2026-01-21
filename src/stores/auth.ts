import { computed, ref } from 'vue';

const accessToken = ref<string | null>(null);
const accessTokenExpiresAt = ref<number | null>(null);
const profileImageUrl = ref<string | null>(null);
const displayName = ref<string | null>(null);
const userPoint = ref<number>(0);

const isAuthenticated = computed(() => Boolean(accessToken.value));

const getAccessToken = () => accessToken.value;

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
};

const parseTokenPayload = (token: string | null) => {
  if (!token) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const payloadSegment = parts[1];
    if (!payloadSegment) {
      return null;
    }
    const decoded = decodeBase64Url(payloadSegment);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const userRole = computed(() => {
  const payload = parseTokenPayload(accessToken.value);
  const role = payload?.role;
  return typeof role === 'string' ? role : null;
});

const isAdmin = computed(() => userRole.value === 'ADMIN');

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
  isAdmin,
  userRole,
  displayName,
  profileImageUrl,
  setAccessToken,
  setProfileImageUrl,
  setProfileSummary,
  userPoint,
};
