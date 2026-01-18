<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import type { Level } from '@tiptap/extension-heading';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Mention from '@tiptap/extension-mention';
import HardBreak from '@tiptap/extension-hard-break';
import { TextSelection } from 'prosemirror-state';

import { Video } from '../lib/editor/video';
import { mentionSuggestion } from '../lib/editor/mentionSuggestion';
import { uploadEditorFile } from '../services/files';
import { resolveFileUrl } from '../lib/files';

interface ArticleEditorProps {
  modelValue: string;
  placeholder?: string;
}

type UploadKind = 'image' | 'video';

const props = defineProps<ArticleEditorProps>();
const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
const VIDEO_TYPES = ['video/mp4', 'video/webm'];

const errorMessage = ref<string | null>(null);
const uploadCount = ref(0);
const imageInputRef = ref<HTMLInputElement | null>(null);
const videoInputRef = ref<HTMLInputElement | null>(null);

const CustomHardBreak = HardBreak.extend({
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.setHardBreak(),
      'Shift-Enter': () => this.editor.commands.splitBlock(),
    };
  },
});

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      hardBreak: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    }),
    Underline,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    Image,
    Video,
    Youtube.configure({
      controls: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Mention.configure({
      HTMLAttributes: {
        class: 'mention',
      },
      suggestion: mentionSuggestion,
      renderLabel({ node }) {
        return `@${node.attrs.label ?? node.attrs.id}`;
      },
    }),
    CustomHardBreak,
    Placeholder.configure({
      placeholder: props.placeholder ?? '본문을 입력하세요.',
    }),
  ],
  editorProps: {
    handleDrop(view, event) {
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length === 0) {
        return false;
      }
      event.preventDefault();
      const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
      if (coords?.pos) {
        editor.value?.commands.setTextSelection(coords.pos);
      }
      void handleFiles(files);
      return true;
    },
    handlePaste(_view, event) {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length === 0) {
        return false;
      }
      event.preventDefault();
      void handleFiles(files);
      return true;
    },
  },
  onUpdate({ editor: instance }) {
    emit('update:modelValue', instance.getHTML());
  },
});

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) {
      return;
    }
    const current = editor.value.getHTML();
    if (value !== current) {
      editor.value.commands.setContent(value, false);
    }
  },
);

onBeforeUnmount(() => {
  editor.value?.destroy();
});

const showError = (message: string) => {
  errorMessage.value = message;
  window.setTimeout(() => {
    if (errorMessage.value === message) {
      errorMessage.value = null;
    }
  }, 4000);
};

const detectUploadKind = (file: File): UploadKind | null => {
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  if (VIDEO_TYPES.includes(file.type)) {
    return 'video';
  }
  return null;
};

const insertUploadedFile = (kind: UploadKind, url: string, file: File) => {
  if (!editor.value) {
    return;
  }
  const { state, view, schema } = editor.value;
  const nodeType = kind === 'image' ? schema.nodes.image : schema.nodes.video;
  if (!nodeType) {
    return;
  }
  const attrs = kind === 'image' ? { src: url, alt: file.name } : { src: url, controls: true };
  const node = nodeType.create(attrs);
  const insertPos = state.selection.from;
  const tr = state.tr.replaceSelectionWith(node, false);
  const nextPos = Math.min(tr.doc.content.size, insertPos + node.nodeSize);
  tr.setSelection(TextSelection.create(tr.doc, nextPos));
  view.dispatch(tr);
  view.focus();
};

const handleFiles = async (files: File[]) => {
  if (!editor.value) {
    return;
  }
  uploadCount.value += 1;
  try {
    for (const file of files) {
      const kind = detectUploadKind(file);
      if (!kind) {
        showError('이미지 또는 MP4/WebM 영상만 업로드할 수 있습니다.');
        continue;
      }
      if (file.size > MAX_UPLOAD_SIZE) {
        showError('파일 사이즈 제한 50MB');
        continue;
      }
      try {
        const uploaded = await uploadEditorFile(file);
        const url = resolveFileUrl(uploaded.storageKey);
        if (!url) {
          showError('파일 URL 생성에 실패했습니다.');
          continue;
        }
        insertUploadedFile(kind, url, file);
      } catch {
        showError('파일 업로드에 실패했습니다.');
      }
    }
  } finally {
    uploadCount.value = Math.max(0, uploadCount.value - 1);
  }
};

const openImagePicker = () => imageInputRef.value?.click();
const openVideoPicker = () => videoInputRef.value?.click();

const onImagePicked = async (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const files = target?.files ? Array.from(target.files) : [];
  if (files.length > 0) {
    await handleFiles(files);
  }
  if (target) {
    target.value = '';
  }
};

