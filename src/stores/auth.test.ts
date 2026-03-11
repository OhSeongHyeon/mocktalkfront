import { describe, expect, it } from 'vitest';

import {
  accessToken,
  accessTokenExpiresAt,
  clearAccessToken,
  displayName,
  getAccessToken,
  isAdmin,
  isAuthenticated,
  isManager,
  isManagerOrAdmin,
  profileImageUrl,
  setAccessToken,
  setProfileImageUrl,
  setProfileSummary,
  userPoint,
} from './auth';

const ADMIN_TOKEN = 'e30.eyJyb2xlIjoiQURNSU4ifQ.sig';
const MANAGER_TOKEN = 'e30.eyJyb2xlIjoiTUFOQUdFUiJ9.sig';

describe('stores/auth characterization', () => {
  it('토큰 설정 시 인증 상태와 관리자 여부를 반영한다', () => {
    // given
    clearAccessToken();

    // when
    setAccessToken(ADMIN_TOKEN, 60);

    // then
    expect(getAccessToken()).toBe(ADMIN_TOKEN);
    expect(isAuthenticated.value).toBe(true);
    expect(isAdmin.value).toBe(true);
    expect(isManager.value).toBe(false);
    expect(isManagerOrAdmin.value).toBe(true);
    expect(accessToken.value).toBe(ADMIN_TOKEN);
    expect(accessTokenExpiresAt.value).not.toBeNull();
    expect(accessTokenExpiresAt.value).toBeGreaterThan(Date.now());
  });

  it('매니저 토큰 설정 시 운영 권한 여부를 반영한다', () => {
    // given
    clearAccessToken();

    // when
    setAccessToken(MANAGER_TOKEN, 60);

    // then
    expect(isAdmin.value).toBe(false);
    expect(isManager.value).toBe(true);
    expect(isManagerOrAdmin.value).toBe(true);
  });

  it('인증/프로필 초기화 시 관련 상태를 모두 비운다', () => {
    // given
    setAccessToken(ADMIN_TOKEN, 60);
    setProfileImageUrl(' https://cdn.mocktalk.site/avatar.png ');
    setProfileSummary({ displayName: '테스터', point: 42 });

    // when
    clearAccessToken();

    // then
    expect(accessToken.value).toBeNull();
    expect(accessTokenExpiresAt.value).toBeNull();
    expect(profileImageUrl.value).toBeNull();
    expect(displayName.value).toBeNull();
    expect(userPoint.value).toBe(0);
    expect(isAuthenticated.value).toBe(false);
    expect(isAdmin.value).toBe(false);
    expect(isManager.value).toBe(false);
    expect(isManagerOrAdmin.value).toBe(false);
  });
});
