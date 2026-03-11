import type { ApiEnvelope } from '../../../../entities/board/api/boardApi';
import { request } from '../../../../shared/lib/http/api';

export interface ArticleImportPreviewItemResponse {
  filePath: string;
  title: string | null;
  boardSlug: string | null;
  categoryName: string | null;
  visibility: string | null;
  executable: boolean;
  warnings: string[];
  errors: string[];
}

export interface ArticleImportPreviewResponse {
  canExecute: boolean;
  totalCount: number;
  executableCount: number;
  invalidCount: number;
  items: ArticleImportPreviewItemResponse[];
}

export interface ArticleImportExecuteItemResponse {
  filePath: string;
  title: string | null;
  boardSlug: string | null;
  categoryName: string | null;
  visibility: string | null;
  created: boolean;
  articleId: number | null;
  warnings: string[];
  errors: string[];
}

export interface ArticleImportExecuteResponse {
  totalCount: number;
  successCount: number;
  failedCount: number;
  items: ArticleImportExecuteItemResponse[];
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const createImportFormData = (file: File, autoCreateMissingCategories: boolean) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('autoCreateMissingCategories', String(autoCreateMissingCategories));
  return formData;
};

const previewArticleImport = async (file: File, autoCreateMissingCategories = true) => {
  const response = await request<ApiEnvelope<ArticleImportPreviewResponse>>('/articles/imports/preview', {
    method: 'POST',
    body: createImportFormData(file, autoCreateMissingCategories),
  });
  return unwrap(response);
};

const executeArticleImport = async (file: File, autoCreateMissingCategories = true) => {
  const response = await request<ApiEnvelope<ArticleImportExecuteResponse>>('/articles/imports/execute', {
    method: 'POST',
    body: createImportFormData(file, autoCreateMissingCategories),
  });
  return unwrap(response);
};

export { executeArticleImport, previewArticleImport };
