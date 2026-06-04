import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type { CommentTreeResponse } from '../../features/comment';
import { i18n } from '../../test/plugins';
import CommentItem from './CommentItem.vue';

const createComment = (overrides: Partial<CommentTreeResponse> = {}): CommentTreeResponse => ({
  id: 10,
  userId: 20,
  authorName: '댓글작성자',
  content: '원본 댓글',
  depth: 0,
  parentCommentId: null,
  rootCommentId: null,
  createdAt: '2026-03-06T01:00:00.000Z',
  updatedAt: '2026-03-06T01:00:00.000Z',
  deletedAt: null,
  likeCount: 2,
  dislikeCount: 1,
  myReaction: 0,
  children: [],
  ...overrides,
});

describe('widgets/comment/CommentItem', () => {
  it('답글 입력 후 Enter를 누르면 reply 이벤트를 trim 처리해 전달한다', async () => {
    // given
    const wrapper = mount(CommentItem, {
      global: {
        plugins: [i18n],
      },
      props: {
        comment: createComment(),
        currentUserId: 20,
        articleAuthorId: 99,
        isAuthenticated: true,
      },
    });

    // when
    const replyButton = wrapper.findAll('button').find((button) => button.text().trim() === '답글');
    if (!replyButton) {
      throw new Error('답글 버튼을 찾지 못했습니다.');
    }
    await replyButton.trigger('click');

    const replyTextarea = wrapper.get('textarea[placeholder="답글을 입력하세요"]');
    await replyTextarea.setValue('  답글 내용  ');
    await replyTextarea.trigger('keydown', { key: 'Enter', keyCode: 13, shiftKey: false, isComposing: false });

    // then
    expect(wrapper.emitted('reply')).toEqual([[{ parentId: 10, content: '답글 내용' }]]);
  });

  it('수정/삭제/반응 동작 시 update, delete, reaction 이벤트를 전달한다', async () => {
    // given
    const wrapper = mount(CommentItem, {
      global: {
        plugins: [i18n],
      },
      props: {
        comment: createComment(),
        currentUserId: 20,
        articleAuthorId: 99,
        isAuthenticated: true,
      },
    });

    // when
    const editButton = wrapper.findAll('button').find((button) => button.text().trim() === '수정');
    if (!editButton) {
      throw new Error('수정 버튼을 찾지 못했습니다.');
    }
    await editButton.trigger('click');
    await wrapper.get('textarea.ui-textarea').setValue('  수정된 댓글  ');
    const saveButton = wrapper.findAll('button').find((button) => button.text().trim() === '저장');
    if (!saveButton) {
      throw new Error('저장 버튼을 찾지 못했습니다.');
    }
    await saveButton.trigger('click');

    const deleteButton = wrapper.findAll('button').find((button) => button.text().trim() === '삭제');
    if (!deleteButton) {
      throw new Error('삭제 버튼을 찾지 못했습니다.');
    }
    await deleteButton.trigger('click');
    await wrapper.get('button[aria-label="댓글 좋아요"]').trigger('click');
    await wrapper.get('button[aria-label="댓글 싫어요"]').trigger('click');

    // then
    expect(wrapper.emitted('update')).toEqual([[{ commentId: 10, content: '수정된 댓글' }]]);
    expect(wrapper.emitted('delete')).toEqual([[10]]);
    expect(wrapper.emitted('reaction')).toEqual([[{ commentId: 10, reactionType: 1 }], [{ commentId: 10, reactionType: -1 }]]);
  });
});
