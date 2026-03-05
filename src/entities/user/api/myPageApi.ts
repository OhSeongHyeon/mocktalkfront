import { request } from '../../../shared/lib/http/api';
import { cancelUploadSession, completeUpload, initUpload, uploadBinary } from '../../../services/uploadSession';

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
  userPoint: number;
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
  boardSlug: string;
  boardName: string;
  userId: number;
  authorName: string;
  categoryId: number | null;
  visibility: string;
  title: string;
  hit: number;
  commentCount: number;
  likeCount: number;
  dislikeCount: number;
  notice: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CommentResponse {
  id: number;
  userId: number;
  articleId: number;
  articleTitle: string;
  boardId: number;
  boardSlug: string;
  boardName: string;
  authorName: string;
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
  const response = await request<ApiEnvelope<UserProfileResponse>>('/users/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.email,
      userName: payload.userName,
      displayName: payload.displayName,
      handle: payload.handle,
      password: payload.password ?? undefined,
    }),
  });

  let profile = unwrap(response);
  if (!payload.profileImage) {
    return profile;
  }

  const init = await initUpload({
    purpose: 'PROFILE_IMAGE',
    originalFileName: payload.profileImage.name,
    contentType: payload.profileImage.type || 'application/octet-stream',
    fileSize: payload.profileImage.size,
    context: {
      preserveMetadata: false,
    },
  });

  try {
    await uploadBinary(init.uploadUrl, payload.profileImage, init.headers);
    const completed = await completeUpload<unknown, unknown, UserProfileResponse>(init.uploadToken);
    if (!completed.userProfile) {
      throw new Error('프로필 이미지 업로드 완료 응답이 올바르지 않습니다.');
    }
    profile = completed.userProfile;
    return profile;
  } catch (error) {
    try {
      await cancelUploadSession(init.uploadToken);
    } catch {
      // 취소 요청 실패는 주 오류를 덮지 않도록 무시한다.
    }
    throw error;
  }
};

const getMyArticles = async (page: number, size: number) => {
  const response = await request<ApiEnvelope<PageResponse<ArticleResponse>>>(`/users/me/articles?page=${page}&size=${size}`);
  return unwrap(response);
};

const getMyComments = async (page: number, size: number) => {
  const response = await request<ApiEnvelope<PageResponse<CommentResponse>>>(`/users/me/comments?page=${page}&size=${size}`);
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
