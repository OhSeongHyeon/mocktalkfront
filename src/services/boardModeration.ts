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

export type SanctionType = 'MUTE' | 'SUSPEND' | 'BAN';

export interface SanctionResponse {
  id: number;
  userId: number;
  scopeType: 'BOARD';
  boardId: number | null;
  sanctionType: SanctionType;
  reason: string;
  startsAt: string;
  endsAt: string | null;
  reportId: number | null;
  createdById: number;
  revokedAt: string | null;
  revokedById: number | null;
  revokedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SanctionCreateRequest {
  userId: number;
  sanctionType: SanctionType;
  reason: string;
  endsAt?: string | null;
  reportId?: number | null;
}

export interface SanctionRevokeRequest {
  revokedReason: string;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getBoardReports = async (boardId: number, params: { status?: ReportStatus | 'ALL'; page: number; size: number }) => {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  if (params.status && params.status !== 'ALL') {
    query.set('status', params.status);
  }
  const response = await request<ApiEnvelope<PageResponse<ReportListItemResponse>>>(`/boards/${boardId}/admin/reports?${query.toString()}`);
  return unwrap(response);
};

const getBoardReport = async (boardId: number, reportId: number) => {
  const response = await request<ApiEnvelope<ReportDetailResponse>>(`/boards/${boardId}/admin/reports/${reportId}`);
  return unwrap(response);
};

const processBoardReport = async (boardId: number, reportId: number, payload: ReportProcessRequest) => {
  const response = await request<ApiEnvelope<ReportDetailResponse>>(`/boards/${boardId}/admin/reports/${reportId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const getBoardSanctions = async (boardId: number, page: number, size: number) => {
  const response = await request<ApiEnvelope<PageResponse<SanctionResponse>>>(`/boards/${boardId}/admin/sanctions?page=${page}&size=${size}`);
  return unwrap(response);
};

const createBoardSanction = async (boardId: number, payload: SanctionCreateRequest) => {
  const response = await request<ApiEnvelope<SanctionResponse>>(`/boards/${boardId}/admin/sanctions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      scopeType: 'BOARD',
      boardId,
    }),
  });
  return unwrap(response);
};

const revokeBoardSanction = async (boardId: number, sanctionId: number, payload: SanctionRevokeRequest) => {
  const response = await request<ApiEnvelope<SanctionResponse>>(`/boards/${boardId}/admin/sanctions/${sanctionId}/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

export { createBoardSanction, getBoardReport, getBoardReports, getBoardSanctions, processBoardReport, revokeBoardSanction };
