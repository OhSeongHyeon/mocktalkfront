import { request } from '../lib/api';
import type { ApiEnvelope, PageResponse } from './boards';

export type AdminUserStatus = 'ACTIVE' | 'LOCKED' | 'DISABLED';

export interface AdminUserListItemResponse {
  id: number;
  loginId: string;
  email: string;
  userName: string;
  displayName: string;
  handle: string;
  roleName: string;
  enabled: boolean;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserRoleUpdateRequest {
  roleName: string;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getAdminUsers = async (params: { status?: AdminUserStatus; keyword?: string; page: number; size: number }) => {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.keyword) {
    query.set('keyword', params.keyword);
  }
  const response = await request<ApiEnvelope<PageResponse<AdminUserListItemResponse>>>(`/admin/users?${query.toString()}`);
  return unwrap(response);
};

const lockAdminUser = async (userId: number) => {
  const response = await request<ApiEnvelope<AdminUserListItemResponse>>(`/admin/users/${userId}/lock`, {
    method: 'PUT',
  });
  return unwrap(response);
};

const unlockAdminUser = async (userId: number) => {
  const response = await request<ApiEnvelope<AdminUserListItemResponse>>(`/admin/users/${userId}/unlock`, {
    method: 'PUT',
  });
  return unwrap(response);
};

const updateAdminUserRole = async (userId: number, payload: AdminUserRoleUpdateRequest) => {
  const response = await request<ApiEnvelope<AdminUserListItemResponse>>(`/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

export { getAdminUsers, lockAdminUser, unlockAdminUser, updateAdminUserRole };
