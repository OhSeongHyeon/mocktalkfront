import { request } from '../lib/api';
import type { ApiEnvelope, BoardResponse, PageResponse } from './boards';

export interface AdminBoardCreateRequest {
  boardName: string;
  slug: string;
  description?: string | null;
  visibility: 'PUBLIC' | 'GROUP' | 'PRIVATE' | 'UNLISTED';
}

export interface AdminBoardUpdateRequest {
  boardName: string;
  slug: string;
  description?: string | null;
  visibility: 'PUBLIC' | 'GROUP' | 'PRIVATE' | 'UNLISTED';
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getAdminBoards = async (params: {
  page: number;
  size: number;
  keyword?: string;
  visibility?: AdminBoardCreateRequest['visibility'];
  includeDeleted?: boolean;
  sort?: 'ASC' | 'DESC';
  sortBy?: 'CREATED_AT' | 'UPDATED_AT';
}) => {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  if (params.keyword) {
    query.set('keyword', params.keyword);
  }
  if (params.visibility) {
    query.set('visibility', params.visibility);
  }
  if (typeof params.includeDeleted === 'boolean') {
    query.set('includeDeleted', String(params.includeDeleted));
  }
  if (params.sort) {
    query.set('sort', params.sort);
  }
  if (params.sortBy) {
    query.set('sortBy', params.sortBy);
  }
  const response = await request<ApiEnvelope<PageResponse<BoardResponse>>>(`/admin/boards?${query.toString()}`);
  return unwrap(response);
};

const createAdminBoard = async (payload: AdminBoardCreateRequest) => {
  const response = await request<ApiEnvelope<BoardResponse>>('/admin/boards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const updateAdminBoard = async (boardId: number, payload: AdminBoardUpdateRequest) => {
  const response = await request<ApiEnvelope<BoardResponse>>(`/admin/boards/${boardId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const uploadAdminBoardImage = async (boardId: number, boardImage: File) => {
  const formData = new FormData();
  formData.append('boardImage', boardImage);
  const response = await request<ApiEnvelope<BoardResponse>>(`/admin/boards/${boardId}/image`, {
    method: 'POST',
    body: formData,
  });
  return unwrap(response);
};

const deleteAdminBoardImage = async (boardId: number) => {
  const response = await request<ApiEnvelope<BoardResponse>>(`/admin/boards/${boardId}/image`, {
    method: 'DELETE',
  });
  return unwrap(response);
};

const deleteAdminBoard = async (boardId: number) => {
  const response = await request<ApiEnvelope<void>>(`/admin/boards/${boardId}`, {
    method: 'DELETE',
  });
  return unwrap(response);
};

export { createAdminBoard, deleteAdminBoard, deleteAdminBoardImage, getAdminBoards, updateAdminBoard, uploadAdminBoardImage };
