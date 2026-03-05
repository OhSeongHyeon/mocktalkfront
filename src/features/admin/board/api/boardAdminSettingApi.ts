import { request } from '../../../../shared/lib/http/api';
import { cancelUploadSession, completeUpload, initUpload, uploadBinary } from '../../../../entities/file';
import type { ApiEnvelope, BoardArticleWritePolicy, BoardResponse } from '../../../../entities/board/api/boardApi';

export interface BoardAdminSettingsUpdateRequest {
  boardName: string;
  description?: string | null;
  visibility: 'PUBLIC' | 'GROUP' | 'PRIVATE' | 'UNLISTED';
  articleWritePolicy: BoardArticleWritePolicy;
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
  const init = await initUpload({
    purpose: 'BOARD_IMAGE',
    originalFileName: boardImage.name,
    contentType: boardImage.type || 'application/octet-stream',
    fileSize: boardImage.size,
    context: {
      boardId,
      channel: 'BOARD_SETTINGS_ADMIN',
      preserveMetadata: false,
    },
  });

  try {
    await uploadBinary(init.uploadUrl, boardImage, init.headers);
    const completed = await completeUpload<unknown, BoardResponse>(init.uploadToken);
    if (!completed.board) {
      throw new Error('게시판 이미지 업로드 완료 응답이 올바르지 않습니다.');
    }
    return completed.board;
  } catch (error) {
    try {
      await cancelUploadSession(init.uploadToken);
    } catch {
      // 취소 요청 실패는 주 오류를 덮지 않도록 무시한다.
    }
    throw error;
  }
};

const deleteBoardAdminImage = async (boardId: number) => {
  const response = await request<ApiEnvelope<BoardResponse>>(`/boards/${boardId}/admin/settings/image`, {
    method: 'DELETE',
  });
  return unwrap(response);
};

export { deleteBoardAdminImage, getBoardSettings, updateBoardSettings, uploadBoardAdminImage };
