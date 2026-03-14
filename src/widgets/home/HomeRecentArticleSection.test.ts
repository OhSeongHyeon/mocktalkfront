import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArticleRecentItemResponse, ArticleTrendingItemResponse } from '../../entities/article';
import { getRecentArticles, getTrendingArticles } from '../../entities/article';
import HomeRecentArticleSection from './HomeRecentArticleSection.vue';

vi.mock('../../entities/article', async () => {
  const actual = await vi.importActual<typeof import('../../entities/article')>('../../entities/article');
  return {
    ...actual,
    getRecentArticles: vi.fn(),
    getTrendingArticles: vi.fn(),
  };
});

const getRecentArticlesMock = vi.mocked(getRecentArticles);
const getTrendingArticlesMock = vi.mocked(getTrendingArticles);

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

const createTrendingArticle = (id: number): ArticleTrendingItemResponse => ({
  articleId: id,
  boardId: 30,
  boardSlug: 'free',
  userId: 20,
  authorName: `인기작성자${id}`,
  title: `트렌딩 게시글 ${id}`,
  hit: id + 5,
  commentCount: id + 2,
  likeCount: id + 4,
  dislikeCount: 0,
  trendScore: id + 10.5,
  createdAt: '2026-03-11T00:00:00.000Z',
});

describe('widgets/home/HomeRecentArticleSection', () => {
  beforeEach(() => {
    getRecentArticlesMock.mockReset();
    getTrendingArticlesMock.mockReset();
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
    getTrendingArticlesMock.mockResolvedValue([]);

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
    const loadMoreButton = wrapper.get('[data-testid="home-recent-load-more"]');
    await loadMoreButton.trigger('click');
    await flushPromises();

    // then
    expect(getRecentArticlesMock).toHaveBeenNthCalledWith(1, 0, 15);
    expect(getRecentArticlesMock).toHaveBeenNthCalledWith(2, 1, 15);
    expect(wrapper.findAll('.feed-card')).toHaveLength(4);
    expect(wrapper.text()).not.toContain('더보기');
  });

  it('트렌딩 탭을 누르면 일간 트렌딩 글을 불러와 렌더링한다', async () => {
    // given
    getRecentArticlesMock.mockResolvedValue({
      items: [createArticle(1)],
      page: 0,
      size: 15,
      hasNext: false,
      hasPrevious: false,
    });
    getTrendingArticlesMock.mockResolvedValue([createTrendingArticle(11), createTrendingArticle(12)]);

    const wrapper = mount(HomeRecentArticleSection, {
      global: {
        stubs: {
          ArticleFeedCard: {
            props: ['article'],
            template: '<div class="feed-card">{{ article.title }}</div>',
          },
          ArticleTrendingCard: {
            props: ['article'],
            template: '<div class="trending-card">{{ article.title }}</div>',
          },
        },
      },
    });

    await flushPromises();

    // when
    await wrapper.get('[data-testid="home-article-tab-trending"]').trigger('click');
    await flushPromises();

    // then
    expect(getTrendingArticlesMock).toHaveBeenCalledWith('DAY', 9);
    expect(wrapper.findAll('.trending-card')).toHaveLength(2);
    expect(wrapper.text()).toContain('트렌딩 게시글 11');
  });
});
