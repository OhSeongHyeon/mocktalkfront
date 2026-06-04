import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type { ArticleSummaryResponse } from '../../entities/board';
import { i18n } from '../../test/plugins';
import ArticleList from './ArticleList.vue';

const createArticle = (overrides: Partial<ArticleSummaryResponse> = {}): ArticleSummaryResponse => ({
  id: 1,
  boardId: 10,
  userId: 100,
  authorName: '작성자',
  title: '테스트 게시글',
  categoryId: 7,
  categoryName: '일반',
  hit: 12,
  commentCount: 3,
  likeCount: 5,
  dislikeCount: 1,
  notice: false,
  createdAt: '2026-03-06T00:00:00.000Z',
  ...overrides,
});

describe('widgets/article/ArticleList', () => {
  it('게시글 선택, 정렬 변경, 페이지 변경 이벤트를 전달한다', async () => {
    // given
    const wrapper = mount(ArticleList, {
      props: {
        pinned: [createArticle({ id: 99, title: '공지글', notice: true })],
        articles: [createArticle({ id: 11, title: '일반글' })],
        order: 'LATEST',
        orderOptions: ['LATEST', 'OLDEST'],
        pageSize: 10,
        pageSizeOptions: [10, 20],
        page: 0,
        totalPages: 3,
        hasPrevious: false,
        hasNext: true,
        resolveHref: (article: ArticleSummaryResponse) => `/b/test-board/articles/${article.id}`,
      },
      global: {
        plugins: [i18n],
      },
    });

    // when
    const pinnedLink = wrapper.get('a[href="/b/test-board/articles/99"]');
    const articleLink = wrapper.get('a[href="/b/test-board/articles/11"]');
    await pinnedLink.trigger('click');
    await articleLink.trigger('click');
    await articleLink.trigger('click', { ctrlKey: true });
    await wrapper.get('select[aria-label="정렬"]').setValue('OLDEST');
    await wrapper.get('select[aria-label="표시 개수"]').setValue('20');
    const pageTwoButton = wrapper.findAll('button').find((button) => button.text().trim() === '2');
    if (!pageTwoButton) {
      throw new Error('2페이지 버튼을 찾지 못했습니다.');
    }
    await pageTwoButton.trigger('click');

    // then
    expect(wrapper.emitted('select')).toEqual([[99], [11]]);
    expect(wrapper.emitted('update:order')).toEqual([['OLDEST']]);
    expect(wrapper.emitted('update:pageSize')).toEqual([[20]]);
    expect(wrapper.emitted('update:page')).toEqual([[1]]);
    expect(wrapper.text()).toContain('일반');
  });

  it('게시글이 없고 로딩 중이 아니면 빈 상태 메시지를 보여준다', () => {
    // given
    const wrapper = mount(ArticleList, {
      props: {
        pinned: [],
        articles: [],
        isLoading: false,
        emptyMessage: '비어 있음',
      },
      global: {
        plugins: [i18n],
      },
    });

    // when
    const emptyText = wrapper.text();

    // then
    expect(emptyText).toContain('비어 있음');
  });
});
