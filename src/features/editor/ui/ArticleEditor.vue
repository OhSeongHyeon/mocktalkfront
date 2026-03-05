<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
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
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { common, createLowlight } from 'lowlight';

import { Video } from '../lib/video';
import { FontSize } from '../lib/fontSize';
import type { ImageNaturalSize } from '../lib/imageEditing';
import {
  clampImageScale,
  findImagePositionNear,
  parseImageSizeToPercent,
  parseImageSizeToPixels,
  parsePositiveInteger,
  readImageNaturalSize,
  readImageNaturalSizeFromUrl,
  resolveImageNodePositionFromSelection,
  resolveImageOriginalDimension,
} from '../lib/imageEditing';
import { RichImage } from '../lib/richImage';
import { mentionSuggestion } from '../lib/mentionSuggestion';
import { createSlashCommandExtension, createSlashCommandItems } from '../lib/slashSuggestion';
import { CODE_LANGUAGE_OPTIONS, FONT_FAMILY_OPTIONS, FONT_SIZE_OPTIONS, YOUTUBE_SIZE_OPTIONS } from '../lib/toolbarOptions';
import type { YoutubeSizeValue } from '../lib/toolbarOptions';
import { useUploadQueue } from '../lib/useUploadQueue';
import type { UploadKind } from '../lib/useUploadQueue';
import { uploadEditorFileTask } from '../../../entities/file';
import { resolveFileUrl, resolveFileViewUrl, resolveImageUrl } from '../../../shared/lib/files';
import BaseModal from '../../../shared/ui/BaseModal.vue';
import ArticleEditorToolbarMobile from './ArticleEditorToolbarMobile.vue';
import ArticleEditorToolbarDesktop from './ArticleEditorToolbarDesktop.vue';

interface ArticleEditorProps {
  modelValue: string;
  placeholder?: string;
}

type ImageAlign = 'left' | 'center' | 'right';
type EditorMode = 'wysiwyg' | 'html';
type MobileAccordionKey = 'text' | 'font' | 'structure' | 'insert' | 'table';

const props = defineProps<ArticleEditorProps>();
const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
const SUCCESS_UPLOAD_AUTO_REMOVE_DELAY_MS = 1000;
const VIDEO_TYPES = ['video/mp4', 'video/webm'];
const DEFAULT_IMAGE_SCALE_PERCENT = 100;
const IMAGE_SCALE_MIN_PERCENT = 1;
const IMAGE_SCALE_MAX_PERCENT = 100;
const lowlight = createLowlight(common);

const errorMessage = ref<string | null>(null);
const imageInputRef = ref<HTMLInputElement | null>(null);
const videoInputRef = ref<HTMLInputElement | null>(null);
const isDropActive = ref(false);
const isYoutubeModalOpen = ref(false);
const youtubeUrlInput = ref('');
const youtubeErrorMessage = ref('');
const youtubeInputRef = ref<HTMLInputElement | null>(null);
const isLinkModalOpen = ref(false);
const linkUrlInput = ref('');
const linkErrorMessage = ref('');
const linkInputRef = ref<HTMLInputElement | null>(null);
const textColor = ref('#1f2937');
const highlightColor = ref('#fde68a');
const fontFamily = ref('inherit');
const fontSize = ref('default');
const codeLanguage = ref('plaintext');
const imageScalePercent = ref(DEFAULT_IMAGE_SCALE_PERCENT);
const imageCaption = ref('');
const selectedImagePosition = ref<number | null>(null);
const lastImagePosition = ref<number | null>(null);
const selectedImageSrc = ref<string | null>(null);
const imageOriginalWidth = ref<number | null>(null);
const imageOriginalHeight = ref<number | null>(null);
const editorMode = ref<EditorMode>('wysiwyg');
const htmlSource = ref(props.modelValue);
const isMobileMoreOpen = ref(false);
const mobileAccordionKey = ref<MobileAccordionKey | null>(null);

const youtubeSize = ref<YoutubeSizeValue>('md');

const CustomHardBreak = HardBreak.extend({
  addKeyboardShortcuts() {
    return {
      'Shift-Enter': () => this.editor.commands.setHardBreak(),
    };
  },
});

function openImagePicker() {
  imageInputRef.value?.click();
}

function openVideoPicker() {
  videoInputRef.value?.click();
}

function openYoutubeModal() {
  youtubeUrlInput.value = '';
  youtubeErrorMessage.value = '';
  isYoutubeModalOpen.value = true;
}

function openLinkModal() {
  if (!editor.value) {
    return;
  }
  const previousUrl = editor.value.getAttributes('link').href as string | undefined;
  linkUrlInput.value = previousUrl ?? '';
  linkErrorMessage.value = '';
  isLinkModalOpen.value = true;
}

const slashCommandItems = createSlashCommandItems({
  openImagePicker,
  openVideoPicker,
  openYoutubeModal,
});

