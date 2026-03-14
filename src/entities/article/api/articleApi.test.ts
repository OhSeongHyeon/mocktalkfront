import { beforeEach, describe, expect, it, vi } from 'vitest';

import { request } from '../../../shared/lib/http/api';
import { getRecentArticles, getTrendingArticles } from './articleApi';

vi.mock('../../../shared/lib/http/api', () => ({
  request: vi.fn(),
}));

const requestMock = vi.mocked(request);

describe('entities/article/api/articleApi contract', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('getRecentArticles는 홈 최근 공개 게시글 슬라이스를 반환한다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 101,
            boardId: 7,
            boardSlug: 'free',
            boardName: '자유게시판',
            userId: 22,
            authorName: '작성자',
            title: '첫 글',
            previewText: '본문 미리보기',
            commentCount: 3,
            likeCount: 5,
            hit: 9,
            createdAt: '2026-03-11T01:00:00.000Z',
          },
        ],
        page: 0,
        size: 6,
        hasNext: true,
        hasPrevious: false,
      },
    });

    // when
    const response = await getRecentArticles(0, 6);

    // then
    expect(requestMock).toHaveBeenCalledWith('/articles/recent?page=0&size=6');
    expect(response.items[0]).toMatchObject({
      boardSlug: 'free',
      boardName: '자유게시판',
      previewText: '본문 미리보기',
      commentCount: 3,
      likeCount: 5,
      hit: 9,
    });
    expect(response.hasNext).toBe(true);
  });

  it('getTrendingArticles는 홈 트렌딩 글 목록을 반환한다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: [
        {
          articleId: 301,
          boardId: 7,
          boardSlug: 'free',
          userId: 22,
          authorName: '작성자',
          title: '인기 글',
          hit: 19,
          commentCount: 8,
          likeCount: 12,
          dislikeCount: 1,
          trendScore: 21.5,
          createdAt: '2026-03-11T01:00:00.000Z',
        },
      ],
    });

    // when
    const response = await getTrendingArticles('DAY', 9);

    // then
    expect(requestMock).toHaveBeenCalledWith('/articles/trending?window=DAY&limit=9');
    expect(response[0]).toMatchObject({
      boardSlug: 'free',
      title: '인기 글',
      likeCount: 12,
      trendScore: 21.5,
    });
  });
});
