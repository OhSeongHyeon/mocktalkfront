import { request } from '../lib/api';
import type { ApiEnvelope, PageResponse } from './boards';
import type { BoardMemberStatus } from './boards';

export interface BoardMemberListItemResponse {
  id: number;
  userId: number;
  loginId: string;
  displayName: string;
  handle: string;
  boardRole: BoardMemberStatus;
  grantedByUserId: number | null;
  grantedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardMemberRoleUpdateRequest {
  boardRole: BoardMemberStatus;
}

export interface BoardMemberStatusRequest {
  boardRole: BoardMemberStatus;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getBoardMembers = async (boardId: number, params: { status?: BoardMemberStatus; page: number; size: number }) => {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  if (params.status) {
    query.set('status', params.status);
  }
  const response = await request<ApiEnvelope<PageResponse<BoardMemberListItemResponse>>>(`/boards/${boardId}/admin/members?${query.toString()}`);
  return unwrap(response);
};

const approveBoardMember = async (boardId: number, memberId: number) => {
  const response = await request<ApiEnvelope<BoardMemberListItemResponse>>(`/boards/${boardId}/admin/members/${memberId}/approve`, {
    method: 'PUT',
  });
  return unwrap(response);
};

const rejectBoardMember = async (boardId: number, memberId: number) => {
  const response = await request<ApiEnvelope<void>>(`/boards/${boardId}/admin/members/${memberId}/reject`, {
    method: 'PUT',
  });
  return unwrap(response);
};

const updateBoardMemberRole = async (boardId: number, memberId: number, payload: BoardMemberRoleUpdateRequest) => {
  const response = await request<ApiEnvelope<BoardMemberListItemResponse>>(`/boards/${boardId}/admin/members/${memberId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const updateBoardMemberStatus = async (boardId: number, memberId: number, payload: BoardMemberStatusRequest) => {
  const response = await request<ApiEnvelope<BoardMemberListItemResponse>>(`/boards/${boardId}/admin/members/${memberId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

export { approveBoardMember, getBoardMembers, rejectBoardMember, updateBoardMemberRole, updateBoardMemberStatus };
