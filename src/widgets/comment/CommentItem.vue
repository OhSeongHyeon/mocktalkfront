<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import { ThumbsDown, ThumbsUp } from '@lucide/vue';

import type { CommentTreeResponse } from '../../features/comment';
import AppIcon from '../../shared/ui/AppIcon.vue';

interface CommentItemProps {
  comment: CommentTreeResponse;
  currentUserId: number | null;
  articleAuthorId: number | null;
  isAuthenticated: boolean;
  focusCommentId?: number | null;
}

const props = defineProps<CommentItemProps>();
const emit = defineEmits<{
  (event: 'reply', payload: { parentId: number; content: string }): void;
  (event: 'update', payload: { commentId: number; content: string }): void;
  (event: 'delete', commentId: number): void;
  (event: 'reaction', payload: { commentId: number; reactionType: number }): void;
}>();

const isReplying = ref(false);
const isEditing = ref(false);
const replyContent = ref('');
const editContent = ref(props.comment.content);
const editTextareaRef = ref<HTMLTextAreaElement | null>(null);
const replyTextareaRef = ref<HTMLTextAreaElement | null>(null);
const COMMENT_TEXTAREA_MAX_HEIGHT = 240;

const isDeleted = computed(() => props.comment.deletedAt !== null || props.comment.content === '삭제된 댓글입니다.');
const isOwner = computed(() => props.currentUserId !== null && props.comment.userId === props.currentUserId);
const isArticleAuthor = computed(() => props.articleAuthorId !== null && props.comment.userId === props.articleAuthorId);
const cardClass = computed(() => ['bbs-comment', isDeleted.value ? 'bbs-comment-deleted' : ''].filter(Boolean).join(' '));
const focusClass = computed(() => (props.focusCommentId === props.comment.id ? 'bbs-comment-focus' : ''));

const toggleReply = () => {
  isReplying.value = !isReplying.value;
  if (!isReplying.value) {
    replyContent.value = '';
  }
};

const toggleEdit = () => {
  isEditing.value = !isEditing.value;
  editContent.value = props.comment.content;
};

const resizeTextareaElement = (textarea: HTMLTextAreaElement | null) => {
  if (!textarea) {
    return;
  }
  textarea.style.height = 'auto';
  const nextHeight = Math.min(textarea.scrollHeight, COMMENT_TEXTAREA_MAX_HEIGHT);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > COMMENT_TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
};

const resizeEditTextarea = () => {
  resizeTextareaElement(editTextareaRef.value);
};

const resizeReplyTextarea = () => {
  resizeTextareaElement(replyTextareaRef.value);
};

const handleEditInput = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }
  resizeTextareaElement(target);
};

const handleReplyInput = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }
  resizeTextareaElement(target);
};

const submitReply = () => {
  if (!replyContent.value.trim()) {
    return;
  }
  emit('reply', { parentId: props.comment.id, content: replyContent.value.trim() });
  replyContent.value = '';
  isReplying.value = false;
};

const handleReplyInputKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) {
    return;
  }
  event.preventDefault();
  if (!replyContent.value.trim()) {
    return;
  }
  submitReply();
};

const submitEdit = () => {
  if (!editContent.value.trim()) {
    return;
  }
  emit('update', { commentId: props.comment.id, content: editContent.value.trim() });
  isEditing.value = false;
};

const remove = () => {
  emit('delete', props.comment.id);
};

const toggleReaction = (reactionType: number) => {
  if (!props.isAuthenticated || isDeleted.value) {
    return;
  }
  emit('reaction', { commentId: props.comment.id, reactionType });
};

const likeButtonClass = computed(() =>
  [
    'flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
    props.comment.myReaction === 1
      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200'
      : 'border-line text-muted hover:bg-surface-1',
  ].join(' '),
);

const dislikeButtonClass = computed(() =>
  [
    'flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
    props.comment.myReaction === -1
      ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200'
      : 'border-line text-muted hover:bg-surface-1',
  ].join(' '),
);

const formattedCreatedAt = computed(() => {
  const date = new Date(props.comment.createdAt);
  if (Number.isNaN(date.getTime())) {
    return props.comment.createdAt;
  }
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
});

