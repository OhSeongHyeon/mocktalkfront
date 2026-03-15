import { beforeEach, describe, expect, it, vi } from 'vitest';

import { request } from '../../../../shared/lib/http/api';
import {
  changeAdminNewsBotJobEnabled,
  createAdminNewsBotJob,
  getAdminNewsBotJobs,
  runAdminNewsBotJobNow,
  updateAdminNewsBotJob,
} from './adminNewsBotApi';

vi.mock('../../../../shared/lib/http/api', () => ({
  request: vi.fn(),
}));

const requestMock = vi.mocked(request);

describe('features/admin/system/api/adminNewsBotApi contract', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('getAdminNewsBotJobs는 뉴스봇 잡 목록을 조회한다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: [
        {
          jobId: 1,
          jobName: '백엔드 새소식',
          sourceType: 'DEV_TO',
          sourceConfig: { tag: 'backend' },
          targetBoardSlug: 'backend-news',
          targetBoardName: '백엔드 새소식',
          targetCategoryName: 'DEV',
          authorUserId: 2,
          authorDisplayName: '뉴스봇',
          enabled: true,
          collectIntervalMinutes: 60,
          fetchLimit: 20,
          autoCreateBoard: true,
          autoCreateCategory: true,
          timezone: 'Asia/Seoul',
          lastStartedAt: null,
          lastFinishedAt: null,
          lastSuccessAt: null,
          nextRunAt: '2026-03-15T10:00:00Z',
          lastStatus: 'IDLE',
          lastErrorMessage: null,
          createdAt: '2026-03-15T10:00:00Z',
          updatedAt: '2026-03-15T10:00:00Z',
        },
      ],
    });

    // when
    const response = await getAdminNewsBotJobs();

    // then
    expect(requestMock).toHaveBeenCalledWith('/admin/news-bot/jobs');
    expect(response[0]?.jobName).toBe('백엔드 새소식');
  });

  it('createAdminNewsBotJob은 생성 요청을 보낸다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: {
        jobId: 1,
        jobName: '백엔드 새소식',
      },
    });

    // when
    await createAdminNewsBotJob({
      jobName: '백엔드 새소식',
      sourceType: 'DEV_TO',
      sourceConfig: { tag: 'backend' },
      targetBoardSlug: 'backend-news',
      targetBoardName: '백엔드 새소식',
      targetCategoryName: 'DEV',
      collectIntervalMinutes: 60,
      fetchLimit: 20,
      autoCreateBoard: true,
      autoCreateCategory: true,
      timezone: 'Asia/Seoul',
    });

    // then
    expect(requestMock).toHaveBeenCalledWith('/admin/news-bot/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.any(String),
    });
  });

  it('updateAdminNewsBotJob은 수정 요청을 보낸다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: {
        jobId: 3,
        jobName: '업데이트된 새소식',
      },
    });

    // when
    await updateAdminNewsBotJob(3, {
      jobName: '업데이트된 새소식',
      sourceType: 'RSS',
      sourceConfig: { feedUrl: 'https://spring.io/blog.atom' },
      targetBoardSlug: 'spring-news',
      targetBoardName: '스프링 새소식',
      targetCategoryName: 'RSS',
      collectIntervalMinutes: 120,
      fetchLimit: 10,
      autoCreateBoard: true,
      autoCreateCategory: true,
      timezone: 'Asia/Seoul',
    });

    // then
    expect(requestMock).toHaveBeenCalledWith('/admin/news-bot/jobs/3', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.any(String),
    });
  });

  it('changeAdminNewsBotJobEnabled는 on/off 요청을 보낸다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: {
        jobId: 3,
        enabled: false,
      },
    });

    // when
    await changeAdminNewsBotJobEnabled(3, false);

    // then
    expect(requestMock).toHaveBeenCalledWith('/admin/news-bot/jobs/3/enabled', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: false }),
    });
  });

  it('runAdminNewsBotJobNow는 즉시 실행 요청을 보낸다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: {
        jobId: 3,
        executedAt: '2026-03-15T10:00:00Z',
        fetchedCount: 10,
        createdCount: 5,
        updatedCount: 2,
        skippedCount: 3,
        failedCount: 0,
        status: 'SUCCESS',
        errorMessage: null,
      },
    });

    // when
    const response = await runAdminNewsBotJobNow(3);

    // then
    expect(requestMock).toHaveBeenCalledWith('/admin/news-bot/jobs/3/run', {
      method: 'POST',
    });
    expect(response.createdCount).toBe(5);
  });
});
