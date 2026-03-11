import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from './auth';

const ADMIN_TOKEN = 'e30.eyJyb2xlIjoiQURNSU4ifQ.sig';
const MANAGER_TOKEN = 'e30.eyJyb2xlIjoiTUFOQUdFUiJ9.sig';

describe('stores/auth characterization', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('토큰 설정 시 인증 상태와 관리자 여부를 반영한다', () => {
    // given
    const authStore = useAuthStore();
    authStore.clearAccessToken();

    // when
    authStore.setAccessToken(ADMIN_TOKEN, 60);

    // then
    expect(authStore.getAccessToken()).toBe(ADMIN_TOKEN);
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.isAdmin).toBe(true);
    expect(authStore.isManager).toBe(false);
    expect(authStore.isManagerOrAdmin).toBe(true);
    expect(authStore.accessToken).toBe(ADMIN_TOKEN);
    expect(authStore.accessTokenExpiresAt).not.toBeNull();
    expect(authStore.accessTokenExpiresAt).toBeGreaterThan(Date.now());
  });

  it('매니저 토큰 설정 시 운영 권한 여부를 반영한다', () => {
    // given
    const authStore = useAuthStore();
    authStore.clearAccessToken();

    // when
    authStore.setAccessToken(MANAGER_TOKEN, 60);

    // then
    expect(authStore.isAdmin).toBe(false);
    expect(authStore.isManager).toBe(true);
    expect(authStore.isManagerOrAdmin).toBe(true);
  });

  it('인증/프로필 초기화 시 관련 상태를 모두 비운다', () => {
    // given
    const authStore = useAuthStore();
    authStore.setAccessToken(ADMIN_TOKEN, 60);
    authStore.setProfileImageUrl(' https://cdn.mocktalk.site/avatar.png ');
    authStore.setProfileSummary({ displayName: '테스터', point: 42 });

    // when
    authStore.clearAccessToken();

    // then
    expect(authStore.accessToken).toBeNull();
    expect(authStore.accessTokenExpiresAt).toBeNull();
    expect(authStore.profileImageUrl).toBeNull();
    expect(authStore.displayName).toBeNull();
    expect(authStore.userPoint).toBe(0);
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.isAdmin).toBe(false);
    expect(authStore.isManager).toBe(false);
    expect(authStore.isManagerOrAdmin).toBe(false);
  });
});
