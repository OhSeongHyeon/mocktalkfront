import { describe, expect, it } from 'vitest';

import { createArticleUpsertSnapshot, isArticleUpsertDirty } from './articleUpsertDirty';

describe('shared/lib/articleUpsertDirty', () => {
  it('create 모드에서는 제목이 있으면 dirty로 판단한다', () => {
    expect(
      isArticleUpsertDirty(
        {
          title: '제목',
          contentSource: '',
          contentFormat: 'MARKDOWN',
          visibility: 'PUBLIC',
          selectedCategoryId: null,
          attachmentIds: [],
        },
        null,
        'create',
      ),
    ).toBe(true);
  });

  it('edit 모드에서는 baseline과 동일하면 dirty가 아니다', () => {
    const baseline = createArticleUpsertSnapshot({
      title: '제목',
      contentSource: '본문',
      contentFormat: 'MARKDOWN',
      visibility: 'PUBLIC',
      selectedCategoryId: null,
      attachmentIds: [2, 1],
    });

    expect(
      isArticleUpsertDirty(
        {
          title: '제목',
          contentSource: '본문',
          contentFormat: 'MARKDOWN',
          visibility: 'PUBLIC',
          selectedCategoryId: null,
          attachmentIds: [1, 2],
        },
        baseline,
        'edit',
      ),
    ).toBe(false);
  });

  it('edit 모드에서는 본문이 바뀌면 dirty로 판단한다', () => {
    const baseline = createArticleUpsertSnapshot({
      title: '제목',
      contentSource: '본문',
      contentFormat: 'MARKDOWN',
      visibility: 'PUBLIC',
      selectedCategoryId: null,
      attachmentIds: [],
    });

    expect(
      isArticleUpsertDirty(
        {
          title: '제목',
          contentSource: '수정된 본문',
          contentFormat: 'MARKDOWN',
          visibility: 'PUBLIC',
          selectedCategoryId: null,
          attachmentIds: [],
        },
        baseline,
        'edit',
      ),
    ).toBe(true);
  });
});