function syncSelectionState(instance: Editor) {
  const textStyleAttrs = instance.getAttributes('textStyle') as {
    color?: string;
    fontFamily?: string;
    fontSize?: string;
  };
  if (typeof textStyleAttrs.color === 'string') {
    textColor.value = textStyleAttrs.color;
  }
  fontFamily.value = typeof textStyleAttrs.fontFamily === 'string' ? textStyleAttrs.fontFamily : 'inherit';
  fontSize.value = typeof textStyleAttrs.fontSize === 'string' ? textStyleAttrs.fontSize : 'default';

  if (instance.isActive('codeBlock')) {
    const codeBlockAttrs = instance.getAttributes('codeBlock') as { language?: string };
    codeLanguage.value = codeBlockAttrs.language ?? 'plaintext';
  }

  if (instance.isActive('image')) {
    const resolvedPosition = resolveImageNodePositionFromSelection(instance);
    if (resolvedPosition !== null) {
      selectedImagePosition.value = resolvedPosition;
      lastImagePosition.value = resolvedPosition;
    }
    const attrs = instance.getAttributes('image') as {
      src?: string;
      width?: string;
      height?: string;
      caption?: string;
      originalWidth?: unknown;
      originalHeight?: unknown;
    };
    const targetPosition = resolvedPosition ?? instance.state.selection.from;
    const originalWidth = resolveImageOriginalDimension(instance, targetPosition, attrs.originalWidth, attrs.width, 'width');
    const originalHeight = resolveImageOriginalDimension(instance, targetPosition, attrs.originalHeight, attrs.height, 'height');
    const widthPixels = parseImageSizeToPixels(attrs.width, originalWidth);
    const heightPixels = parseImageSizeToPixels(attrs.height, originalHeight);
    const scaleByWidth = widthPixels !== null && originalWidth !== null && originalWidth > 0 ? Math.round((widthPixels / originalWidth) * 100) : null;
    const scaleByHeight =
      heightPixels !== null && originalHeight !== null && originalHeight > 0 ? Math.round((heightPixels / originalHeight) * 100) : null;
    const scaleByPercent = parseImageSizeToPercent(attrs.width) ?? parseImageSizeToPercent(attrs.height);
    const resolvedScale = clampImageScale(
      scaleByPercent ?? scaleByWidth ?? scaleByHeight ?? DEFAULT_IMAGE_SCALE_PERCENT,
      IMAGE_SCALE_MIN_PERCENT,
      IMAGE_SCALE_MAX_PERCENT,
    );

    selectedImageSrc.value = typeof attrs.src === 'string' && attrs.src.trim().length > 0 ? attrs.src : null;
    imageOriginalWidth.value = originalWidth;
    imageOriginalHeight.value = originalHeight;
    imageScalePercent.value = resolvedScale;
    imageCaption.value = typeof attrs.caption === 'string' ? attrs.caption : '';
    return;
  }
  if (instance.isFocused) {
    selectedImagePosition.value = null;
    imageCaption.value = '';
    imageScalePercent.value = DEFAULT_IMAGE_SCALE_PERCENT;
    imageOriginalWidth.value = null;
    imageOriginalHeight.value = null;
  }
}

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      hardBreak: false,
      codeBlock: false,
    }),
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'plaintext',
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
    TextStyle,
    Color,
    Highlight.configure({
      multicolor: true,
    }),
    FontFamily.configure({
      types: ['textStyle'],
    }),
    FontSize,
    Subscript,
    Superscript,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    RichImage,
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
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
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
    createSlashCommandExtension(slashCommandItems),
    Placeholder.configure({
      placeholder: props.placeholder ?? '본문을 입력하세요.',
    }),
  ],
  editorProps: {
    attributes: {
      class: 'ui-content',
    },
    handleClickOn(view, _pos, node, nodePos) {
      if (node.type.name !== 'image') {
        return false;
      }
      view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos)));
      selectedImagePosition.value = nodePos;
      lastImagePosition.value = nodePos;
      selectedImageSrc.value = typeof node.attrs.src === 'string' && node.attrs.src.length > 0 ? node.attrs.src : null;
      return true;
    },
    handleClick(view, _pos, event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const imageElement = target.closest("figure[data-type='editor-image'] img");
      if (!(imageElement instanceof HTMLImageElement)) {
        return false;
      }
      const domPosition = view.posAtDOM(imageElement, 0);
      let resolvedPos = findImagePositionNear((candidate) => view.state.doc.nodeAt(candidate), domPosition);
      if (resolvedPos === null) {
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (coords?.pos !== undefined) {
          resolvedPos = findImagePositionNear((candidate) => view.state.doc.nodeAt(candidate), coords.pos);
        }
      }
      if (resolvedPos === null) {
        return false;
      }
      view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, resolvedPos)));
      selectedImagePosition.value = resolvedPos;
      lastImagePosition.value = resolvedPos;
      const clickedNode = view.state.doc.nodeAt(resolvedPos);
      selectedImageSrc.value =
        typeof clickedNode?.attrs?.src === 'string' && clickedNode.attrs.src.length > 0 ? clickedNode.attrs.src : selectedImageSrc.value;
      return true;
    },
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
    const html = instance.getHTML();
    htmlSource.value = html;
    emit('update:modelValue', html);
  },
  onSelectionUpdate({ editor: instance }) {
    syncSelectionState(instance);
  },
  onCreate({ editor: instance }) {
    htmlSource.value = instance.getHTML();
    syncSelectionState(instance);
  },
});

const isImageSelected = computed(() => {
  if (editor.value?.isActive('image')) {
    return true;
  }
  if (!editor.value) {
    return false;
  }
  const position = selectedImagePosition.value;
  if (position === null) {
    return false;
  }
  const node = editor.value.state.doc.nodeAt(position);
  return node?.type.name === 'image';
});
const isTableSelected = computed(() => editor.value?.isActive('table') ?? false);
const isHtmlMode = computed(() => editorMode.value === 'html');
const activeImageAlign = computed(() => {
  if (!editor.value) {
    return null;
  }
  let align: string | undefined;
  if (editor.value.isActive('image')) {
    align = editor.value.getAttributes('image').align as string | undefined;
  } else {
    const position = selectedImagePosition.value;
    if (position === null) {
      return null;
    }
    const node = editor.value.state.doc.nodeAt(position);
    if (!node || node.type.name !== 'image') {
      return null;
    }
    align = node.attrs.align as string | undefined;
  }
  if (align === 'center' || align === 'right') {
    return align;
  }
  return 'left';
});