const formattedUpdatedAt = computed(() => {
  if (!props.comment.updatedAt) {
    return '';
  }
  const date = new Date(props.comment.updatedAt);
  if (Number.isNaN(date.getTime())) {
    return props.comment.updatedAt;
  }
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
});

const isEdited = computed(() => {
  if (!props.comment.updatedAt) {
    return false;
  }
  const created = new Date(props.comment.createdAt);
  const updated = new Date(props.comment.updatedAt);
  if (!Number.isNaN(created.getTime()) && !Number.isNaN(updated.getTime())) {
    return created.getTime() !== updated.getTime();
  }
  return props.comment.updatedAt !== props.comment.createdAt;
});

watch(
  () => isEditing.value,
  async (value) => {
    if (!value) {
      return;
    }
    await nextTick();
    resizeEditTextarea();
  },
);

watch(
  () => isReplying.value,
  async (value) => {
    if (!value) {
      return;
    }
    await nextTick();
    resizeReplyTextarea();
  },
);
</script>

<template>
  <div :id="`comment-${comment.id}`" :class="[cardClass, focusClass]">
    <div class="bbs-meta flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-semibold" :class="isOwner ? 'text-link' : 'text-ink'">
          {{ comment.authorName }}
        </span>
        <span
          v-if="isOwner && !isArticleAuthor"
          class="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200"
        >
          내 댓글
        </span>
        <span
          v-if="isArticleAuthor"
          class="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
        >
          게시글 작성자
        </span>
        <span>{{ formattedCreatedAt }}</span>
        <span v-if="isEdited" class="text-[11px] font-semibold">수정 {{ formattedUpdatedAt }}</span>
      </div>
      <div v-if="!isDeleted" class="flex flex-wrap items-center gap-3 text-[11px]">
        <div class="flex items-center gap-2">
          <button type="button" :class="likeButtonClass" :disabled="!isAuthenticated" aria-label="댓글 좋아요" @click="toggleReaction(1)">
            <AppIcon :icon="ThumbsUp" :size="14" />
            <span>{{ comment.likeCount }}</span>
          </button>
          <button type="button" :class="dislikeButtonClass" :disabled="!isAuthenticated" aria-label="댓글 싫어요" @click="toggleReaction(-1)">
            <AppIcon :icon="ThumbsDown" :size="14" />
            <span>{{ comment.dislikeCount }}</span>
          </button>
        </div>
        <div v-if="isAuthenticated" class="flex items-center gap-2 text-[11px]">
          <button type="button" class="text-xs font-semibold text-link hover:underline" @click="toggleReply">답글</button>
          <button v-if="isOwner" type="button" class="text-xs font-semibold text-muted hover:text-ink" @click="toggleEdit">수정</button>
          <button v-if="isOwner" type="button" class="text-xs font-semibold text-rose-500 hover:text-rose-600" @click="remove">삭제</button>
        </div>
      </div>
    </div>

    <div class="mt-2 text-sm">
      <template v-if="isEditing">
        <textarea
          ref="editTextareaRef"
          v-model="editContent"
          rows="3"
          class="ui-textarea"
          @focus="resizeEditTextarea"
          @input="handleEditInput"
        ></textarea>
        <div class="mt-2 flex items-center gap-2">
          <button type="button" class="ui-button-accent h-8 px-3 text-xs" @click="submitEdit">저장</button>
          <button type="button" class="ui-button-ghost h-8 px-3 text-xs" @click="toggleEdit">취소</button>
        </div>
      </template>
      <template v-else>
        {{ comment.content }}
      </template>
    </div>

    <div v-if="isReplying" class="bbs-comment-reply-box">
      <textarea
        ref="replyTextareaRef"
        v-model="replyContent"
        rows="2"
        placeholder="답글을 입력하세요"
        class="ui-textarea min-h-[4.5rem]"
        @focus="resizeReplyTextarea"
        @input="handleReplyInput"
        @keydown="handleReplyInputKeydown"
      ></textarea>
      <div class="mt-2 flex items-center gap-2">
        <button type="button" class="ui-button-accent h-8 px-3 text-xs" @click="submitReply">등록</button>
        <button type="button" class="ui-button-ghost h-8 px-3 text-xs" @click="toggleReply">취소</button>
      </div>
    </div>
  </div>
</template>
