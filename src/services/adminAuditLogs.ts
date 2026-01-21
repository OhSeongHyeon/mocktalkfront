import { request } from '../lib/api';
import type { ApiEnvelope, PageResponse } from './boards';

export type AdminActionType = 'REPORT_PROCESS' | 'SANCTION_CREATE' | 'SANCTION_REVOKE';
export type AdminTargetType = 'ARTICLE' | 'COMMENT' | 'USER' | 'BOARD' | 'REPORT' | 'SANCTION';

export interface AdminAuditLogResponse {
  id: number;
  actorUserId: number;
  actionType: AdminActionType;
  targetType: AdminTargetType;
  targetId: number | null;
  boardId: number | null;
  summary: string;
  detailJson: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getAdminAuditLogs = async (params: {
  actionType?: AdminActionType;
  actorUserId?: number;
  targetType?: AdminTargetType;
  targetId?: number;
  fromAt?: string;
  toAt?: string;
  page: number;
  size: number;
}) => {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  if (params.actionType) {
    query.set('actionType', params.actionType);
  }
  if (typeof params.actorUserId === 'number') {
    query.set('actorUserId', String(params.actorUserId));
  }
  if (params.targetType) {
    query.set('targetType', params.targetType);
  }
  if (typeof params.targetId === 'number') {
    query.set('targetId', String(params.targetId));
  }
  if (params.fromAt) {
    query.set('fromAt', params.fromAt);
  }
  if (params.toAt) {
    query.set('toAt', params.toAt);
  }
  const response = await request<ApiEnvelope<PageResponse<AdminAuditLogResponse>>>(`/admin/audit-logs?${query.toString()}`);
  return unwrap(response);
};

export { getAdminAuditLogs };
