import { request } from '../lib/api';
import type { ApiEnvelope, PageResponse } from './boards';

export type SanctionScopeType = 'GLOBAL' | 'BOARD';
export type SanctionType = 'MUTE' | 'SUSPEND' | 'BAN';

export interface SanctionResponse {
  id: number;
  userId: number;
  scopeType: SanctionScopeType;
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
  scopeType: SanctionScopeType;
  boardId?: number | null;
  sanctionType: SanctionType;
  reason: string;
  startsAt?: string | null;
  endsAt?: string | null;
  reportId?: number | null;
}

export interface SanctionRevokeRequest {
  revokedReason: string;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getAdminSanctions = async (params: { scopeType?: SanctionScopeType; boardId?: number | null; page: number; size: number }) => {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  if (params.scopeType) {
    query.set('scopeType', params.scopeType);
  }
  if (typeof params.boardId === 'number') {
    query.set('boardId', String(params.boardId));
  }
  const response = await request<ApiEnvelope<PageResponse<SanctionResponse>>>(`/admin/sanctions?${query.toString()}`);
  return unwrap(response);
};

const createAdminSanction = async (payload: SanctionCreateRequest) => {
  const response = await request<ApiEnvelope<SanctionResponse>>('/admin/sanctions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const revokeAdminSanction = async (sanctionId: number, payload: SanctionRevokeRequest) => {
  const response = await request<ApiEnvelope<SanctionResponse>>(`/admin/sanctions/${sanctionId}/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

export { createAdminSanction, getAdminSanctions, revokeAdminSanction };
