import { request } from '../lib/api';
import type { ApiEnvelope, PageResponse } from './boards';

export type ReportStatus = 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
export type ReportTargetType = 'ARTICLE' | 'COMMENT' | 'USER' | 'BOARD';

export interface ReportListItemResponse {
  id: number;
  status: ReportStatus;
  targetType: ReportTargetType;
  targetId: number;
  reasonCode: string;
  reporterUserId: number;
  targetUserId: number | null;
  boardId: number | null;
  processedAt: string | null;
  createdAt: string;
}

export interface ReportDetailResponse {
  id: number;
  status: ReportStatus;
  targetType: ReportTargetType;
  targetId: number;
  reasonCode: string;
  reasonDetail: string | null;
  targetSnapshot: string | null;
  reporterUserId: number;
  targetUserId: number | null;
  boardId: number | null;
  processedById: number | null;
  processedNote: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportProcessRequest {
  status: ReportStatus;
  processedNote?: string;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getAdminReports = async (params: { status?: ReportStatus | 'ALL'; page: number; size: number }) => {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  if (params.status && params.status !== 'ALL') {
    query.set('status', params.status);
  }
  const response = await request<ApiEnvelope<PageResponse<ReportListItemResponse>>>(`/admin/reports?${query.toString()}`);
  return unwrap(response);
};

const getAdminReport = async (reportId: number) => {
  const response = await request<ApiEnvelope<ReportDetailResponse>>(`/admin/reports/${reportId}`);
  return unwrap(response);
};

const processAdminReport = async (reportId: number, payload: ReportProcessRequest) => {
  const response = await request<ApiEnvelope<ReportDetailResponse>>(`/admin/reports/${reportId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

export { getAdminReport, getAdminReports, processAdminReport };
