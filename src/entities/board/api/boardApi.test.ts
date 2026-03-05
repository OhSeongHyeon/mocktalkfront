import { beforeEach, describe, expect, it, vi } from 'vitest';

import { request } from '../../../shared/lib/http/api';
import { getBoardArticles, getBoardBySlug } from './boardApi';

vi.mock('../../../shared/lib/http/api', () => ({
  request: vi.fn(),
}));

const requestMock = vi.mocked(request);

describe('entities/board/api/boardApi contract', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('getBoardBySlug는 nullable 필드를 포함한 BoardDetailResponse를 그대로 반환한다', async () => {
    // given
    const boardDetail = {
      id: 7,
      boardName: '테스트 보드',
      slug: 'test-board',
      description: null,
      visibility: 'PUBLIC',
      articleWritePolicy: 'ALL_AUTHENTICATED' as const,
      createdAt: '2026-03-06T00:00:00.000Z',
      updatedAt: '2026-03-06T00:00:00.000Z',
      deletedAt: null,
      boardImage: null,
      ownerDisplayName: null,
      memberStatus: null,
      subscribed: true,
    };
    requestMock.mockResolvedValue({
      success: true,
      data: boardDetail,
    });

    // when
    const response = await getBoardBySlug('test-board');

    // then
    expect(requestMock).toHaveBeenCalledWith('/boards/slug/test-board');
    expect(response).toEqual(boardDetail);
    expect(response).toMatchObject({
      description: null,
      deletedAt: null,
      boardImage: null,
      ownerDisplayName: null,
      memberStatus: null,
    });
  });

  it('getBoardArticles는 query를 구성하고 필수 필드를 포함한 목록을 반환한다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: {
        pinned: [],
        page: {
          items: [
            {
              id: 101,
              boardId: 7,
              userId: 22,
              authorName: '작성자',
              title: '첫 글',
              hit: 5,
              commentCount: 1,
              likeCount: 2,
              dislikeCount: 0,
              notice: false,
              createdAt: '2026-03-06T01:00:00.000Z',
            },
          ],
          page: 1,
          size: 20,
          totalElements: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      },
    });

    // when
    const response = await getBoardArticles(7, 1, 20, 'LATEST', 9, false);

    // then
    expect(requestMock).toHaveBeenCalledWith('/boards/7/articles?page=1&size=20&order=LATEST&categoryId=9');
    expect(response.page.items[0]).toMatchObject({
      id: 101,
      boardId: 7,
      userId: 22,
      authorName: '작성자',
      title: '첫 글',
      hit: 5,
      commentCount: 1,
      likeCount: 2,
      dislikeCount: 0,
      notice: false,
    });
  });

  it('getBoardArticles에서 uncategorized=true면 categoryId 쿼리를 제외한다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: {
        pinned: [],
        page: {
          items: [],
          page: 0,
          size: 10,
          totalElements: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      },
    });

    // when
    await getBoardArticles(3, 0, 10, 'OLDEST', 99, true);
    const calledPath = requestMock.mock.calls[0]?.[0];
    if (typeof calledPath !== 'string') {
      throw new Error('호출 경로가 문자열이 아닙니다.');
    }
    const [pathname, query = ''] = calledPath.split('?');
    const params = new URLSearchParams(query);

    // then
    expect(pathname).toBe('/boards/3/articles');
    expect(params.get('page')).toBe('0');
    expect(params.get('size')).toBe('10');
    expect(params.get('order')).toBe('OLDEST');
    expect(params.get('uncategorized')).toBe('true');
    expect(params.get('categoryId')).toBeNull();
  });
});
