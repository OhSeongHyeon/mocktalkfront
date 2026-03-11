import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('stores/articleList characterization', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
    setActivePinia(createPinia());
  });

  it('기본값으로 페이지 크기와 정렬 순서를 초기화한다', async () => {
    // given

    // when
    const { useArticleListStore } = await import('./articleList');
    const articleListStore = useArticleListStore();

    // then
    expect(articleListStore.articleListPageSize).toBe(10);
    expect(articleListStore.articleListOrder).toBe('LATEST');
  });

  it('목록 설정을 변경하면 로컬 저장소에 반영한다', async () => {
    // given
    const { useArticleListStore } = await import('./articleList');
    const articleListStore = useArticleListStore();

    // when
    articleListStore.setArticleListPageSize(30);
    articleListStore.setArticleListOrder('OLDEST');
    await nextTick();

    // then
    expect(articleListStore.articleListPageSize).toBe(30);
    expect(articleListStore.articleListOrder).toBe('OLDEST');
    expect(window.localStorage.getItem('board.articleListPageSize')).toBe('30');
    expect(window.localStorage.getItem('board.articleListOrder')).toBe('OLDEST');
  });

  it('잘못된 페이지 크기 저장값은 기본값으로 보정한다', async () => {
    // given
    window.localStorage.setItem('board.articleListPageSize', '999');

    // when
    const { useArticleListStore } = await import('./articleList');
    const articleListStore = useArticleListStore();

    // then
    expect(articleListStore.articleListPageSize).toBe(10);
  });
});
