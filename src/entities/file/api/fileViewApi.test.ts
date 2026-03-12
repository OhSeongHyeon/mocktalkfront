import { beforeEach, describe, expect, it, vi } from 'vitest';

import { request } from '../../../shared/lib/http/api';
import { issueFileViewUrl } from './fileViewApi';

vi.mock('../../../shared/lib/http/api', () => ({
  request: vi.fn(),
}));

const requestMock = vi.mocked(request);

describe('entities/file/api/fileViewApi', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('issueFileViewUrl은 variant query를 포함해 ticket 발급 API를 호출한다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: {
        viewUrl: '/api/files/15/view?variant=thumb&ticket=fv_test',
        expiresInSec: 30,
        protectedFile: true,
      },
    });

    // when
    const response = await issueFileViewUrl(15, 'thumb');

    // then
    expect(requestMock).toHaveBeenCalledWith('/files/15/view-ticket?variant=thumb', {
      method: 'POST',
    });
    expect(response).toEqual({
      viewUrl: '/api/files/15/view?variant=thumb&ticket=fv_test',
      expiresInSec: 30,
      protectedFile: true,
    });
  });
});
