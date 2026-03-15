import { beforeEach, describe, expect, it, vi } from 'vitest';

import { request } from '../../../../shared/lib/http/api';
import { importContentMarketSnapshots, refreshContentMarket } from './adminContentMarketApi';

vi.mock('../../../../shared/lib/http/api', () => ({
  request: vi.fn(),
}));

const requestMock = vi.mocked(request);

describe('features/admin/system/api/adminContentMarketApi contract', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('refreshContentMarket은 즉시 최신화 결과를 반환한다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: {
        executedAt: '2026-03-15T05:00:00.000Z',
        totalCount: 5,
        createdCount: 3,
        updatedCount: 1,
        skippedCount: 1,
        items: [{ instrumentCode: 'USD_KRW', observedAt: '2026-03-15T03:05:00.000Z', status: 'CREATED' }],
      },
    });

    // when
    const response = await refreshContentMarket();

    // then
    expect(requestMock).toHaveBeenCalledWith('/admin/contents/market/refresh', { method: 'POST' });
    expect(response.totalCount).toBe(5);
  });

  it('importContentMarketSnapshots는 통합 파일 임포트 요청을 보낸다', async () => {
    // given
    const file = new File(['instrument_code,observed_at,price_value'], 'market.csv', { type: 'text/csv' });
    requestMock.mockResolvedValue({
      success: true,
      data: {
        executedAt: '2026-03-15T05:00:00.000Z',
        fileName: 'market.csv',
        selectedInstrument: null,
        unifiedFile: true,
        totalCount: 1,
        createdCount: 1,
        updatedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        failures: [],
      },
    });

    // when
    const response = await importContentMarketSnapshots(file);

    // then
    expect(requestMock).toHaveBeenCalledWith('/admin/contents/market/import', {
      method: 'POST',
      body: expect.any(FormData),
    });
    expect(response.unifiedFile).toBe(true);
  });

  it('importContentMarketSnapshots는 종목별 파일 임포트 요청을 보낸다', async () => {
    // given
    const file = new File(['observed_at,price_value'], 'usd.csv', { type: 'text/csv' });
    requestMock.mockResolvedValue({
      success: true,
      data: {
        executedAt: '2026-03-15T05:00:00.000Z',
        fileName: 'usd.csv',
        selectedInstrument: 'USD_KRW',
        unifiedFile: false,
        totalCount: 1,
        createdCount: 0,
        updatedCount: 1,
        skippedCount: 0,
        failedCount: 0,
        failures: [],
      },
    });

    // when
    const response = await importContentMarketSnapshots(file, 'USD_KRW');

    // then
    expect(requestMock).toHaveBeenCalledWith('/admin/contents/market/import?instrument=USD_KRW', {
      method: 'POST',
      body: expect.any(FormData),
    });
    expect(response.selectedInstrument).toBe('USD_KRW');
  });
});