watch(
  () => props.modelValue,
  (value) => {
    if (value !== htmlSource.value) {
      htmlSource.value = value;
    }
    if (isHtmlMode.value) {
      return;
    }
    if (!editor.value) {
      return;
    }
    const current = editor.value.getHTML();
    if (value !== current) {
      editor.value.commands.setContent(value, false);
    }
  },
);

watch(
  () => isYoutubeModalOpen.value,
  (open) => {
    if (!open) {
      return;
    }
    youtubeErrorMessage.value = '';
    window.setTimeout(() => {
      youtubeInputRef.value?.focus();
    }, 0);
  },
);

watch(
  () => isLinkModalOpen.value,
  (open) => {
    if (!open) {
      return;
    }
    linkErrorMessage.value = '';
    window.setTimeout(() => {
      linkInputRef.value?.focus();
    }, 0);
  },
);

watch(
  () => isHtmlMode.value,
  (isHtml) => {
    if (!isHtml) {
      return;
    }
    isMobileMoreOpen.value = false;
    mobileAccordionKey.value = null;
  },
);

const showError = (message: string) => {
  errorMessage.value = message;
  window.setTimeout(() => {
    if (errorMessage.value === message) {
      errorMessage.value = null;
    }
  }, 4000);
};

const resolveUploadKind = (file: File): UploadKind | null => {
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  if (VIDEO_TYPES.includes(file.type)) {
    return 'video';
  }
  return null;
};

const moveCursorAfterSelectedMedia = () => {
  if (!editor.value) {
    return;
  }
  const selection = editor.value.state.selection;
  if (!(selection instanceof NodeSelection)) {
    return;
  }
  const nodeName = selection.node.type.name;
  if (!['image', 'video', 'youtube'].includes(nodeName)) {
    return;
  }
  editor.value.chain().focus().setTextSelection(selection.to).run();
};

const resolveTargetImagePosition = () => {
  if (!editor.value) {
    return null;
  }
  const selectionPosition = resolveImageNodePositionFromSelection(editor.value);
  if (selectionPosition !== null) {
    selectedImagePosition.value = selectionPosition;
    lastImagePosition.value = selectionPosition;
    return selectionPosition;
  }

  const fallbackPositions = [selectedImagePosition.value, lastImagePosition.value];
  for (const fallbackPosition of fallbackPositions) {
    if (fallbackPosition === null) {
      continue;
    }
    const resolvedFallback = findImagePositionNear((candidate) => editor.value?.state.doc.nodeAt(candidate) ?? null, fallbackPosition);
    if (resolvedFallback !== null) {
      selectedImagePosition.value = resolvedFallback;
      lastImagePosition.value = resolvedFallback;
      return resolvedFallback;
    }
  }

  if (selectedImageSrc.value && editor.value) {
    let matchedPosition: number | null = null;
    editor.value.state.doc.descendants((node, position) => {
      if (matchedPosition !== null) {
        return false;
      }
      if (node.type.name !== 'image') {
        return true;
      }
      if (node.attrs.src === selectedImageSrc.value) {
        matchedPosition = position;
        return false;
      }
      return true;
    });
    if (matchedPosition !== null) {
      selectedImagePosition.value = matchedPosition;
      lastImagePosition.value = matchedPosition;
      return matchedPosition;
    }
  }

  selectedImagePosition.value = null;
  lastImagePosition.value = null;
  return null;
};

const updateImageNodeAttributes = (attrs: Record<string, unknown>) => {
  if (!editor.value) {
    return false;
  }
  const position = resolveTargetImagePosition();
  if (position === null) {
    return false;
  }
  const imageNode = editor.value.state.doc.nodeAt(position);
  if (!imageNode || imageNode.type.name !== 'image') {
    return false;
  }
  const mergedAttrs = {
    ...imageNode.attrs,
    ...attrs,
  };

  const commandApplied = editor.value.chain().focus().setNodeSelection(position).updateAttributes('image', mergedAttrs).run();
  if (commandApplied) {
    selectedImagePosition.value = position;
    lastImagePosition.value = position;
    if (typeof mergedAttrs.src === 'string' && mergedAttrs.src.length > 0) {
      selectedImageSrc.value = mergedAttrs.src;
    }
    syncSelectionState(editor.value);
    return true;
  }

  const transaction = editor.value.state.tr.setNodeMarkup(position, undefined, mergedAttrs);
  editor.value.view.dispatch(transaction);
  const fallbackApplied = editor.value.chain().focus().setNodeSelection(position).run();
  if (!fallbackApplied) {
    return false;
  }
  selectedImagePosition.value = position;
  lastImagePosition.value = position;
  if (typeof mergedAttrs.src === 'string' && mergedAttrs.src.length > 0) {
    selectedImageSrc.value = mergedAttrs.src;
  }
  syncSelectionState(editor.value);
  return true;
};

const insertUploadedFile = (kind: UploadKind, url: string, imageNaturalSize: ImageNaturalSize | null) => {
  if (!editor.value) {
    return;
  }
  moveCursorAfterSelectedMedia();
  if (kind === 'image') {
    editor.value
      .chain()
      .focus()
      .insertContent({
        type: 'image',
        attrs: {
          src: url,
          alt: '',
          align: 'left',
          width: imageNaturalSize?.width ? `${Math.round(imageNaturalSize.width)}px` : null,
          height: imageNaturalSize?.height ? `${Math.round(imageNaturalSize.height)}px` : null,
          originalWidth: imageNaturalSize?.width ?? null,
          originalHeight: imageNaturalSize?.height ?? null,
        },
      })
      .run();
    return;
  }
  editor.value
    .chain()
    .focus()
    .setVideo({
      src: url,
      controls: true,
    })
    .run();
};