const onVideoPicked = async (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const files = target?.files ? Array.from(target.files) : [];
  if (files.length > 0) {
    await handleFiles(files);
  }
  if (target) {
    target.value = '';
  }
};

const focusEditor = () => {
  editor.value?.chain().focus().run();
};

const toggleBold = () => editor.value?.chain().focus().toggleBold().run();
const toggleItalic = () => editor.value?.chain().focus().toggleItalic().run();
const toggleUnderline = () => editor.value?.chain().focus().toggleUnderline().run();
const toggleStrike = () => editor.value?.chain().focus().toggleStrike().run();
const toggleBulletList = () => editor.value?.chain().focus().toggleBulletList().run();
const toggleOrderedList = () => editor.value?.chain().focus().toggleOrderedList().run();
const toggleBlockquote = () => editor.value?.chain().focus().toggleBlockquote().run();
const toggleCodeBlock = () => editor.value?.chain().focus().toggleCodeBlock().run();
const setParagraph = () => editor.value?.chain().focus().setParagraph().run();
const setHeading = (level: Level) => editor.value?.chain().focus().toggleHeading({ level }).run();
const setHorizontalRule = () => editor.value?.chain().focus().setHorizontalRule().run();
const setTextAlign = (alignment: 'left' | 'center' | 'right' | 'justify') => editor.value?.chain().focus().setTextAlign(alignment).run();
const undo = () => editor.value?.chain().focus().undo().run();
const redo = () => editor.value?.chain().focus().redo().run();
const startMention = () => editor.value?.chain().focus().insertContent('@').run();

