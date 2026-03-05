import { beforeEach, describe, expect, it, vi } from 'vitest';

import { request } from '../../../shared/lib/http/api';
import { createReply, getArticleComments, toggleCommentReaction } from './commentApi';

vi.mock('../../../shared/lib/http/api', () => ({
  request: vi.fn(),
}));

const requestMock = vi.mocked(request);

describe('features/comment/api/commentApi contract', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('getArticleComments는 필수/nullable 필드를 포함한 댓글 트리를 반환한다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: 1,
            userId: 11,
            authorName: '루트 작성자',
            content: '루트 댓글',
            depth: 0,
            parentCommentId: null,
            rootCommentId: null,
            createdAt: '2026-03-06T01:00:00.000Z',
            updatedAt: '2026-03-06T01:00:00.000Z',
            deletedAt: null,
            likeCount: 2,
            dislikeCount: 0,
            myReaction: 0,
            children: [
              {
                id: 2,
                userId: 12,
                authorName: '자식 작성자',
                content: '대댓글',
                depth: 1,
                parentCommentId: 1,
                rootCommentId: 1,
                createdAt: '2026-03-06T01:01:00.000Z',
                updatedAt: '2026-03-06T01:01:00.000Z',
                deletedAt: null,
                likeCount: 1,
                dislikeCount: 0,
                myReaction: 1,
                children: [],
              },
            ],
          },
        ],
        page: 2,
        size: 15,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: true,
      },
    });

    // when
    const response = await getArticleComments(77, 2, 15);

    // then
    expect(requestMock).toHaveBeenCalledWith('/articles/77/comments?page=2&size=15');
    expect(response.items[0]).toMatchObject({
      id: 1,
      parentCommentId: null,
      rootCommentId: null,
      deletedAt: null,
    });
    expect(response.items[0]?.children[0]).toMatchObject({
      id: 2,
      parentCommentId: 1,
      rootCommentId: 1,
    });
  });

  it('createReply는 JSON body로 parent 기준 답글 생성을 요청한다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: {
        id: 9,
        userId: 11,
        authorName: '작성자',
        content: '답글',
        depth: 1,
        parentCommentId: 5,
        rootCommentId: 5,
        createdAt: '2026-03-06T01:02:00.000Z',
        updatedAt: '2026-03-06T01:02:00.000Z',
        deletedAt: null,
        likeCount: 0,
        dislikeCount: 0,
        myReaction: 0,
        children: [],
      },
    });

    // when
    await createReply(3, 5, '답글');

    // then
    expect(requestMock).toHaveBeenCalledWith('/articles/3/comments/5', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: '답글' }),
    });
  });

  it('toggleCommentReaction은 reactionType 계약을 유지한다', async () => {
    // given
    requestMock.mockResolvedValue({
      success: true,
      data: {
        commentId: 10,
        likeCount: 3,
        dislikeCount: 1,
        myReaction: 1,
      },
    });

    // when
    const response = await toggleCommentReaction(10, 1);

    // then
    expect(requestMock).toHaveBeenCalledWith('/comments/10/reactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reactionType: 1 }),
    });
    expect(response).toEqual({
      commentId: 10,
      likeCount: 3,
      dislikeCount: 1,
      myReaction: 1,
    });
  });
});
