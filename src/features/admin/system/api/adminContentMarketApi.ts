import type { MarketInstrumentCode } from '../../../../entities/content';
import type { ApiEnvelope } from '../../../../entities/board/api/boardApi';
import { request } from '../../../../shared/lib/http/api';

export interface AdminContentMarketRefreshItemResponse {
  instrumentCode: MarketInstrumentCode;
  observedAt: string;
  status: 'CREATED' | 'UPDATED' | 'SKIPPED';
}

export interface AdminContentMarketRefreshResponse {
  executedAt: string;
  totalCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  items: AdminContentMarketRefreshItemResponse[];
}

export interface AdminContentMarketImportFailureResponse {
  rowNumber: number;
  message: string;
}

export interface AdminContentMarketImportResponse {
  executedAt: string;
  fileName: string | null;
  selectedInstrument: MarketInstrumentCode | null;
  unifiedFile: boolean;
  totalCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  failures: AdminContentMarketImportFailureResponse[];
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const refreshContentMarket = async () => {
  const response = await request<ApiEnvelope<AdminContentMarketRefreshResponse>>('/admin/contents/market/refresh', {
    method: 'POST',
  });
  return unwrap(response);
};

const importContentMarketSnapshots = async (file: File, instrument?: MarketInstrumentCode) => {
  const formData = new FormData();
  formData.append('file', file);

  const searchParams = new URLSearchParams();
  if (instrument) {
    searchParams.set('instrument', instrument);
  }

  const queryString = searchParams.toString();
  const response = await request<ApiEnvelope<AdminContentMarketImportResponse>>(
    `/admin/contents/market/import${queryString ? `?${queryString}` : ''}`,
    {
      method: 'POST',
      body: formData,
    },
  );
  return unwrap(response);
};

export { importContentMarketSnapshots, refreshContentMarket };
