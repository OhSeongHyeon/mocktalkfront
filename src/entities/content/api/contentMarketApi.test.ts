import { beforeEach, describe, expect, it, vi } from 'vitest';

import { request } from '../../../shared/lib/http/api';
import { getMarketOverview, getMarketSeries } from './contentMarketApi';

vi.mock('../../../shared/lib/http/api', () => ({
  request: vi.fn(),
}));

const requestMock = vi.mocked(request);

describe('entities/content/api/contentMarketApi contract', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('getMarketOverview는 환율/금 시세 요약 목록을 반환한다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: {
        lastObservedAt: '2026-03-15T03:05:00.000Z',
        items: [
          {
            instrumentCode: 'USD_KRW',
            displayName: 'USD/KRW',
            marketGroup: 'FX',
            baseCurrency: 'USD',
            quoteCurrency: 'KRW',
            unitLabel: '원',
            priceValue: 1450.12,
            changeValue: 10.5,
            changeRate: 0.729,
            observedAt: '2026-03-15T03:05:00.000Z',
          },
        ],
      },
    });

    // when
    const response = await getMarketOverview();

    // then
    expect(requestMock).toHaveBeenCalledWith('/contents/market/overview');
    expect(response.items[0]).toMatchObject({
      instrumentCode: 'USD_KRW',
      marketGroup: 'FX',
      priceValue: 1450.12,
    });
  });

  it('getMarketSeries는 선택한 종목과 기간의 시계열을 반환한다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: {
        instrumentCode: 'XAU_USD',
        displayName: '금 시세 (USD)',
        marketGroup: 'METAL',
        unitLabel: '달러',
        period: 'WEEK',
        lastObservedAt: '2026-03-15T03:05:00.000Z',
        points: [
          { timestamp: '2026-03-10T03:05:00.000Z', value: 2990.0 },
          { timestamp: '2026-03-15T03:05:00.000Z', value: 3012.12 },
        ],
      },
    });

    // when
    const response = await getMarketSeries('XAU_USD', 'WEEK');

    // then
    expect(requestMock).toHaveBeenCalledWith('/contents/market/series?instrument=XAU_USD&period=WEEK');
    expect(response.points[1]).toMatchObject({ value: 3012.12 });
  });
});
