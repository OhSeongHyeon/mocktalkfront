import { request } from '../lib/api';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: unknown;
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

export interface ArticleBoardResponse {
  id: number;
  boardName: string;
  slug: string;
  description: string | null;
  visibility: string;
  boardImage: FileResponse | null;
}

export interface ArticleDetailResponse {
  id: number;
  board: ArticleBoardResponse;
  userId: number;
  authorName: string;
  visibility: string;
  title: string;
  content: string;
  hit: number;
  commentCount: number;
  likeCount: number;
  dislikeCount: number;
  myReaction: number;
  notice: boolean;
  createdAt: string;
  updatedAt: string;
  attachments: FileResponse[];
}

export interface ArticleResponse {
  id: number;
  boardId: number;
  userId: number;
  categoryId: number | null;
  visibility: string;
  title: string;
  content: string;
  hit: number;
  notice: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ArticleReactionSummaryResponse {
  articleId: number;
  likeCount: number;
  dislikeCount: number;
  myReaction: number;
}

export interface ArticleCreateRequest {
  boardId: number;
  userId: number;
  categoryId?: number | null;
  visibility: string;
  title: string;
  content: string;
  notice: boolean;
}

export interface ArticleUpdateRequest {
  categoryId?: number | null;
  visibility: string;
  title: string;
  content: string;
  notice: boolean;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getArticleDetail = async (articleId: number) => {
  const response = await request<ApiEnvelope<ArticleDetailResponse>>(`/articles/${articleId}`);
  return unwrap(response);
};

const createArticle = async (payload: ArticleCreateRequest) => {
  const response = await request<ApiEnvelope<ArticleResponse>>('/articles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const updateArticle = async (articleId: number, payload: ArticleUpdateRequest) => {
  const response = await request<ApiEnvelope<ArticleResponse>>(`/articles/${articleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const deleteArticle = async (articleId: number) => {
  const response = await request<ApiEnvelope<void>>(`/articles/${articleId}`, {
    method: 'DELETE',
  });
  return unwrap(response);
};

const toggleArticleReaction = async (articleId: number, reactionType: number) => {
  const response = await request<ApiEnvelope<ArticleReactionSummaryResponse>>(`/articles/${articleId}/reactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reactionType }),
  });
  return unwrap(response);
};

export { createArticle, deleteArticle, getArticleDetail, toggleArticleReaction, updateArticle };
