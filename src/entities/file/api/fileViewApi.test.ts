import { beforeEach, describe, expect, it, vi } from 'vitest';

import { postJson } from '../../../shared/lib/http/api';
import { issueFileViewTicketsBatch, issueFileViewUrl } from './fileViewApi';

vi.mock('../../../shared/lib/http/api', () => ({
  postJson: vi.fn(),
}));

const postJsonMock = vi.mocked(postJson);

describe('entities/file/api/fileViewApi', () => {
  beforeEach(() => {
    postJsonMock.mockReset();
  });

  it('issueFileViewUrl은 variant query를 포함해 ticket 발급 API를 호출한다', async () => {
    // given
    postJsonMock.mockResolvedValue({
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
    expect(postJsonMock).toHaveBeenCalledWith('/files/15/view-ticket?variant=thumb');
    expect(response).toEqual({
      viewUrl: '/api/files/15/view?variant=thumb&ticket=fv_test',
      expiresInSec: 30,
      protectedFile: true,
    });
  });

  it('issueFileViewTicketsBatch는 view-tickets API를 호출하고 결과를 키로 병합한다', async () => {
    // given
    postJsonMock.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            fileId: 31,
            variant: null,
            success: true,
            viewUrl: '/api/files/31/view?ticket=fv_a',
            expiresInSec: 120,
            protectedFile: true,
            errorCode: null,
          },
        ],
      },
    });

    // when
    const results = await issueFileViewTicketsBatch([{ fileId: 31 }]);

    // then
    expect(postJsonMock).toHaveBeenCalledWith('/files/view-tickets', { items: [{ fileId: 31 }] });
    expect(results.get('31:')?.viewUrl).toBe('/api/files/31/view?ticket=fv_a');
  });

  it('issueFileViewTicketsBatch는 100건 초과 시 순차 청크로 호출한다', async () => {
    // given
    const items = Array.from({ length: 101 }, (_, index) => ({ fileId: index + 1 }));
    postJsonMock
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: Array.from({ length: 100 }, (_, index) => ({
            fileId: index + 1,
            variant: null,
            success: true,
            viewUrl: `/api/files/${index + 1}/view?ticket=fv_${index + 1}`,
            expiresInSec: 120,
            protectedFile: true,
            errorCode: null,
          })),
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [
            {
              fileId: 101,
              variant: null,
              success: true,
              viewUrl: '/api/files/101/view?ticket=fv_101',
              expiresInSec: 120,
              protectedFile: true,
              errorCode: null,
            },
          ],
        },
      });

    // when
    const results = await issueFileViewTicketsBatch(items);

    // then
    expect(postJsonMock).toHaveBeenCalledTimes(2);
    expect(postJsonMock.mock.calls[0]?.[1]).toEqual({ items: items.slice(0, 100) });
    expect(postJsonMock.mock.calls[1]?.[1]).toEqual({ items: items.slice(100) });
    expect(results.size).toBe(101);
    expect(results.get('101:')?.viewUrl).toBe('/api/files/101/view?ticket=fv_101');
  });
});