const setLink = () => {
  if (!editor.value) {
    return;
  }
  const previousUrl = editor.value.getAttributes('link').href as string | undefined;
  const url = window.prompt('링크 URL을 입력하세요.', previousUrl ?? '');
  if (url === null) {
    return;
  }
  if (url.trim() === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
};

const addYoutube = () => {
  if (!editor.value) {
    return;
  }
  const url = window.prompt('유튜브 URL을 입력하세요.');
  if (!url) {
    return;
  }
  const embedUrl = normalizeYoutubeUrl(url.trim());
  if (!embedUrl) {
    window.alert('유튜브 URL 형식이 올바르지 않습니다.');
    return;
  }
  editor.value.chain().focus().setYoutubeVideo({ src: embedUrl }).run();
};

const normalizeYoutubeUrl = (raw: string) => {
  try {
    const url = new URL(raw);
    if (!['www.youtube.com', 'youtube.com', 'youtu.be'].includes(url.hostname)) {
      return null;
    }
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.replace('/', '').trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.pathname.startsWith('/embed/')) {
      return `https://www.youtube.com${url.pathname}`;
    }
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.pathname.startsWith('/shorts/')) {
      const id = url.pathname.split('/').pop();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
};

const insertTable = () => editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
const addColumnAfter = () => editor.value?.chain().focus().addColumnAfter().run();
const deleteColumn = () => editor.value?.chain().focus().deleteColumn().run();
const addRowAfter = () => editor.value?.chain().focus().addRowAfter().run();
const deleteRow = () => editor.value?.chain().focus().deleteRow().run();
const deleteTable = () => editor.value?.chain().focus().deleteTable().run();

const buttonClass = (active = false) =>
  [
    'rounded-md border px-2.5 py-1 text-xs font-semibold transition',
    active
      ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/70 dark:bg-emerald-500/10 dark:text-emerald-200'
      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white',
  ].join(' ');

const toolbarDividerClass = 'h-5 w-px bg-slate-200 dark:bg-slate-800';
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
    <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      <button type="button" :class="buttonClass(editor?.isActive('bold'))" @click="toggleBold">굵게</button>
      <button type="button" :class="buttonClass(editor?.isActive('italic'))" @click="toggleItalic">기울임</button>
      <button type="button" :class="buttonClass(editor?.isActive('underline'))" @click="toggleUnderline">밑줄</button>
      <button type="button" :class="buttonClass(editor?.isActive('strike'))" @click="toggleStrike">취소선</button>
      <button type="button" :class="buttonClass(editor?.isActive('bulletList'))" @click="toggleBulletList">글머리</button>
      <button type="button" :class="buttonClass(editor?.isActive('orderedList'))" @click="toggleOrderedList">번호</button>
      <button type="button" :class="buttonClass(editor?.isActive('blockquote'))" @click="toggleBlockquote">인용</button>
      <button type="button" :class="buttonClass(editor?.isActive('codeBlock'))" @click="toggleCodeBlock">코드</button>
      <span :class="toolbarDividerClass" aria-hidden="true"></span>
      <button type="button" :class="buttonClass(editor?.isActive('heading', { level: 1 }))" @click="setHeading(1)">H1</button>
      <button type="button" :class="buttonClass(editor?.isActive('heading', { level: 2 }))" @click="setHeading(2)">H2</button>
      <button type="button" :class="buttonClass(editor?.isActive('heading', { level: 3 }))" @click="setHeading(3)">H3</button>
      <button type="button" :class="buttonClass(editor?.isActive('paragraph'))" @click="setParagraph">문단</button>
      <span :class="toolbarDividerClass" aria-hidden="true"></span>
      <button type="button" :class="buttonClass(editor?.isActive({ textAlign: 'left' }))" @click="setTextAlign('left')">좌측</button>
      <button type="button" :class="buttonClass(editor?.isActive({ textAlign: 'center' }))" @click="setTextAlign('center')">중앙</button>
      <button type="button" :class="buttonClass(editor?.isActive({ textAlign: 'right' }))" @click="setTextAlign('right')">우측</button>
      <button type="button" :class="buttonClass(editor?.isActive({ textAlign: 'justify' }))" @click="setTextAlign('justify')">양쪽</button>
      <span :class="toolbarDividerClass" aria-hidden="true"></span>
      <button type="button" :class="buttonClass()" @click="setHorizontalRule">구분선</button>
      <button type="button" :class="buttonClass(editor?.isActive('link'))" @click="setLink">링크</button>
      <button type="button" :class="buttonClass()" @click="openImagePicker">이미지</button>
      <button type="button" :class="buttonClass()" @click="openVideoPicker">영상</button>
      <button type="button" :class="buttonClass()" @click="addYoutube">유튜브</button>
      <button type="button" :class="buttonClass()" @click="startMention">멘션</button>
      <span :class="toolbarDividerClass" aria-hidden="true"></span>
      <button type="button" :class="buttonClass()" @click="insertTable">테이블</button>
      <button type="button" :class="buttonClass()" @click="addRowAfter">행+</button>
      <button type="button" :class="buttonClass()" @click="deleteRow">행-</button>
      <button type="button" :class="buttonClass()" @click="addColumnAfter">열+</button>
      <button type="button" :class="buttonClass()" @click="deleteColumn">열-</button>
      <button type="button" :class="buttonClass()" @click="deleteTable">표삭제</button>
      <span :class="toolbarDividerClass" aria-hidden="true"></span>
      <button type="button" :class="buttonClass()" @click="undo">되돌리기</button>
      <button type="button" :class="buttonClass()" @click="redo">다시</button>
      <span v-if="uploadCount > 0" class="text-xs font-semibold text-emerald-600 dark:text-emerald-300"> 업로드 중... </span>
    </div>
    <EditorContent :editor="editor" class="min-h-[360px] px-4 py-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200" @click="focusEditor" />
    <div class="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
      단축키: Ctrl/Cmd+B 굵게, Ctrl/Cmd+I 기울임, Ctrl/Cmd+K 링크, Ctrl/Cmd+Z 되돌리기, Ctrl/Cmd+Y 다시, Enter 줄바꿈, Shift+Enter 문단. 이미지/영상은
      드래그&드롭 가능.
    </div>
    <div v-if="errorMessage" class="border-t border-slate-200 px-4 py-2 text-xs text-rose-600 dark:border-slate-800">
      {{ errorMessage }}
    </div>
    <input ref="imageInputRef" type="file" accept="image/*" class="hidden" multiple @change="onImagePicked" />
    <input ref="videoInputRef" type="file" accept="video/mp4,video/webm" class="hidden" multiple @change="onVideoPicked" />
  </div>
</template>

<style scoped>
:deep(.ProseMirror) {
  outline: none;
}

:deep(.ProseMirror table) {
  width: 100%;
  border-collapse: collapse;
}

:deep(.ProseMirror th),
:deep(.ProseMirror td) {
  border: 1px solid rgba(148, 163, 184, 0.4);
  padding: 0.5rem;
  text-align: left;
}

:deep(.dark .ProseMirror th),
:deep(.dark .ProseMirror td) {
  border-color: rgba(148, 163, 184, 0.25);
}

:deep(.ProseMirror pre) {
  background: rgba(15, 23, 42, 0.04);
  border-radius: 0.5rem;
  padding: 0.75rem;
}

:deep(.dark .ProseMirror pre) {
  background: rgba(15, 23, 42, 0.5);
}

:deep(.mention) {
  color: #0f766e;
  font-weight: 600;
}

:deep(.dark .mention) {
  color: #5eead4;
}
</style>