const resolveImageNaturalSizeForUpload = async (file: File, url: string) => {
  const imageNaturalSizeFromFile = await readImageNaturalSize(file);
  if (imageNaturalSizeFromFile.width !== null && imageNaturalSizeFromFile.height !== null) {
    return imageNaturalSizeFromFile;
  }
  const imageNaturalSizeFromUrl = await readImageNaturalSizeFromUrl(url);
  return {
    width: imageNaturalSizeFromFile.width ?? imageNaturalSizeFromUrl.width,
    height: imageNaturalSizeFromFile.height ?? imageNaturalSizeFromUrl.height,
  };
};

const { uploads, uploadInProgressCount, handleFiles, retryUpload, cancelUpload, removeUpload } = useUploadQueue({
  maxUploadSize: MAX_UPLOAD_SIZE,
  successAutoRemoveDelayMs: SUCCESS_UPLOAD_AUTO_REMOVE_DELAY_MS,
  resolveKind: resolveUploadKind,
  createUploadTask: (file, onProgress) =>
    uploadEditorFileTask(file, {
      onProgress: ({ percent }) => {
        onProgress(percent);
      },
    }),
  resolveUploadedUrl: (kind, uploaded) =>
    kind === 'image' ? resolveImageUrl(uploaded, 'original_size') : (resolveFileViewUrl(uploaded.id ?? null) ?? resolveFileUrl(uploaded.storageKey)),
  resolveImageNaturalSize: resolveImageNaturalSizeForUpload,
  onInsertUploadedFile: insertUploadedFile,
  onError: showError,
  unsupportedFileMessage: '이미지 또는 MP4/WebM 영상만 업로드할 수 있습니다.',
  maxSizeExceededMessage: '파일 사이즈 제한 50MB',
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

const resolveYoutubeSize = () => YOUTUBE_SIZE_OPTIONS.find((option) => option.value === youtubeSize.value) ?? YOUTUBE_SIZE_OPTIONS[1];

const isFileDrag = (event: DragEvent) => {
  const types = event.dataTransfer?.types ? Array.from(event.dataTransfer.types) : [];
  return types.includes('Files');
};

const handleDropZoneDragOver = (event: DragEvent) => {
  if (!isFileDrag(event)) {
    return;
  }
  event.preventDefault();
  isDropActive.value = true;
};

const handleDropZoneDragLeave = () => {
  isDropActive.value = false;
};

const handleDropZoneDrop = async (event: DragEvent) => {
  if (!isFileDrag(event)) {
    return;
  }
  event.preventDefault();
  isDropActive.value = false;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (files.length === 0) {
    return;
  }
  focusEditor();
  await handleFiles(files);
};

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
  if (isHtmlMode.value) {
    return;
  }
  editor.value?.chain().focus().run();
};

const applyHtmlSource = () => {
  if (!editor.value) {
    emit('update:modelValue', htmlSource.value);
    return true;
  }
  try {
    editor.value.commands.setContent(htmlSource.value, false);
    const normalized = editor.value.getHTML();
    htmlSource.value = normalized;
    emit('update:modelValue', normalized);
    syncSelectionState(editor.value);
    return true;
  } catch {
    showError('HTML 적용에 실패했습니다.');
    return false;
  }
};

const setEditorMode = (mode: EditorMode) => {
  if (mode === editorMode.value) {
    return;
  }
  if (mode === 'html') {
    htmlSource.value = editor.value?.getHTML() ?? props.modelValue;
    editorMode.value = mode;
    return;
  }
  const applied = applyHtmlSource();
  if (!applied) {
    return;
  }
  editorMode.value = mode;
  focusEditor();
};

const onHtmlSourceInput = () => {
  emit('update:modelValue', htmlSource.value);
};

const toggleMobileMore = () => {
  const next = !isMobileMoreOpen.value;
  isMobileMoreOpen.value = next;
  if (!next) {
    mobileAccordionKey.value = null;
    return;
  }
  if (mobileAccordionKey.value === null) {
    mobileAccordionKey.value = 'text';
  }
};

const toggleMobileAccordion = (key: MobileAccordionKey) => {
  if (!isMobileMoreOpen.value) {
    isMobileMoreOpen.value = true;
  }
  mobileAccordionKey.value = mobileAccordionKey.value === key ? null : key;
};

const toggleBold = () => editor.value?.chain().focus().toggleBold().run();
const toggleItalic = () => editor.value?.chain().focus().toggleItalic().run();
const toggleUnderline = () => editor.value?.chain().focus().toggleUnderline().run();
const toggleStrike = () => editor.value?.chain().focus().toggleStrike().run();
const toggleInlineCode = () => editor.value?.chain().focus().toggleCode().run();
const toggleSubscript = () => editor.value?.chain().focus().toggleSubscript().run();
const toggleSuperscript = () => editor.value?.chain().focus().toggleSuperscript().run();
const toggleBulletList = () => editor.value?.chain().focus().toggleBulletList().run();
const toggleOrderedList = () => editor.value?.chain().focus().toggleOrderedList().run();
const toggleTaskList = () => editor.value?.chain().focus().toggleTaskList().run();
const toggleBlockquote = () => editor.value?.chain().focus().toggleBlockquote().run();
const toggleCodeBlock = () => editor.value?.chain().focus().toggleCodeBlock().run();
const setParagraph = () => editor.value?.chain().focus().setParagraph().run();
const setHeading = (level: Level) => editor.value?.chain().focus().toggleHeading({ level }).run();
const setHorizontalRule = () => editor.value?.chain().focus().setHorizontalRule().run();
const setTextAlign = (alignment: 'left' | 'center' | 'right' | 'justify') => editor.value?.chain().focus().setTextAlign(alignment).run();
const undo = () => editor.value?.chain().focus().undo().run();
const redo = () => editor.value?.chain().focus().redo().run();
const startMention = () => editor.value?.chain().focus().insertContent('@').run();

const applyTextColor = () => {
  editor.value?.chain().focus().setColor(textColor.value).run();
};
const clearTextColor = () => editor.value?.chain().focus().unsetColor().run();
const applyHighlightColor = () => editor.value?.chain().focus().setHighlight({ color: highlightColor.value }).run();
const clearHighlightColor = () => editor.value?.chain().focus().unsetHighlight().run();

const applyFontFamily = () => {
  if (!editor.value) {
    return;
  }
  if (fontFamily.value === 'inherit') {
    editor.value.chain().focus().unsetFontFamily().run();
    return;
  }
  editor.value.chain().focus().setFontFamily(fontFamily.value).run();
};

const applyFontSize = () => {
  if (!editor.value) {
    return;
  }
  if (fontSize.value === 'default') {
    editor.value.chain().focus().unsetFontSize().run();
    return;
  }
  editor.value.chain().focus().setFontSize(fontSize.value).run();
};

const applyCodeBlockLanguage = () => {
  if (!editor.value) {
    return;
  }
  if (editor.value.isActive('codeBlock')) {
    editor.value.chain().focus().updateAttributes('codeBlock', { language: codeLanguage.value }).run();
    return;
  }
  editor.value.chain().focus().setCodeBlock({ language: codeLanguage.value }).run();
};

const setLink = () => {
  openLinkModal();
};

const normalizeLinkUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
      return null;
    }
    return trimmed;
  } catch {
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}([/?#].*)?$/.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return null;
  }
};

