import type { ApiEnvelope } from '../../../../entities/board/api/boardApi';
import { request } from '../../../../shared/lib/http/api';

export type NewsSourceType = 'HACKER_NEWS' | 'DEV_TO' | 'GITHUB_RELEASES' | 'RSS';
export type NewsJobExecutionStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface AdminNewsBotJobResponse {
  jobId: number;
  jobName: string;
  sourceType: NewsSourceType;
  sourceConfig: Record<string, unknown>;
  targetBoardSlug: string;
  targetBoardName: string | null;
  targetCategoryName: string | null;
  authorUserId: number;
  authorDisplayName: string;
  enabled: boolean;
  collectIntervalMinutes: number;
  fetchLimit: number;
  autoCreateBoard: boolean;
  autoCreateCategory: boolean;
  timezone: string;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastSuccessAt: string | null;
  nextRunAt: string | null;
  lastStatus: NewsJobExecutionStatus;
  lastErrorMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminNewsBotJobRunResponse {
  jobId: number;
  executedAt: string;
  fetchedCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  status: NewsJobExecutionStatus;
  errorMessage: string | null;
}

export interface AdminNewsBotJobUpsertRequest {
  jobName: string;
  sourceType: NewsSourceType;
  sourceConfig: Record<string, unknown>;
  targetBoardSlug: string;
  targetBoardName?: string | null;
  targetCategoryName?: string | null;
  collectIntervalMinutes: number;
  fetchLimit: number;
  autoCreateBoard: boolean;
  autoCreateCategory: boolean;
  timezone?: string | null;
}

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const getAdminNewsBotJobs = async () => {
  const response = await request<ApiEnvelope<AdminNewsBotJobResponse[]>>('/admin/news-bot/jobs');
  return unwrap(response);
};

const createAdminNewsBotJob = async (payload: AdminNewsBotJobUpsertRequest) => {
  const response = await request<ApiEnvelope<AdminNewsBotJobResponse>>('/admin/news-bot/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const updateAdminNewsBotJob = async (jobId: number, payload: AdminNewsBotJobUpsertRequest) => {
  const response = await request<ApiEnvelope<AdminNewsBotJobResponse>>(`/admin/news-bot/jobs/${jobId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return unwrap(response);
};

const changeAdminNewsBotJobEnabled = async (jobId: number, enabled: boolean) => {
  const response = await request<ApiEnvelope<AdminNewsBotJobResponse>>(`/admin/news-bot/jobs/${jobId}/enabled`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enabled }),
  });
  return unwrap(response);
};

const runAdminNewsBotJobNow = async (jobId: number) => {
  const response = await request<ApiEnvelope<AdminNewsBotJobRunResponse>>(`/admin/news-bot/jobs/${jobId}/run`, {
    method: 'POST',
  });
  return unwrap(response);
};

export { changeAdminNewsBotJobEnabled, createAdminNewsBotJob, getAdminNewsBotJobs, runAdminNewsBotJobNow, updateAdminNewsBotJob };
