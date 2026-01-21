<script setup lang="ts">
import type { CommentTreeResponse } from '../services/comments';

import CommentItem from './CommentItem.vue';

interface CommentListProps {
  comments: CommentTreeResponse[];
  currentUserId: number | null;
  articleAuthorId: number | null;
  isAuthenticated: boolean;
  depth?: number;
  focusCommentId?: number | null;
}

const props = defineProps<CommentListProps>();
const emit = defineEmits<{
  (event: 'reply', payload: { parentId: number; content: string }): void;
  (event: 'update', payload: { commentId: number; content: string }): void;
  (event: 'delete', commentId: number): void;
  (event: 'reaction', payload: { commentId: number; reactionType: number }): void;
}>();

const depthValue = props.depth ?? 0;
</script>

<template>
  <div class="space-y-4">
    <div v-for="comment in comments" :key="comment.id" class="flex gap-4">
      <div v-if="depthValue > 0" class="mt-2 h-full w-6 border-l-2 border-slate-200/70 dark:border-slate-800/70"></div>
      <div class="flex-1">
        <CommentItem
          :comment="comment"
          :current-user-id="currentUserId"
          :article-author-id="articleAuthorId"
          :is-authenticated="isAuthenticated"
          :focus-comment-id="focusCommentId"
          @reply="emit('reply', $event)"
          @update="emit('update', $event)"
          @delete="emit('delete', $event)"
          @reaction="emit('reaction', $event)"
        />
        <div v-if="comment.children.length > 0" class="mt-4 pl-6">
          <CommentList
            :comments="comment.children"
            :current-user-id="currentUserId"
            :article-author-id="articleAuthorId"
            :is-authenticated="isAuthenticated"
            :depth="depthValue + 1"
            :focus-comment-id="focusCommentId"
            @reply="emit('reply', $event)"
            @update="emit('update', $event)"
            @delete="emit('delete', $event)"
            @reaction="emit('reaction', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
