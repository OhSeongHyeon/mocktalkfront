import { request } from '../lib/api';
import type { ApiEnvelope } from './boards';

export interface BoardCategoryResponse {
  id: number;
  boardId: number;
  categoryName: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardCategoryCreateRequest {
  categoryName: string;
}

export interface BoardCategoryUpdateRequest {
  categoryName: string;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getBoardCategories = async (boardId: number) => {
  const response = await request<ApiEnvelope<BoardCategoryResponse[]>>(`/boards/${boardId}/admin/categories`);
  return unwrap(response);
};

const createBoardCategory = async (boardId: number, payload: BoardCategoryCreateRequest) => {
  const response = await request<ApiEnvelope<BoardCategoryResponse>>(`/boards/${boardId}/admin/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const updateBoardCategory = async (boardId: number, categoryId: number, payload: BoardCategoryUpdateRequest) => {
  const response = await request<ApiEnvelope<BoardCategoryResponse>>(`/boards/${boardId}/admin/categories/${categoryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const deleteBoardCategory = async (boardId: number, categoryId: number) => {
  const response = await request<ApiEnvelope<void>>(`/boards/${boardId}/admin/categories/${categoryId}`, {
    method: 'DELETE',
  });
  return unwrap(response);
};

export { createBoardCategory, deleteBoardCategory, getBoardCategories, updateBoardCategory };
