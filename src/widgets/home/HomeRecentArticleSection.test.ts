import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArticleRecentItemResponse } from '../../entities/article';
import { getRecentArticles } from '../../entities/article';
import HomeRecentArticleSection from './HomeRecentArticleSection.vue';

vi.mock('../../entities/article', async () => {
  const actual = await vi.importActual<typeof import('../../entities/article')>('../../entities/article');
  return {
    ...actual,
    getRecentArticles: vi.fn(),
  };
});

const getRecentArticlesMock = vi.mocked(getRecentArticles);

const createArticle = (id: number): ArticleRecentItemResponse => ({
  id,
  boardId: 10,
  boardSlug: 'free',
  boardName: '자유게시판',
  userId: 20,
  authorName: `작성자${id}`,
  title: `게시글 ${id}`,
  previewText: `본문 ${id}`,
  commentCount: id,
  likeCount: id + 1,
  hit: id + 2,
  createdAt: '2026-03-11T00:00:00.000Z',
});

describe('widgets/home/HomeRecentArticleSection', () => {
  beforeEach(() => {
    getRecentArticlesMock.mockReset();
  });

  it('처음에 15개를 불러오고 더보기 클릭 시 다음 15개를 이어서 렌더링한다', async () => {
    // given
    getRecentArticlesMock
      .mockResolvedValueOnce({
        items: [createArticle(1), createArticle(2)],
        page: 0,
        size: 15,
        hasNext: true,
        hasPrevious: false,
      })
      .mockResolvedValueOnce({
        items: [createArticle(3), createArticle(4)],
        page: 1,
        size: 15,
        hasNext: false,
        hasPrevious: true,
      });

    const wrapper = mount(HomeRecentArticleSection, {
      global: {
        stubs: {
          ArticleFeedCard: {
            props: ['article'],
            template: '<div class="feed-card">{{ article.title }}</div>',
          },
        },
      },
    });

    await flushPromises();

    // when
    const loadMoreButton = wrapper.get('button');
    await loadMoreButton.trigger('click');
    await flushPromises();

    // then
    expect(getRecentArticlesMock).toHaveBeenNthCalledWith(1, 0, 15);
    expect(getRecentArticlesMock).toHaveBeenNthCalledWith(2, 1, 15);
    expect(wrapper.findAll('.feed-card')).toHaveLength(4);
    expect(wrapper.text()).not.toContain('더보기');
  });
});
