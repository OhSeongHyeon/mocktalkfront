import { request } from '../../../shared/lib/http/api';
import { cancelUploadSession, completeUpload, initUpload, uploadBinary } from '../../file';

export type BoardArticleWritePolicy = 'ALL_AUTHENTICATED' | 'MEMBER' | 'MODERATOR' | 'OWNER';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: unknown;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SliceResponse<T> {
  items: T[];
  page: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface FileResponse {
  id: number;
  fileClassId: number;
  fileName: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BoardResponse {
  id: number;
  boardName: string;
  slug: string;
  description: string | null;
  visibility: string;
  articleWritePolicy: BoardArticleWritePolicy;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  boardImage: FileResponse | null;
}

export type BoardMemberStatus = 'OWNER' | 'MODERATOR' | 'MEMBER' | 'PENDING' | 'BANNED';

export interface BoardDetailResponse extends BoardResponse {
  ownerDisplayName: string | null;
  memberStatus: BoardMemberStatus | null;
  subscribed: boolean;
}

export interface BoardSubscribeItemResponse {
  id: number;
  boardId: number;
  boardName: string;
  slug: string;
  description: string | null;
  visibility: string;
  boardImage: FileResponse | null;
  subscribedAt: string;
}

export interface ArticleSummaryResponse {
  id: number;
  boardId: number;
  userId: number;
  authorName: string;
  title: string;
  hit: number;
  commentCount: number;
  likeCount: number;
  dislikeCount: number;
  notice: boolean;
  createdAt: string;
}

export interface BoardArticleListResponse {
  pinned: ArticleSummaryResponse[];
  page: PageResponse<ArticleSummaryResponse>;
}

export interface BoardCreateRequest {
  boardName: string;
  slug: string;
  description?: string | null;
  visibility: 'PUBLIC' | 'GROUP' | 'PRIVATE' | 'UNLISTED';
  articleWritePolicy?: BoardArticleWritePolicy;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getBoards = async (page: number, size: number) => {
  const response = await request<ApiEnvelope<PageResponse<BoardResponse>>>(`/boards?page=${page}&size=${size}`);
  return unwrap(response);
};

const getBoardBySlug = async (slug: string) => {
  const response = await request<ApiEnvelope<BoardDetailResponse>>(`/boards/slug/${slug}`);
  return unwrap(response);
};

const getBoardArticles = async (
  boardId: number,
  page: number,
  size: number,
  order?: 'LATEST' | 'OLDEST',
  categoryId?: number,
  uncategorized?: boolean,
) => {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (order) {
    query.set('order', order);
  }
  if (uncategorized) {
    query.set('uncategorized', 'true');
  } else if (categoryId !== undefined && categoryId !== null) {
    query.set('categoryId', String(categoryId));
  }
  const response = await request<ApiEnvelope<BoardArticleListResponse>>(`/boards/${boardId}/articles?${query.toString()}`);
  return unwrap(response);
};

const getBoardSubscribes = async (page: number, size: number) => {
  const response = await request<ApiEnvelope<PageResponse<BoardSubscribeItemResponse>>>(`/boards/subscribes?page=${page}&size=${size}`);
  return unwrap(response);
};

const createBoard = async (payload: BoardCreateRequest) => {
  const response = await request<ApiEnvelope<BoardResponse>>('/boards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const uploadBoardImage = async (boardId: number, boardImage: File) => {
  const init = await initUpload({
    purpose: 'BOARD_IMAGE',
    originalFileName: boardImage.name,
    contentType: boardImage.type || 'application/octet-stream',
    fileSize: boardImage.size,
    context: {
      boardId,
      channel: 'BOARD_OWNER',
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

const subscribeBoard = async (boardId: number) => {
  const response = await request<ApiEnvelope<{ subscribed: boolean }>>(`/boards/${boardId}/subscribe`, {
    method: 'POST',
  });
  return unwrap(response);
};

const unsubscribeBoard = async (boardId: number) => {
  const response = await request<ApiEnvelope<{ subscribed: boolean }>>(`/boards/${boardId}/subscribe`, {
    method: 'DELETE',
  });
  return unwrap(response);
};

const requestBoardJoin = async (boardId: number) => {
  const response = await request<ApiEnvelope<{ memberStatus: BoardMemberStatus | null }>>(`/boards/${boardId}/members`, { method: 'POST' });
  return unwrap(response);
};

const cancelBoardJoin = async (boardId: number) => {
  const response = await request<ApiEnvelope<void>>(`/boards/${boardId}/members/me`, {
    method: 'DELETE',
  });
  return unwrap(response);
};

export {
  cancelBoardJoin,
  createBoard,
  getBoardArticles,
  getBoardBySlug,
  getBoardSubscribes,
  getBoards,
  requestBoardJoin,
  subscribeBoard,
  unsubscribeBoard,
  uploadBoardImage,
};