const closeLinkModal = () => {
  isLinkModalOpen.value = false;
  linkErrorMessage.value = '';
};

const removeLink = () => {
  if (!editor.value) {
    return;
  }
  editor.value.chain().focus().extendMarkRange('link').unsetLink().run();
  closeLinkModal();
};

const confirmLink = () => {
  if (!editor.value) {
    return;
  }
  const trimmed = linkUrlInput.value.trim();
  if (!trimmed) {
    linkErrorMessage.value = '링크 URL을 입력하세요.';
    return;
  }
  const normalized = normalizeLinkUrl(trimmed);
  if (!normalized) {
    linkErrorMessage.value = '링크 URL 형식이 올바르지 않습니다.';
    return;
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
  closeLinkModal();
};

const closeYoutubeModal = () => {
  isYoutubeModalOpen.value = false;
  youtubeErrorMessage.value = '';
};

const confirmYoutube = () => {
  if (!editor.value) {
    return;
  }
  const trimmed = youtubeUrlInput.value.trim();
  if (!trimmed) {
    youtubeErrorMessage.value = '유튜브 URL을 입력하세요.';
    return;
  }
  const embedUrl = normalizeYoutubeUrl(trimmed);
  if (!embedUrl) {
    youtubeErrorMessage.value = '유튜브 URL 형식이 올바르지 않습니다.';
    return;
  }
  const size = resolveYoutubeSize();
  if (size) {
    editor.value.chain().focus().setYoutubeVideo({ src: embedUrl, width: size.width, height: size.height }).run();
  }
  isYoutubeModalOpen.value = false;
  youtubeUrlInput.value = '';
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
const addColumnBefore = () => editor.value?.chain().focus().addColumnBefore().run();
const deleteColumn = () => editor.value?.chain().focus().deleteColumn().run();
const addRowAfter = () => editor.value?.chain().focus().addRowAfter().run();
const addRowBefore = () => editor.value?.chain().focus().addRowBefore().run();
const deleteRow = () => editor.value?.chain().focus().deleteRow().run();
const deleteTable = () => editor.value?.chain().focus().deleteTable().run();
const mergeCells = () => editor.value?.chain().focus().mergeCells().run();
const splitCell = () => editor.value?.chain().focus().splitCell().run();
const toggleHeaderRow = () => editor.value?.chain().focus().toggleHeaderRow().run();
const toggleHeaderColumn = () => editor.value?.chain().focus().toggleHeaderColumn().run();
const toggleHeaderCell = () => editor.value?.chain().focus().toggleHeaderCell().run();

const applyYoutubeSize = () => {
  if (!editor.value) {
    return;
  }
  if (!editor.value.isActive('youtube')) {
    showError('크기를 변경할 유튜브를 선택하세요.');
    return;
  }
  const size = resolveYoutubeSize();
  if (size) {
    editor.value.chain().focus().updateAttributes('youtube', { width: size.width, height: size.height }).run();
  }
};

const setImageAlign = (align: ImageAlign) => {
  const applied = updateImageNodeAttributes({ align });
  if (!applied) {
    showError('이미지를 먼저 선택하세요.');
  }
};

const resolveEditableImageInfo = () => {
  if (!editor.value) {
    return null;
  }
  const position = resolveTargetImagePosition();
  if (position === null) {
    return null;
  }
  const imageNode = editor.value.state.doc.nodeAt(position);
  if (!imageNode || imageNode.type.name !== 'image') {
    return null;
  }
  return { position, imageNode };
};

const applyImageScale = (silent = false) => {
  const imageInfo = resolveEditableImageInfo();
  if (!editor.value || !imageInfo) {
    if (!silent) {
      showError('이미지를 먼저 선택하세요.');
    }
    return;
  }
  const scale = parsePositiveInteger(imageScalePercent.value);
  if (scale === null || scale < IMAGE_SCALE_MIN_PERCENT || scale > IMAGE_SCALE_MAX_PERCENT) {
    if (!silent) {
      showError(`배율(%)은 ${IMAGE_SCALE_MIN_PERCENT}~${IMAGE_SCALE_MAX_PERCENT} 사이 숫자로 입력해 주세요.`);
    }
    return;
  }
  imageScalePercent.value = clampImageScale(scale, IMAGE_SCALE_MIN_PERCENT, IMAGE_SCALE_MAX_PERCENT);

  const imageAttrs = imageInfo.imageNode.attrs as {
    width?: string;
    height?: string;
    originalWidth?: unknown;
    originalHeight?: unknown;
  };
  const originalWidth = resolveImageOriginalDimension(editor.value, imageInfo.position, imageAttrs.originalWidth, imageAttrs.width, 'width');
  const originalHeight = resolveImageOriginalDimension(editor.value, imageInfo.position, imageAttrs.originalHeight, imageAttrs.height, 'height');
  const applied = updateImageNodeAttributes({
    width: `${imageScalePercent.value}%`,
    height: null,
    originalWidth,
    originalHeight,
  });
  if (!applied && !silent) {
    showError('이미지를 먼저 선택하세요.');
  }
};

const applyImageScaleFromSlider = () => {
  imageScalePercent.value = clampImageScale(imageScalePercent.value, IMAGE_SCALE_MIN_PERCENT, IMAGE_SCALE_MAX_PERCENT);
  applyImageScale(true);
};

const onImageScaleChange = () => {
  applyImageScale();
};

const resetImageScale = () => {
  imageScalePercent.value = DEFAULT_IMAGE_SCALE_PERCENT;
  applyImageScale();
};

const applyImageCaption = () => {
  const caption = imageCaption.value.trim();
  const applied = updateImageNodeAttributes({ caption: caption || null });
  if (!applied) {
    showError('이미지를 먼저 선택하세요.');
  }
};

const onToolbarFontFamilyChange = (value: string) => {
  fontFamily.value = value;
  applyFontFamily();
};

const onToolbarFontSizeChange = (value: string) => {
  fontSize.value = value;
  applyFontSize();
};

const onToolbarTextColorChange = (value: string) => {
  textColor.value = value;
};

const onToolbarHighlightColorChange = (value: string) => {
  highlightColor.value = value;
};

const onToolbarCodeLanguageChange = (value: string) => {
  codeLanguage.value = value;
  applyCodeBlockLanguage();
};

const onToolbarYoutubeSizeChange = (value: string) => {
  youtubeSize.value = value as YoutubeSizeValue;
};

const toolbarActions = {
  toggleBold,
  toggleItalic,
  setLink,
  openImagePicker,
  toggleTaskList,
  undo,
  redo,
  toggleMobileMore,
  toggleMobileAccordion,
  toggleUnderline,
  toggleStrike,
  toggleInlineCode,
  toggleSubscript,
  toggleSuperscript,
  applyTextColor,
  clearTextColor,
  applyHighlightColor,
  clearHighlightColor,
  setHeading,
  setParagraph,
  setTextAlign,
  toggleBulletList,
  toggleOrderedList,
  toggleBlockquote,
  setHorizontalRule,
  toggleCodeBlock,
  startMention,
  openVideoPicker,
  openYoutubeModal,
  applyYoutubeSize,
  insertTable,
  addRowBefore,
  addRowAfter,
  deleteRow,
  addColumnBefore,
  addColumnAfter,
  deleteColumn,
  mergeCells,
  splitCell,
  toggleHeaderRow,
  toggleHeaderColumn,
  toggleHeaderCell,
  deleteTable,
};

const buttonClass = (active = false, emphasis = false) =>
  [
    'inline-flex h-7 items-center rounded-lg border px-2.5 text-xs font-semibold leading-none transition-all duration-150',
    emphasis
      ? 'border-slate-300 bg-slate-100 text-slate-800 hover:border-slate-400 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600'
      : '',
    active
      ? 'border-emerald-400 bg-emerald-500/15 text-emerald-700 shadow-sm ring-1 ring-emerald-200/80 dark:border-emerald-500/70 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-700/40'
      : 'border-slate-200 bg-white text-slate-600 hover:-translate-y-px hover:border-slate-300 hover:text-slate-900 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white',
  ].join(' ');

const selectClass =
  'h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm transition focus:border-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';

const sectionClass =
  'flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45)] dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-none';

const sectionLabelClass = 'mr-1 text-[10px] font-extrabold tracking-[0.08em] text-slate-500 dark:text-slate-300';
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
    <div
      class="space-y-1 border-b border-slate-200 bg-gradient-to-b from-slate-50/80 to-white/80 px-4 py-1.5 dark:border-slate-800 dark:from-slate-950 dark:to-slate-950"
    >
      <div
        class="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-2.5 py-1.5 dark:border-slate-800/80 dark:bg-slate-900/60"
      >
        <button type="button" :class="buttonClass(!isHtmlMode, true)" @click="setEditorMode('wysiwyg')">에디터</button>
        <button type="button" :class="buttonClass(isHtmlMode, true)" @click="setEditorMode('html')">HTML</button>
        <span
          v-if="uploadInProgressCount > 0"
          class="inline-flex h-7 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          업로드 {{ uploadInProgressCount }}건 진행중
        </span>
      </div>
      <template v-if="!isHtmlMode">
        <ArticleEditorToolbarMobile
          :editor="editor"
          :is-mobile-more-open="isMobileMoreOpen"
          :mobile-accordion-key="mobileAccordionKey"
          :is-table-selected="isTableSelected"
          :font-family="fontFamily"
          :font-size="fontSize"
          :text-color="textColor"
          :highlight-color="highlightColor"
          :code-language="codeLanguage"
          :youtube-size="youtubeSize"
          :font-family-options="FONT_FAMILY_OPTIONS"
          :font-size-options="FONT_SIZE_OPTIONS"
          :code-language-options="CODE_LANGUAGE_OPTIONS"
          :youtube-size-options="YOUTUBE_SIZE_OPTIONS"
          :button-class="buttonClass"
          :select-class="selectClass"
          :section-class="sectionClass"
          :section-label-class="sectionLabelClass"
          :actions="toolbarActions"
          @update:font-family="onToolbarFontFamilyChange"
          @update:font-size="onToolbarFontSizeChange"
          @update:text-color="onToolbarTextColorChange"
          @update:highlight-color="onToolbarHighlightColorChange"
          @update:code-language="onToolbarCodeLanguageChange"
          @update:youtube-size="onToolbarYoutubeSizeChange"
        />
        <ArticleEditorToolbarDesktop
          :editor="editor"
          :font-family="fontFamily"
          :font-size="fontSize"
          :text-color="textColor"
          :highlight-color="highlightColor"
          :code-language="codeLanguage"
          :youtube-size="youtubeSize"
          :font-family-options="FONT_FAMILY_OPTIONS"
          :font-size-options="FONT_SIZE_OPTIONS"
          :code-language-options="CODE_LANGUAGE_OPTIONS"
          :youtube-size-options="YOUTUBE_SIZE_OPTIONS"
          :button-class="buttonClass"
          :select-class="selectClass"
          :section-class="sectionClass"
          :section-label-class="sectionLabelClass"
          :actions="toolbarActions"
          @update:font-family="onToolbarFontFamilyChange"
          @update:font-size="onToolbarFontSizeChange"
          @update:text-color="onToolbarTextColorChange"
          @update:highlight-color="onToolbarHighlightColorChange"
          @update:code-language="onToolbarCodeLanguageChange"
          @update:youtube-size="onToolbarYoutubeSizeChange"
        />
      </template>
      <template v-else>
        <div :class="sectionClass">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-300">HTML 소스를 직접 수정하고 적용할 수 있습니다.</span>
          <button type="button" :class="buttonClass()" @click="applyHtmlSource">HTML 적용</button>
        </div>
      </template>
    </div>
    <div
      v-if="!isHtmlMode && isImageSelected"
      class="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/40"
    >
      <span :class="sectionLabelClass">이미지 편집</span>
      <button type="button" :class="buttonClass(activeImageAlign === 'left')" @click="setImageAlign('left')">좌측</button>
      <button type="button" :class="buttonClass(activeImageAlign === 'center')" @click="setImageAlign('center')">중앙</button>
      <button type="button" :class="buttonClass(activeImageAlign === 'right')" @click="setImageAlign('right')">우측</button>
      <label
        class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        배율
        <input
          v-model.number="imageScalePercent"
          type="range"
          :min="IMAGE_SCALE_MIN_PERCENT"
          :max="IMAGE_SCALE_MAX_PERCENT"
          step="1"
          class="h-2 w-36 accent-emerald-500"
          @input="applyImageScaleFromSlider"
          @change="onImageScaleChange"
        />
        <span class="w-11 text-right">{{ imageScalePercent }}%</span>
      </label>
      <button type="button" :class="buttonClass()" @click="resetImageScale">100%</button>
      <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        원본 {{ imageOriginalWidth ?? '-' }} x {{ imageOriginalHeight ?? '-' }}
      </span>
      <input
        v-model="imageCaption"
        type="text"
        class="h-7 min-w-[180px] rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm transition focus:border-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        placeholder="이미지 캡션"
      />
      <button type="button" :class="buttonClass()" @click="applyImageCaption">캡션 적용</button>
    </div>
    <div
      v-if="!isHtmlMode && isTableSelected"
      class="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/40"
    >
      <span :class="sectionLabelClass">테이블 편집</span>
      <button type="button" :class="buttonClass()" @click="addRowBefore">행+앞</button>
      <button type="button" :class="buttonClass()" @click="addRowAfter">행+뒤</button>
      <button type="button" :class="buttonClass()" @click="deleteRow">행삭제</button>
      <button type="button" :class="buttonClass()" @click="addColumnBefore">열+앞</button>
      <button type="button" :class="buttonClass()" @click="addColumnAfter">열+뒤</button>
      <button type="button" :class="buttonClass()" @click="deleteColumn">열삭제</button>
      <button type="button" :class="buttonClass()" @click="mergeCells">셀병합</button>
      <button type="button" :class="buttonClass()" @click="splitCell">셀분할</button>
      <button type="button" :class="buttonClass()" @click="toggleHeaderRow">헤더행</button>
      <button type="button" :class="buttonClass()" @click="toggleHeaderColumn">헤더열</button>
      <button type="button" :class="buttonClass()" @click="toggleHeaderCell">헤더셀</button>
      <button type="button" :class="buttonClass()" @click="deleteTable">표삭제</button>
    </div>
    <div
      v-if="!isHtmlMode"
      class="mx-4 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed px-4 py-2.5 text-xs font-semibold transition"
      :class="
        isDropActive
          ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-500/70 dark:bg-emerald-500/10 dark:text-emerald-200'
          : 'border-slate-300/80 bg-slate-50/60 text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-400'
      "
      @dragenter.prevent="handleDropZoneDragOver"
      @dragover.prevent="handleDropZoneDragOver"
      @dragleave="handleDropZoneDragLeave"
      @drop.prevent="handleDropZoneDrop"
    >
      <span>이미지/영상 파일을 여기에 드래그하세요.</span>
      <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500">최대 50MB</span>
    </div>
    <div
      v-if="uploads.length > 0"
      class="mx-4 mt-3 rounded-2xl border border-slate-200/80 bg-white/85 p-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60"
    >
      <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">업로드 큐</p>
      <div class="mt-2 space-y-2">
        <div v-for="item in uploads" :key="item.id" class="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-semibold text-slate-700 dark:text-slate-200">{{ item.file.name }}</p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">{{ item.kind === 'image' ? '이미지' : '영상' }} · {{ item.message }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="item.status === 'uploading'"
                type="button"
                class="rounded border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                @click="cancelUpload(item.id)"
              >
                취소
              </button>
              <button
                v-if="item.status === 'error' || item.status === 'canceled'"
                type="button"
                class="rounded border border-amber-200 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-950/40"
                @click="retryUpload(item.id)"
              >
                재시도
              </button>
              <button
                v-if="item.status !== 'uploading'"
                type="button"
                class="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                @click="removeUpload(item.id)"
              >
                지우기
              </button>
            </div>
          </div>
          <div class="mt-2 h-1.5 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
            <div
              class="h-full rounded transition-all"
              :class="
                item.status === 'success'
                  ? 'bg-emerald-500'
                  : item.status === 'error'
                    ? 'bg-rose-500'
                    : item.status === 'canceled'
                      ? 'bg-amber-500'
                      : 'bg-sky-500'
              "
              :style="{ width: `${item.progress}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
    <EditorContent
      v-if="!isHtmlMode"
      :editor="editor"
      class="min-h-[360px] bg-white/80 px-4 py-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-950/70 dark:text-slate-200"
    />
    <div v-else class="space-y-2 bg-white/80 px-4 py-4 dark:bg-slate-950/70">
      <p class="text-xs font-semibold text-slate-500 dark:text-slate-300">저장 시 sanitize 정책에 따라 위험 태그/속성은 제거됩니다.</p>
      <textarea
        v-model="htmlSource"
        class="min-h-[360px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 focus:border-emerald-400 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        spellcheck="false"
        @input="onHtmlSourceInput"
      ></textarea>
    </div>
    <div
      class="border-t border-slate-200 bg-slate-50/60 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400"
    >
      단축키: Ctrl/Cmd+B 굵게, Ctrl/Cmd+I 기울임, Ctrl/Cmd+K 링크, Ctrl/Cmd+Z 되돌리기, Ctrl/Cmd+Y 다시, / 슬래시 명령어, Enter 문단/다음 항목,
      Shift+Enter 줄바꿈.
    </div>
    <div v-if="errorMessage" class="border-t border-slate-200 px-4 py-2 text-xs text-rose-600 dark:border-slate-800">
      {{ errorMessage }}
    </div>
    <input ref="imageInputRef" type="file" accept="image/*" class="hidden" multiple @change="onImagePicked" />
    <input ref="videoInputRef" type="file" accept="video/mp4,video/webm" class="hidden" multiple @change="onVideoPicked" />

    <BaseModal :open="isLinkModalOpen" aria-label="링크 입력" @close="closeLinkModal">
      <template #default="{ titleId }">
        <div class="space-y-4">
          <div>
            <h2 :id="titleId" class="text-lg font-semibold text-slate-900 dark:text-slate-100">링크 추가</h2>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">URL을 입력하면 선택한 텍스트에 링크가 적용됩니다.</p>
          </div>
          <form class="space-y-3" @submit.prevent="confirmLink">
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              URL
              <input
                ref="linkInputRef"
                v-model="linkUrlInput"
                type="url"
                inputmode="url"
                placeholder="https://example.com"
                class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <p v-if="linkErrorMessage" class="text-xs font-semibold text-rose-500">{{ linkErrorMessage }}</p>
            <div class="flex items-center justify-between gap-2">
              <button
                type="button"
                class="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                @click="removeLink"
              >
                링크 해제
              </button>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
                  @click="closeLinkModal"
                >
                  취소
                </button>
                <button type="submit" class="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600">
                  적용
                </button>
              </div>
            </div>
          </form>
        </div>
      </template>
    </BaseModal>

    <BaseModal :open="isYoutubeModalOpen" aria-label="유튜브 링크 입력" @close="closeYoutubeModal">
      <template #default="{ titleId }">
        <div class="space-y-4">
          <div>
            <h2 :id="titleId" class="text-lg font-semibold text-slate-900 dark:text-slate-100">유튜브 링크 추가</h2>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">유튜브 URL을 입력하면 자동으로 임베드됩니다.</p>
          </div>
          <form class="space-y-3" @submit.prevent="confirmYoutube">
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              URL
              <input
                ref="youtubeInputRef"
                v-model="youtubeUrlInput"
                type="url"
                inputmode="url"
                placeholder="https://www.youtube.com/watch?v=..."
                class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <p v-if="youtubeErrorMessage" class="text-xs font-semibold text-rose-500">{{ youtubeErrorMessage }}</p>
            <div class="flex items-center justify-end gap-2">
              <button
                type="button"
                class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
                @click="closeYoutubeModal"
              >
                취소
              </button>
              <button type="submit" class="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600">
                추가
              </button>
            </div>
          </form>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
