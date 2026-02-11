import { request } from '../lib/api';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: unknown;
}

export interface CommentTreeResponse {
  id: number;
  userId: number;
  authorName: string;
  content: string;
  depth: number;
  parentCommentId: number | null;
  rootCommentId: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  likeCount: number;
  dislikeCount: number;
  myReaction: number;
  children: CommentTreeResponse[];
}

export interface CommentReactionSummaryResponse {
  commentId: number;
  likeCount: number;
  dislikeCount: number;
  myReaction: number;
}

export interface CommentPageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CommentSnapshotResponse {
  articleId: number;
  syncVersion: number;
  page: CommentPageResponse<CommentTreeResponse>;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getArticleComments = async (articleId: number, page = 0, size = 10) => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  const response = await request<ApiEnvelope<CommentPageResponse<CommentTreeResponse>>>(`/articles/${articleId}/comments?${params.toString()}`);
  return unwrap(response);
};

const getArticleCommentSnapshot = async (articleId: number, page = 0, size = 10) => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  const response = await request<ApiEnvelope<CommentSnapshotResponse>>(`/articles/${articleId}/comments/snapshot?${params.toString()}`);
  return unwrap(response);
};

const createComment = async (articleId: number, content: string) => {
  const response = await request<ApiEnvelope<CommentTreeResponse>>(`/articles/${articleId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  return unwrap(response);
};

const createReply = async (articleId: number, parentId: number, content: string) => {
  const response = await request<ApiEnvelope<CommentTreeResponse>>(`/articles/${articleId}/comments/${parentId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  return unwrap(response);
};

const updateComment = async (commentId: number, content: string) => {
  const response = await request<ApiEnvelope<CommentTreeResponse>>(`/comments/${commentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  return unwrap(response);
};

const deleteComment = async (commentId: number) => {
  const response = await request<ApiEnvelope<void>>(`/comments/${commentId}`, {
    method: 'DELETE',
  });
  return unwrap(response);
};

const toggleCommentReaction = async (commentId: number, reactionType: number) => {
  const response = await request<ApiEnvelope<CommentReactionSummaryResponse>>(`/comments/${commentId}/reactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reactionType }),
  });
  return unwrap(response);
};

export { createComment, createReply, deleteComment, getArticleCommentSnapshot, getArticleComments, toggleCommentReaction, updateComment };
