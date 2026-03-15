import { request } from '../../../shared/lib/http/api';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: unknown;
}

export type MarketGroup = 'FX' | 'METAL';
export type MarketInstrumentCode = 'USD_KRW' | 'EUR_KRW' | 'JPY_KRW' | 'XAU_USD' | 'XAU_KRW';
export type MarketSeriesPeriod = 'WEEK' | 'MONTH';

export interface MarketOverviewItemResponse {
  instrumentCode: MarketInstrumentCode;
  displayName: string;
  marketGroup: MarketGroup;
  baseCurrency: string;
  quoteCurrency: string;
  unitLabel: string;
  priceValue: number;
  changeValue: number | null;
  changeRate: number | null;
  observedAt: string;
}

export interface MarketOverviewResponse {
  lastObservedAt: string | null;
  items: MarketOverviewItemResponse[];
}

export interface MarketSeriesPointResponse {
  timestamp: string;
  value: number;
}

export interface MarketSeriesResponse {
  instrumentCode: MarketInstrumentCode;
  displayName: string;
  marketGroup: MarketGroup;
  unitLabel: string;
  period: MarketSeriesPeriod;
  lastObservedAt: string | null;
  points: MarketSeriesPointResponse[];
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getMarketOverview = async () => {
  const response = await request<ApiEnvelope<MarketOverviewResponse>>('/contents/market/overview');
  return unwrap(response);
};

const getMarketSeries = async (instrument: MarketInstrumentCode, period: MarketSeriesPeriod) => {
  const response = await request<ApiEnvelope<MarketSeriesResponse>>(`/contents/market/series?instrument=${instrument}&period=${period}`);
  return unwrap(response);
};

export { getMarketOverview, getMarketSeries };
