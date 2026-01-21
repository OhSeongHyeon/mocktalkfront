<script setup lang="ts">
import { computed, ref } from 'vue';

import type { CommentTreeResponse } from '../services/comments';
import thumbDownIcon from '../assets/icons/icon-thumb-down.svg';
import thumbUpIcon from '../assets/icons/icon-thumb-up.svg';

interface CommentItemProps {
  comment: CommentTreeResponse;
  currentUserId: number | null;
  articleAuthorId: number | null;
  isAuthenticated: boolean;
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

const isDeleted = computed(() => props.comment.deletedAt !== null || props.comment.content === '삭제된 댓글입니다.');
const isOwner = computed(() => props.currentUserId !== null && props.comment.userId === props.currentUserId);
const isArticleAuthor = computed(() => props.articleAuthorId !== null && props.comment.userId === props.articleAuthorId);
const cardClass = computed(() =>
  [
    'rounded-2xl border px-4 py-3 shadow-sm',
    isDeleted.value
      ? 'border-slate-200/70 bg-slate-50 text-slate-400 dark:border-slate-800/70 dark:bg-slate-900/40 dark:text-slate-500'
      : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200',
  ].join(' '),
);

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

const submitReply = () => {
  if (!replyContent.value.trim()) {
    return;
  }
  emit('reply', { parentId: props.comment.id, content: replyContent.value.trim() });
  replyContent.value = '';
  isReplying.value = false;
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
      : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900',
  ].join(' '),
);

const dislikeButtonClass = computed(() =>
  [
    'flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
    props.comment.myReaction === -1
      ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200'
      : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900',
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
</script>

<template>
  <div :class="cardClass">
    <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-semibold" :class="isOwner ? 'text-blue-600 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'">
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
        <span v-if="isEdited" class="text-[11px] font-semibold text-slate-500 dark:text-slate-300">수정 {{ formattedUpdatedAt }}</span>
      </div>
      <div v-if="!isDeleted" class="flex flex-wrap items-center gap-3 text-[11px]">
        <div class="flex items-center gap-2">
          <button type="button" :class="likeButtonClass" :disabled="!isAuthenticated" aria-label="댓글 좋아요" @click="toggleReaction(1)">
            <img :src="thumbUpIcon" alt="" aria-hidden="true" class="h-3.5 w-3.5" />
            <span>{{ comment.likeCount }}</span>
          </button>
          <button type="button" :class="dislikeButtonClass" :disabled="!isAuthenticated" aria-label="댓글 싫어요" @click="toggleReaction(-1)">
            <img :src="thumbDownIcon" alt="" aria-hidden="true" class="h-3.5 w-3.5" />
            <span>{{ comment.dislikeCount }}</span>
          </button>
        </div>
        <div v-if="isAuthenticated" class="flex items-center gap-2 text-[11px]">
          <button type="button" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700" @click="toggleReply">답글</button>
          <button v-if="isOwner" type="button" class="text-xs font-semibold text-slate-500 hover:text-slate-700" @click="toggleEdit">수정</button>
          <button v-if="isOwner" type="button" class="text-xs font-semibold text-rose-500 hover:text-rose-600" @click="remove">삭제</button>
        </div>
      </div>
    </div>

    <div class="mt-2 text-sm">
      <template v-if="isEditing">
        <textarea
          v-model="editContent"
          rows="3"
          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-emerald-500/20"
        ></textarea>
        <div class="mt-2 flex items-center gap-2">
          <button
            type="button"
            class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
            @click="submitEdit"
          >
            저장
          </button>
          <button type="button" class="rounded-full border border-slate-200 px-3 py-1 text-xs" @click="toggleEdit">취소</button>
        </div>
      </template>
      <template v-else>
        {{ comment.content }}
      </template>
    </div>

    <div v-if="isReplying" class="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <textarea
        v-model="replyContent"
        rows="2"
        placeholder="답글을 입력하세요"
        class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-emerald-500/20"
      ></textarea>
      <div class="mt-2 flex items-center gap-2">
        <button
          type="button"
          class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
          @click="submitReply"
        >
          등록
        </button>
        <button type="button" class="rounded-full border border-slate-200 px-3 py-1 text-xs" @click="toggleReply">취소</button>
      </div>
    </div>
  </div>
</template>
