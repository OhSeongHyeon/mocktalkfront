<script setup lang="ts">
import { computed, ref } from 'vue';

import type { CommentTreeResponse } from '../services/comments';

interface CommentItemProps {
  comment: CommentTreeResponse;
  currentUserId: number | null;
  isAuthenticated: boolean;
}

const props = defineProps<CommentItemProps>();
const emit = defineEmits<{
  (event: 'reply', payload: { parentId: number; content: string }): void;
  (event: 'update', payload: { commentId: number; content: string }): void;
  (event: 'delete', commentId: number): void;
}>();

const isReplying = ref(false);
const isEditing = ref(false);
const replyContent = ref('');
const editContent = ref(props.comment.content);

const isDeleted = computed(() => props.comment.deletedAt !== null || props.comment.content === '삭제된 댓글입니다.');
const isOwner = computed(() => props.currentUserId !== null && props.comment.userId === props.currentUserId);
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
  return props.comment.updatedAt !== props.comment.createdAt;
});
</script>

<template>
  <div :class="cardClass">
    <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-semibold" :class="isOwner ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'">
          {{ comment.authorName }}
        </span>
        <span v-if="isOwner" class="text-[11px] font-semibold text-emerald-500/80 dark:text-emerald-300/80">작성자</span>
        <span>{{ formattedCreatedAt }}</span>
        <span v-if="isEdited" class="text-[11px] text-slate-400">수정 {{ formattedUpdatedAt }}</span>
      </div>
      <div v-if="isAuthenticated && !isDeleted" class="flex items-center gap-2 text-[11px]">
        <button type="button" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700" @click="toggleReply">답글</button>
        <button v-if="isOwner" type="button" class="text-xs font-semibold text-slate-500 hover:text-slate-700" @click="toggleEdit">수정</button>
        <button v-if="isOwner" type="button" class="text-xs font-semibold text-rose-500 hover:text-rose-600" @click="remove">삭제</button>
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
