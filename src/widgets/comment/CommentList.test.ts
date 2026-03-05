import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';

import type { CommentTreeResponse } from '../../features/comment';
import CommentList from './CommentList.vue';

const createComment = (overrides: Partial<CommentTreeResponse> = {}): CommentTreeResponse => ({
  id: 1,
  userId: 10,
  authorName: '댓글작성자',
  content: '댓글 본문',
  depth: 0,
  parentCommentId: null,
  rootCommentId: null,
  createdAt: '2026-03-06T01:00:00.000Z',
  updatedAt: '2026-03-06T01:00:00.000Z',
  deletedAt: null,
  likeCount: 0,
  dislikeCount: 0,
  myReaction: 0,
  children: [],
  ...overrides,
});

const CommentItemStub = defineComponent({
  name: 'CommentItem',
  props: {
    comment: {
      type: Object,
      required: true,
    },
  },
  emits: ['reply', 'update', 'delete', 'reaction'],
  template: `
    <div>
      <button type="button" class="emit-reply" @click="$emit('reply', { parentId: comment.id, content: 'reply' })">reply</button>
      <button type="button" class="emit-update" @click="$emit('update', { commentId: comment.id, content: 'update' })">update</button>
      <button type="button" class="emit-delete" @click="$emit('delete', comment.id)">delete</button>
      <button type="button" class="emit-reaction" @click="$emit('reaction', { commentId: comment.id, reactionType: 1 })">reaction</button>
    </div>
  `,
});

describe('widgets/comment/CommentList', () => {
  it('중첩 댓글에서도 reply/update/delete/reaction 이벤트를 상위로 전파한다', async () => {
    // given
    const comments = [
      createComment({
        id: 100,
        children: [createComment({ id: 200, parentCommentId: 100, rootCommentId: 100, depth: 1 })],
      }),
    ];
    const wrapper = mount(CommentList, {
      props: {
        comments,
        currentUserId: 10,
        articleAuthorId: 10,
        isAuthenticated: true,
      },
      global: {
        stubs: {
          CommentItem: CommentItemStub,
        },
      },
    });

    // when
    const replyButtons = wrapper.findAll('button.emit-reply');
    const updateButtons = wrapper.findAll('button.emit-update');
    const deleteButtons = wrapper.findAll('button.emit-delete');
    const reactionButtons = wrapper.findAll('button.emit-reaction');
    await replyButtons[1]?.trigger('click');
    await updateButtons[1]?.trigger('click');
    await deleteButtons[1]?.trigger('click');
    await reactionButtons[1]?.trigger('click');

    // then
    expect(replyButtons).toHaveLength(2);
    expect(wrapper.emitted('reply')).toEqual([[{ parentId: 200, content: 'reply' }]]);
    expect(wrapper.emitted('update')).toEqual([[{ commentId: 200, content: 'update' }]]);
    expect(wrapper.emitted('delete')).toEqual([[200]]);
    expect(wrapper.emitted('reaction')).toEqual([[{ commentId: 200, reactionType: 1 }]]);
  });
});
