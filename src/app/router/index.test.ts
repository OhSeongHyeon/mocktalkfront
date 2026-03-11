import { beforeEach, describe, expect, it } from 'vitest';

import { clearAccessToken, setAccessToken } from '../../stores/auth';
import router from './index';

const USER_TOKEN = 'e30.eyJyb2xlIjoiVVNFUiJ9.sig';
const MANAGER_TOKEN = 'e30.eyJyb2xlIjoiTUFOQUdFUiJ9.sig';

describe('router guard characterization', () => {
  beforeEach(async () => {
    clearAccessToken();
    await router.push('/');
  });

  it('비인증 사용자가 인증 필요 페이지에 접근하면 로그인 페이지로 이동한다', async () => {
    // given
    clearAccessToken();

    // when
    await router.push('/mypage');

    // then
    expect(router.currentRoute.value.path).toBe('/login');
  });

  it('관리자 권한이 없는 사용자가 관리자 페이지에 접근하면 홈으로 이동한다', async () => {
    // given
    setAccessToken(USER_TOKEN, 60);

    // when
    await router.push('/admin/users');

    // then
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('매니저 권한 사용자는 운영자 전용 임포트 페이지에 접근할 수 있다', async () => {
    // given
    setAccessToken(MANAGER_TOKEN, 60);

    // when
    await router.push('/admin');

    // then
    expect(router.currentRoute.value.path).toBe('/admin');
  });

  it('매니저 권한 사용자는 운영자 전용 임포트 페이지에 접근할 수 있다', async () => {
    // given
    setAccessToken(MANAGER_TOKEN, 60);

    // when
    await router.push('/admin/article-imports');

    // then
    expect(router.currentRoute.value.path).toBe('/admin/article-imports');
  });
});
