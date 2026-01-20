import { request } from '../lib/api';

import type { ApiEnvelope, FileResponse, SliceResponse } from './boards';

export type SearchType = 'ALL' | 'BOARD' | 'ARTICLE' | 'COMMENT' | 'USER';

export interface BoardSearchResponse {
  id: number;
  boardName: string;
  slug: string;
  description: string | null;
  visibility: string;
  boardImage: FileResponse | null;
  createdAt: string;
}

export interface ArticleSearchResponse {
  id: number;
  boardId: number;
  boardSlug: string;
  boardName: string;
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

export interface CommentSearchResponse {
  id: number;
  articleId: number;
  articleTitle: string;
  boardId: number;
  boardSlug: string;
  boardName: string;
  userId: number;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface UserSearchResponse {
  id: number;
  handle: string;
  displayName: string;
  createdAt: string;
}

export interface SearchResponse {
  boards: SliceResponse<BoardSearchResponse>;
  articles: SliceResponse<ArticleSearchResponse>;
  comments: SliceResponse<CommentSearchResponse>;
  users: SliceResponse<UserSearchResponse>;
}

const unwrap = <T>(envelope: ApiEnvelope<T>) => envelope.data;

interface SearchParams {
  q: string;
  type?: SearchType;
  order?: 'LATEST' | 'OLDEST';
  page?: number;
  size?: number;
  boardSlug?: string;
}

const search = async (params: SearchParams) => {
  const query = new URLSearchParams();
  query.set('q', params.q);
  if (params.type) {
    query.set('type', params.type);
  }
  if (params.order) {
    query.set('order', params.order);
  }
  if (params.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params.size !== undefined) {
    query.set('size', String(params.size));
  }
  if (params.boardSlug) {
    query.set('boardSlug', params.boardSlug);
  }
  const response = await request<ApiEnvelope<SearchResponse>>(`/search?${query.toString()}`);
  return unwrap(response);
};

export { search };
