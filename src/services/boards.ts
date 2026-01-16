import { request } from '../lib/api';

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

export interface ArticleSummaryResponse {
  id: number;
  boardId: number;
  userId: number;
  authorName: string;
  title: string;
  hit: number;
  commentCount: number;
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

const getBoardArticles = async (boardId: number, page: number, size: number) => {
  const response = await request<ApiEnvelope<BoardArticleListResponse>>(`/boards/${boardId}/articles?page=${page}&size=${size}`);
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
  const formData = new FormData();
  formData.append('boardImage', boardImage);
  const response = await request<ApiEnvelope<BoardResponse>>(`/boards/${boardId}/image`, {
    method: 'POST',
    body: formData,
  });
  return unwrap(response);
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
  const response = await request<ApiEnvelope<{ memberStatus: BoardMemberStatus }>>(`/boards/${boardId}/members`, { method: 'POST' });
  return unwrap(response);
};

export { createBoard, getBoardArticles, getBoardBySlug, getBoards, requestBoardJoin, subscribeBoard, unsubscribeBoard, uploadBoardImage };
