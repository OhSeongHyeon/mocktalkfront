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

export interface UserProfileResponse {
  userId: number;
  loginId: string;
  email: string;
  userName: string;
  displayName: string;
  handle: string;
  profileImage: FileResponse | null;
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

export interface CommentResponse {
  id: number;
  userId: number;
  articleId: number;
  parentCommentId: number | null;
  rootCommentId: number | null;
  depth: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getMyProfile = async () => {
  const response = await request<ApiEnvelope<UserProfileResponse>>('/users/me');
  return unwrap(response);
};

const updateMyProfile = async (payload: {
  email: string;
  userName: string;
  displayName: string;
  handle: string;
  password?: string | null;
  profileImage?: File | null;
}) => {
  const formData = new FormData();
  formData.append('email', payload.email);
  formData.append('userName', payload.userName);
  formData.append('displayName', payload.displayName);
  formData.append('handle', payload.handle);
  if (payload.password) {
    formData.append('password', payload.password);
  }
  if (payload.profileImage) {
    formData.append('profileImage', payload.profileImage);
  }
  const response = await request<ApiEnvelope<UserProfileResponse>>('/users/me', {
    method: 'PUT',
    body: formData,
  });
  return unwrap(response);
};

const getMyArticles = async (page: number, size: number) => {
  const response = await request<ApiEnvelope<PageResponse<ArticleResponse>>>(
    `/users/me/articles?page=${page}&size=${size}`,
  );
  return unwrap(response);
};

const getMyComments = async (page: number, size: number) => {
  const response = await request<ApiEnvelope<PageResponse<CommentResponse>>>(
    `/users/me/comments?page=${page}&size=${size}`,
  );
  return unwrap(response);
};

const deleteMyAccount = async (confirmText: string) => {
  const response = await request<ApiEnvelope<void>>('/users/me', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmText }),
  });
  return unwrap(response);
};

export { deleteMyAccount, getMyArticles, getMyComments, getMyProfile, updateMyProfile };
