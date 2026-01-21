import { request } from '../lib/api';
import type { ApiEnvelope, PageResponse } from './boards';

export interface BoardAdminArticleItemResponse {
  id: number;
  userId: number;
  authorName: string;
  title: string;
  notice: boolean;
  reported: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export interface BoardAdminCommentItemResponse {
  id: number;
  articleId: number;
  articleTitle: string;
  userId: number;
  authorName: string;
  content: string;
  depth: number;
  reported: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export interface BoardAdminNoticeUpdateRequest {
  notice: boolean;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getBoardAdminArticles = async (
  boardId: number,
  params: { reported?: boolean; notice?: boolean; authorId?: number; page: number; size: number },
) => {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  if (params.reported !== undefined) {
    query.set('reported', String(params.reported));
  }
  if (params.notice !== undefined) {
    query.set('notice', String(params.notice));
  }
  if (params.authorId !== undefined) {
    query.set('authorId', String(params.authorId));
  }
  const response = await request<ApiEnvelope<PageResponse<BoardAdminArticleItemResponse>>>(
    `/boards/${boardId}/admin/contents/articles?${query.toString()}`,
  );
  return unwrap(response);
};

const getBoardAdminComments = async (boardId: number, params: { reported?: boolean; authorId?: number; page: number; size: number }) => {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  if (params.reported !== undefined) {
    query.set('reported', String(params.reported));
  }
  if (params.authorId !== undefined) {
    query.set('authorId', String(params.authorId));
  }
  const response = await request<ApiEnvelope<PageResponse<BoardAdminCommentItemResponse>>>(
    `/boards/${boardId}/admin/contents/comments?${query.toString()}`,
  );
  return unwrap(response);
};

const updateBoardAdminArticleNotice = async (boardId: number, articleId: number, payload: BoardAdminNoticeUpdateRequest) => {
  const response = await request<ApiEnvelope<BoardAdminArticleItemResponse>>(`/boards/${boardId}/admin/contents/articles/${articleId}/notice`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const deleteBoardAdminArticle = async (boardId: number, articleId: number) => {
  const response = await request<ApiEnvelope<void>>(`/boards/${boardId}/admin/contents/articles/${articleId}`, {
    method: 'DELETE',
  });
  return unwrap(response);
};

const deleteBoardAdminComment = async (boardId: number, commentId: number) => {
  const response = await request<ApiEnvelope<void>>(`/boards/${boardId}/admin/contents/comments/${commentId}`, {
    method: 'DELETE',
  });
  return unwrap(response);
};

export { deleteBoardAdminArticle, deleteBoardAdminComment, getBoardAdminArticles, getBoardAdminComments, updateBoardAdminArticleNotice };
