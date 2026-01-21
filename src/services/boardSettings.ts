import { request } from '../lib/api';
import type { ApiEnvelope, BoardResponse } from './boards';

export interface BoardAdminSettingsUpdateRequest {
  boardName: string;
  description?: string | null;
  visibility: 'PUBLIC' | 'GROUP' | 'PRIVATE' | 'UNLISTED';
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getBoardSettings = async (boardId: number) => {
  const response = await request<ApiEnvelope<BoardResponse>>(`/boards/${boardId}/admin/settings`);
  return unwrap(response);
};

const updateBoardSettings = async (boardId: number, payload: BoardAdminSettingsUpdateRequest) => {
  const response = await request<ApiEnvelope<BoardResponse>>(`/boards/${boardId}/admin/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const uploadBoardAdminImage = async (boardId: number, boardImage: File) => {
  const formData = new FormData();
  formData.append('boardImage', boardImage);
  const response = await request<ApiEnvelope<BoardResponse>>(`/boards/${boardId}/admin/settings/image`, {
    method: 'POST',
    body: formData,
  });
  return unwrap(response);
};

const deleteBoardAdminImage = async (boardId: number) => {
  const response = await request<ApiEnvelope<BoardResponse>>(`/boards/${boardId}/admin/settings/image`, {
    method: 'DELETE',
  });
  return unwrap(response);
};

export { deleteBoardAdminImage, getBoardSettings, updateBoardSettings, uploadBoardAdminImage };
