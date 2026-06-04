<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import '../../../shared/styles/mermaid.css';
import '../../../shared/styles/ui-content.css';
import './article-content-editor.css';

import type { ArticleContentFormat } from '../../../entities/article';
import { resolveProtectedFileViewUrlsInHtml, uploadEditorFileTask } from '../../../entities/file';
import { previewArticleContent } from '../../../entities/article';
import { ApiError } from '../../../shared/lib/http/api';
import { resolveFileUrl, resolveFileViewUrl, resolveImageUrl } from '../../../shared/lib/files';
import { renderMermaidDiagrams } from '../../../shared/lib/mermaid';
import { sanitizeHtml } from '../../../shared/lib/sanitize';
import BaseModal from '../../../shared/ui/BaseModal.vue';
import { hasMarkdownConversionRisk } from '../lib/articleContent';
import { parseMarkdownImport } from '../lib/markdownImport';
import type { MarkdownImportResult } from '../lib/markdownImport';
import { useUploadQueue } from '../lib/useUploadQueue';
import type { UploadKind } from '../lib/useUploadQueue';
import { useAuthStore } from '../../../stores/auth';

interface ArticleContentEditorProps {
  modelValue: string;
  contentFormat: ArticleContentFormat;
  placeholder?: string;
  boardSlug?: string;
  availableVisibilities?: string[];
  allowBoardSlugImport?: boolean;
}

type EditorViewMode = 'markdown' | 'wysiwyg';
type MarkdownPreviewMode = 'write' | 'split' | 'preview';
type MarkdownImportFeedbackTone = 'success' | 'warning';

const props = defineProps<ArticleContentEditorProps>();
const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'update:contentFormat', value: ArticleContentFormat): void;
  (
    event: 'apply-import-metadata',
    payload: { title?: string; visibility?: string; boardSlug?: string; categoryName?: string; tags: string[]; summary?: string },
  ): void;
}>();
const authStore = useAuthStore();
const { isAuthenticated } = storeToRefs(authStore);

const VIDEO_TYPES = ['video/mp4', 'video/webm'];
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
const SUCCESS_UPLOAD_AUTO_REMOVE_DELAY_MS = 1000;
const PREVIEW_DEBOUNCE_MS = 300;
const MARKDOWN_EDITOR_MIN_HEIGHT_PX = 420;
const ArticleEditor = defineAsyncComponent(() => import('./ArticleEditor.vue'));

const viewMode = ref<EditorViewMode>(props.contentFormat === 'MARKDOWN' ? 'markdown' : 'wysiwyg');
const markdownPreviewMode = ref<MarkdownPreviewMode>('split');
const markdownSource = ref(props.contentFormat === 'MARKDOWN' ? props.modelValue : '');
const htmlSource = ref(props.contentFormat === 'HTML' ? props.modelValue : '');
const previewHtml = ref('');
const previewSanitizedHtml = ref('');
const previewErrorMessage = ref('');
const isPreviewLoading = ref(false);
const isModeSwitching = ref(false);
const markdownTextareaRef = ref<HTMLTextAreaElement | null>(null);
const markdownEditorShellRef = ref<HTMLElement | null>(null);
const markdownPreviewRef = ref<HTMLElement | null>(null);
const markdownImportInputRef = ref<HTMLInputElement | null>(null);
const markdownImageInputRef = ref<HTMLInputElement | null>(null);
const markdownVideoInputRef = ref<HTMLInputElement | null>(null);
const isMarkdownDropActive = ref(false);
const isMarkdownSwitchConfirmOpen = ref(false);
const pendingMarkdownSource = ref('');
const isMarkdownImportConfirmOpen = ref(false);
const pendingImportedMarkdown = ref<MarkdownImportResult | null>(null);
const isDesktop = ref(true);
const markdownScrollTop = ref(0);
const markdownEditorHeight = ref(MARKDOWN_EDITOR_MIN_HEIGHT_PX);
const markdownImportFeedback = ref<{ tone: MarkdownImportFeedbackTone; messages: string[] } | null>(null);

let previewTimerId: ReturnType<typeof window.setTimeout> | null = null;
let previewRequestSequence = 0;
let markdownEditorResizeObserver: ResizeObserver | null = null;

const resolveDefaultPreviewMode = (desktop: boolean) => (desktop ? 'split' : 'write');

const syncDesktopState = () => {
  if (typeof window === 'undefined') {
    isDesktop.value = true;
    return;
  }
  isDesktop.value = window.innerWidth >= 1024;
  if (viewMode.value === 'markdown') {
    markdownPreviewMode.value = resolveDefaultPreviewMode(isDesktop.value);
  }
};

const clearPreviewTimer = () => {
  if (previewTimerId === null) {
    return;
  }
  window.clearTimeout(previewTimerId);
  previewTimerId = null;
};

const focusMarkdownEditor = (selectionStart?: number, selectionEnd?: number) => {
  void nextTick(() => {
    markdownTextareaRef.value?.focus();
    if (selectionStart === undefined || selectionEnd === undefined) {
      return;
    }
    markdownTextareaRef.value?.setSelectionRange(selectionStart, selectionEnd);
  });
};

const updateMarkdownSource = (nextValue: string, selectionStart?: number, selectionEnd?: number) => {
  markdownSource.value = nextValue;
  emit('update:modelValue', nextValue);
  focusMarkdownEditor(selectionStart, selectionEnd);
};

const onMarkdownInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement | null;
  if (!target) {
    return;
  }
  markdownSource.value = target.value;
  emit('update:modelValue', target.value);
  resizeMarkdownEditor();
};

const onMarkdownScroll = (event: Event) => {
  const target = event.target as HTMLTextAreaElement | null;
  if (!target) {
    return;
  }
  markdownScrollTop.value = target.scrollTop;
};

const onMarkdownKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Tab') {
    event.preventDefault();
    insertBlock(' ', 2);
    return;
  }

  if (!(event.ctrlKey || event.metaKey)) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === 'b') {
    event.preventDefault();
    addBold();
    return;
  }
  if (key === 'i') {
    event.preventDefault();
    addItalic();
    return;
  }
  if (key === 'k') {
    event.preventDefault();
    addLink();
  }
};

const updateHtmlSource = (nextValue: string) => {
  htmlSource.value = nextValue;
  emit('update:modelValue', nextValue);
  emit('update:contentFormat', 'HTML');
};

const syncMarkdownEditorHeight = () => {
  const shell = markdownEditorShellRef.value;
  if (!shell) {
    return;
  }
  markdownEditorHeight.value = Math.max(MARKDOWN_EDITOR_MIN_HEIGHT_PX, Math.ceil(shell.getBoundingClientRect().height));
};

const resizeMarkdownEditor = () => {
  const textarea = markdownTextareaRef.value;
  if (!textarea) {
    return;
  }

  textarea.style.height = 'auto';
  textarea.style.height = `${Math.max(MARKDOWN_EDITOR_MIN_HEIGHT_PX, textarea.scrollHeight)}px`;
  markdownScrollTop.value = textarea.scrollTop;
  void nextTick(() => {
    syncMarkdownEditorHeight();
  });
};

const applyPreviewHtml = async (html: string) => {
  const sanitized = sanitizeHtml(html);
  previewSanitizedHtml.value = sanitized;
  previewHtml.value = await resolveProtectedFileViewUrlsInHtml(sanitized, isAuthenticated.value);
};

const renderPreviewMermaid = async () => {
  await nextTick();
  await renderMermaidDiagrams(markdownPreviewRef.value);
};

const requestMarkdownPreview = async (source: string) => {
  const trimmedSource = source.trim();
  const requestId = ++previewRequestSequence;

  if (!trimmedSource) {
    previewHtml.value = '';
    previewSanitizedHtml.value = '';
    previewErrorMessage.value = '';
    isPreviewLoading.value = false;
    return;
  }

  isPreviewLoading.value = true;
  previewErrorMessage.value = '';

  try {
    const response = await previewArticleContent({
      contentSource: source,
      contentFormat: 'MARKDOWN',
    });
    if (requestId !== previewRequestSequence) {
      return;
    }
    await applyPreviewHtml(response.content);
  } catch (error) {
    if (requestId !== previewRequestSequence) {
      return;
    }
    previewErrorMessage.value = error instanceof ApiError ? error.message : '미리보기를 불러오지 못했습니다.';
  } finally {
    if (requestId === previewRequestSequence) {
      isPreviewLoading.value = false;
    }
  }
};

const scheduleMarkdownPreview = (source: string) => {
  clearPreviewTimer();
  previewTimerId = window.setTimeout(() => {
    void requestMarkdownPreview(source);
  }, PREVIEW_DEBOUNCE_MS);
};

const setMarkdownMode = (nextMarkdownSource: string) => {
  pendingMarkdownSource.value = '';
  isMarkdownSwitchConfirmOpen.value = false;
  markdownSource.value = nextMarkdownSource;
  emit('update:contentFormat', 'MARKDOWN');
  emit('update:modelValue', nextMarkdownSource);
  viewMode.value = 'markdown';
  markdownPreviewMode.value = resolveDefaultPreviewMode(isDesktop.value);
  scheduleMarkdownPreview(nextMarkdownSource);
  focusMarkdownEditor();
};

const switchToMarkdownMode = async () => {
  if (viewMode.value === 'markdown' && props.contentFormat === 'MARKDOWN') {
    return;
  }

  const currentHtml = htmlSource.value.trim();
  if (!currentHtml) {
    setMarkdownMode('');
    return;
  }

  isModeSwitching.value = true;
  try {
    const { convertHtmlToMarkdown } = await import('../lib/markdownConversion');
    const nextMarkdownSource = await convertHtmlToMarkdown(currentHtml);

    if (hasMarkdownConversionRisk(currentHtml)) {
      pendingMarkdownSource.value = nextMarkdownSource;
      isMarkdownSwitchConfirmOpen.value = true;
      return;
    }

    setMarkdownMode(nextMarkdownSource);
  } catch (error) {
    previewErrorMessage.value = error instanceof ApiError ? error.message : 'Markdown 모드로 전환하지 못했습니다.';
  } finally {
    isModeSwitching.value = false;
  }
};

const switchToWysiwygMode = async () => {
  if (viewMode.value === 'wysiwyg' && props.contentFormat === 'HTML') {
    return;
  }

  isModeSwitching.value = true;
  previewErrorMessage.value = '';
  try {
    const nextHtmlSource = markdownSource.value.trim()
      ? (
          await previewArticleContent({
            contentSource: markdownSource.value,
            contentFormat: 'MARKDOWN',
          })
        ).content
      : '';

    htmlSource.value = nextHtmlSource;
    emit('update:contentFormat', 'HTML');
    emit('update:modelValue', nextHtmlSource);
    viewMode.value = 'wysiwyg';
  } catch (error) {
    previewErrorMessage.value = error instanceof ApiError ? error.message : 'WYSIWYG 모드로 전환하지 못했습니다.';
  } finally {
    isModeSwitching.value = false;
  }
};

const applyMarkdownTransform = (
  transformer: (
    value: string,
    selectionStart: number,
    selectionEnd: number,
  ) => {
    nextValue: string;
    nextSelectionStart: number;
    nextSelectionEnd: number;
  },
) => {
  const currentValue = markdownSource.value;
  const target = markdownTextareaRef.value;
  const selectionStart = target?.selectionStart ?? currentValue.length;
  const selectionEnd = target?.selectionEnd ?? currentValue.length;
  const result = transformer(currentValue, selectionStart, selectionEnd);
  updateMarkdownSource(result.nextValue, result.nextSelectionStart, result.nextSelectionEnd);
};

const wrapSelection = (prefix: string, suffix: string, placeholder: string) => {
  applyMarkdownTransform((value, selectionStart, selectionEnd) => {
    const selectedText = value.slice(selectionStart, selectionEnd);
    const innerText = selectedText || placeholder;
    const insertedText = `${prefix}${innerText}${suffix}`;
    const nextValue = `${value.slice(0, selectionStart)}${insertedText}${value.slice(selectionEnd)}`;
    const nextSelectionStart = selectionStart + prefix.length;
    const nextSelectionEnd = nextSelectionStart + innerText.length;
    return {
      nextValue,
      nextSelectionStart,
      nextSelectionEnd,
    };
  });
};

const prefixSelectedLines = (prefix: string) => {
  applyMarkdownTransform((value, selectionStart, selectionEnd) => {
    const lineStart = value.lastIndexOf('\n', Math.max(selectionStart - 1, 0)) + 1;
    const nextLineIndex = value.indexOf('\n', selectionEnd);
    const lineEnd = nextLineIndex === -1 ? value.length : nextLineIndex;
    const block = value.slice(lineStart, lineEnd);
    const transformedBlock = block
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n');
    const nextValue = `${value.slice(0, lineStart)}${transformedBlock}${value.slice(lineEnd)}`;
    return {
      nextValue,
      nextSelectionStart: lineStart,
      nextSelectionEnd: lineStart + transformedBlock.length,
    };
  });
};

const insertBlock = (block: string, cursorOffset?: number) => {
  applyMarkdownTransform((value, selectionStart, selectionEnd) => {
    const nextValue = `${value.slice(0, selectionStart)}${block}${value.slice(selectionEnd)}`;
    const nextSelection = selectionStart + (cursorOffset ?? block.length);
    return {
      nextValue,
      nextSelectionStart: nextSelection,
      nextSelectionEnd: nextSelection,
    };
  });
};

const addHeading = (level: 1 | 2 | 3) => prefixSelectedLines(`${'#'.repeat(level)} `);
const addBulletList = () => prefixSelectedLines('- ');
const addOrderedList = () => prefixSelectedLines('1. ');
const addTaskList = () => prefixSelectedLines('- [ ] ');
const addBlockquote = () => prefixSelectedLines('> ');
const addCodeBlock = () => wrapSelection('```text\n', '\n```', '코드');
const addLink = () => wrapSelection('[', '](https://example.com)', '링크 텍스트');
const addTable = () => insertBlock('\n\n| 항목 | 값 |\n| --- | --- |\n| 예시 | 내용 |\n\n');
const addMermaidBlock = () => wrapSelection('```mermaid\n', '\n```', 'graph TD\n A[시작] --> B[다음]');
const addYouTubeEmbed = () => wrapSelection('!youtube[', ']', 'https://youtu.be/dQw4w9WgXcQ');
const addBold = () => wrapSelection('**', '**', '굵은 텍스트');
const addItalic = () => wrapSelection('*', '*', '기울임 텍스트');

const markdownLineNumbers = computed(() => {
  const lineCount = Math.max(1, markdownSource.value.split('\n').length);
  return Array.from({ length: lineCount }, (_, index) => index + 1);
});

const markdownCharacterCount = computed(() => markdownSource.value.length);
const markdownWordCount = computed(() => {
  const trimmed = markdownSource.value.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
});

const markdownStatusText = computed(
  () => `행 ${markdownLineNumbers.value.length} · 단어 ${markdownWordCount.value} · 글자 ${markdownCharacterCount.value}`,
);
const isMarkdownSplitMode = computed(() => markdownPreviewMode.value === 'split');
const markdownPreviewShellStyle = computed(() => {
  if (!isMarkdownSplitMode.value) {
    return undefined;
  }
  return {
    height: `${markdownEditorHeight.value}px`,
  };
});

const markdownGutterStyle = computed(() => ({
  transform: `translateY(-${markdownScrollTop.value}px)`,
}));

const openMarkdownImportPicker = () => {
  markdownImportInputRef.value?.click();
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

const insertUploadedMarkdown = (kind: UploadKind, url: string) => {
  const snippet = kind === 'image' ? `\n![이미지](${url})\n` : `\n<video controls src="${url}"></video>\n`;
  insertBlock(snippet);
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
  onInsertUploadedFile: (kind, url) => {
    insertUploadedMarkdown(kind, url);
  },
  onError: (message) => {
    previewErrorMessage.value = message;
  },
  unsupportedFileMessage: '이미지 또는 MP4/WebM 영상만 업로드할 수 있습니다.',
  maxSizeExceededMessage: '파일 사이즈 제한 50MB',
});

const openMarkdownImagePicker = () => {
  markdownImageInputRef.value?.click();
};

const openMarkdownVideoPicker = () => {
  markdownVideoInputRef.value?.click();
};

const onMarkdownImagePicked = async (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const files = target?.files ? Array.from(target.files) : [];
  if (files.length > 0) {
    await handleFiles(files);
  }
  if (target) {
    target.value = '';
  }
};

const onMarkdownVideoPicked = async (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const files = target?.files ? Array.from(target.files) : [];
  if (files.length > 0) {
    await handleFiles(files);
  }
  if (target) {
    target.value = '';
  }
};

const onMarkdownDrop = async (event: DragEvent) => {
  const files = Array.from(event.dataTransfer?.files ?? []);
  isMarkdownDropActive.value = false;
  if (files.length === 0) {
    return;
  }
  await handleFiles(files);
};

const onMarkdownDragOver = (event: DragEvent) => {
  const types = event.dataTransfer?.types ? Array.from(event.dataTransfer.types) : [];
  if (!types.includes('Files')) {
    return;
  }
  event.preventDefault();
  isMarkdownDropActive.value = true;
};

const onMarkdownDragLeave = () => {
  isMarkdownDropActive.value = false;
};

const applyImportedMarkdown = (result: MarkdownImportResult) => {
  pendingImportedMarkdown.value = null;
  isMarkdownImportConfirmOpen.value = false;
  emit('update:contentFormat', 'MARKDOWN');
  emit('apply-import-metadata', resolveImportMetadataPayload(result));
  updateMarkdownSource(result.contentSource);
  scheduleMarkdownPreview(result.contentSource);
  markdownImportFeedback.value = resolveImportFeedback(result);
};

const onMarkdownImportPicked = async (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0] ?? null;
  if (!file) {
    return;
  }

  const importedResult = parseMarkdownImport(await file.text(), file.name);
  if (markdownSource.value.trim().length > 0) {
    pendingImportedMarkdown.value = importedResult;
    isMarkdownImportConfirmOpen.value = true;
  } else {
    applyImportedMarkdown(importedResult);
  }

  if (target) {
    target.value = '';
  }
};

const resolveImportMetadataPayload = (result: MarkdownImportResult) => {
  const payload: { title?: string; visibility?: string; boardSlug?: string; categoryName?: string; tags: string[]; summary?: string } = {
    tags: result.metadata.tags,
  };
  if (result.metadata.title) {
    payload.title = result.metadata.title;
  }

  const nextVisibility = result.metadata.visibility?.trim().toUpperCase();
  if (nextVisibility) {
    payload.visibility = nextVisibility;
  }
  if (result.metadata.boardSlug) {
    payload.boardSlug = result.metadata.boardSlug;
  }
  if (result.metadata.categoryName) {
    payload.categoryName = result.metadata.categoryName;
  }
  if (result.metadata.summary) {
    payload.summary = result.metadata.summary;
  }
  return payload;
};

const resolveImportFeedback = (result: MarkdownImportResult): { tone: MarkdownImportFeedbackTone; messages: string[] } => {
  const messages: string[] = ['Markdown 파일을 불러왔습니다.'];
  const warnings = [...result.warnings];

  if (result.metadata.title) {
    messages.push('제목을 자동 반영했습니다.');
  }

  const nextVisibility = result.metadata.visibility?.trim().toUpperCase();
  const allowedVisibilities = props.availableVisibilities?.map((value) => value.trim().toUpperCase()) ?? [];
  if (nextVisibility) {
    const canDeferVisibility = Boolean(
      props.allowBoardSlugImport && result.metadata.boardSlug && props.boardSlug && result.metadata.boardSlug !== props.boardSlug,
    );
    if (canDeferVisibility || allowedVisibilities.length === 0 || allowedVisibilities.includes(nextVisibility)) {
      messages.push('공개 범위를 자동 반영했습니다.');
    } else {
      warnings.push(`frontmatter의 visibility(${nextVisibility})는 현재 글에서 사용할 수 없어 적용하지 않았습니다.`);
    }
  }

  if (result.metadata.boardSlug && props.boardSlug && result.metadata.boardSlug !== props.boardSlug) {
    if (props.allowBoardSlugImport) {
      messages.push(`frontmatter의 boardSlug(${result.metadata.boardSlug})를 반영해 게시판을 조정합니다.`);
    } else {
      warnings.push(`frontmatter의 boardSlug(${result.metadata.boardSlug})는 현재 게시판(${props.boardSlug})과 달라 적용하지 않았습니다.`);
    }
  }

  if (result.metadata.tags.length > 0 || result.metadata.summary) {
    warnings.push('태그와 요약은 frontmatter 원본에 보존되며 별도 UI에는 아직 반영되지 않습니다.');
  }

  if (result.unsupportedFields.length > 0) {
    warnings.push(`지원하지 않는 frontmatter 필드(${result.unsupportedFields.join(', ')})도 원본에 그대로 보존됩니다.`);
  }

  return {
    tone: warnings.length > 0 ? 'warning' : 'success',
    messages: warnings.length > 0 ? [...messages, ...warnings] : messages,
  };
};

const tabClass = (active: boolean) =>
  [
    'inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition',
    active
      ? 'border-emerald-400 bg-emerald-500/15 text-emerald-700 dark:border-emerald-500/70 dark:bg-emerald-500/15 dark:text-emerald-200'
      : 'border-line bg-white text-muted hover:border-line hover:text-ink dark:text-subtle dark:hover:text-white',
  ].join(' ');

const actionButtonClass =
  'inline-flex h-8 items-center rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:text-subtle dark:hover:text-white';

const previewModeButtonClass = (active: boolean) =>
  [
    'inline-flex h-8 items-center rounded-xl border px-3 text-xs font-semibold transition',
    active
      ? 'border-[color:var(--accent-strong)] bg-[color:var(--accent-strong)] text-white dark:border-line dark:bg-surface-2 dark:text-ink'
      : 'border-line bg-white text-muted hover:border-line hover:text-ink dark:text-subtle dark:hover:text-white',
  ].join(' ');

const markdownPanelClass = computed(() =>
  [
    'rounded-2xl border border-dashed px-4 py-3 transition',
    isMarkdownDropActive.value
      ? 'border-emerald-400 bg-emerald-50/70 dark:border-emerald-500/70 dark:bg-emerald-500/10'
      : 'border-line bg-surface-soft/40 dark:border-line',
  ].join(' '),
);

watch(
  () => props.contentFormat,
  (contentFormat) => {
    viewMode.value = contentFormat === 'MARKDOWN' ? 'markdown' : 'wysiwyg';
    if (contentFormat === 'MARKDOWN') {
      markdownSource.value = props.modelValue;
      markdownPreviewMode.value = resolveDefaultPreviewMode(isDesktop.value);
      scheduleMarkdownPreview(props.modelValue);
      void nextTick(() => {
        resizeMarkdownEditor();
      });
      return;
    }
    htmlSource.value = props.modelValue;
  },
  { immediate: true },
);

watch(
  () => props.modelValue,
  (value) => {
    if (props.contentFormat === 'MARKDOWN') {
      if (value !== markdownSource.value) {
        markdownSource.value = value;
        scheduleMarkdownPreview(value);
        void nextTick(() => {
          resizeMarkdownEditor();
        });
      }
      return;
    }
    if (value !== htmlSource.value) {
      htmlSource.value = value;
    }
  },
);

watch(
  () => markdownSource.value,
  (value) => {
    if (viewMode.value !== 'markdown') {
      return;
    }
    scheduleMarkdownPreview(value);
    void nextTick(() => {
      resizeMarkdownEditor();
    });
  },
);

watch(
  () => previewHtml.value,
  () => {
    void renderPreviewMermaid();
  },
);

watch(
  () => isAuthenticated.value,
  async () => {
    previewHtml.value = await resolveProtectedFileViewUrlsInHtml(previewSanitizedHtml.value, isAuthenticated.value);
    void renderPreviewMermaid();
  },
);

watch(
  () => markdownPreviewMode.value,
  (mode) => {
    if (mode === 'write') {
      return;
    }
    void renderPreviewMermaid();
  },
);

onMounted(() => {
  syncDesktopState();
  window.addEventListener('resize', syncDesktopState);
  void nextTick(() => {
    resizeMarkdownEditor();
    syncMarkdownEditorHeight();
    if (typeof window !== 'undefined' && 'ResizeObserver' in window && markdownEditorShellRef.value) {
      markdownEditorResizeObserver = new ResizeObserver(() => {
        syncMarkdownEditorHeight();
      });
      markdownEditorResizeObserver.observe(markdownEditorShellRef.value);
    }
  });
});

onBeforeUnmount(() => {
  clearPreviewTimer();
  markdownEditorResizeObserver?.disconnect();
  markdownEditorResizeObserver = null;
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', syncDesktopState);
  }
});
</script>

<template>
  <div class="ui-panel shadow-sm dark:border-line">
    <div class="bg-surface-soft/70 space-y-3 border-b border-line px-4 py-3 dark:border-line">
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" :class="tabClass(viewMode === 'markdown')" :disabled="isModeSwitching" @click="switchToMarkdownMode">Markdown</button>
        <button type="button" :class="tabClass(viewMode === 'wysiwyg')" :disabled="isModeSwitching" @click="switchToWysiwygMode">WYSIWYG</button>
        <span
          v-if="isModeSwitching"
          class="inline-flex h-8 items-center rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
        >
          모드 변환 중
        </span>
        <span
          v-if="uploadInProgressCount > 0 && viewMode === 'markdown'"
          class="inline-flex h-8 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          업로드 {{ uploadInProgressCount }}건 진행중
        </span>
      </div>

      <template v-if="viewMode === 'markdown'">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" :class="previewModeButtonClass(markdownPreviewMode === 'write')" @click="markdownPreviewMode = 'write'">작성</button>
          <button type="button" :class="previewModeButtonClass(markdownPreviewMode === 'split')" @click="markdownPreviewMode = 'split'">분할</button>
          <button type="button" :class="previewModeButtonClass(markdownPreviewMode === 'preview')" @click="markdownPreviewMode = 'preview'">
            미리보기
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" :class="actionButtonClass" @click="addHeading(1)">H1</button>
          <button type="button" :class="actionButtonClass" @click="addHeading(2)">H2</button>
          <button type="button" :class="actionButtonClass" @click="addBold">굵게</button>
          <button type="button" :class="actionButtonClass" @click="addItalic">기울임</button>
          <button type="button" :class="actionButtonClass" @click="addLink">링크</button>
          <button type="button" :class="actionButtonClass" @click="addBulletList">글머리</button>
          <button type="button" :class="actionButtonClass" @click="addOrderedList">번호</button>
          <button type="button" :class="actionButtonClass" @click="addTaskList">체크</button>
          <button type="button" :class="actionButtonClass" @click="addBlockquote">인용</button>
          <button type="button" :class="actionButtonClass" @click="addCodeBlock">코드</button>
          <button type="button" :class="actionButtonClass" @click="addTable">표</button>
          <button type="button" :class="actionButtonClass" @click="addMermaidBlock">Mermaid</button>
          <button type="button" :class="actionButtonClass" @click="addYouTubeEmbed">유튜브</button>
          <button type="button" :class="actionButtonClass" @click="openMarkdownImagePicker">이미지 업로드</button>
          <button type="button" :class="actionButtonClass" @click="openMarkdownVideoPicker">영상 업로드</button>
          <button type="button" :class="actionButtonClass" @click="openMarkdownImportPicker">MD 불러오기</button>
        </div>
      </template>
    </div>

    <template v-if="viewMode === 'wysiwyg'">
      <ArticleEditor :model-value="htmlSource" :placeholder="placeholder" @update:model-value="updateHtmlSource" />
    </template>

    <template v-else>
      <div class="space-y-3 px-4 py-4">
        <div
          v-if="markdownImportFeedback"
          class="rounded-2xl border px-4 py-3 text-xs font-medium"
          :class="
            markdownImportFeedback.tone === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
          "
        >
          <ul class="space-y-1">
            <li v-for="message in markdownImportFeedback.messages" :key="message">{{ message }}</li>
          </ul>
        </div>

        <div
          :class="markdownPanelClass"
          @dragenter.prevent="onMarkdownDragOver"
          @dragover.prevent="onMarkdownDragOver"
          @dragleave="onMarkdownDragLeave"
          @drop.prevent="onMarkdownDrop"
        >
          <div class="mb-3 flex items-center justify-between gap-3 text-xs font-semibold text-muted">
            <span>Markdown으로 작성하고, 오른쪽에서 실제 렌더 결과를 확인합니다.</span>
            <span class="text-[11px]">이미지/영상 드래그 앤 드롭 가능</span>
          </div>
          <div class="bg-surface/80 mb-3 rounded-xl border border-line px-3 py-2 text-[11px] text-muted dark:border-line dark:text-subtle">
            유튜브 임베드 문법:
            <code class="bg-surface-soft mx-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-ink">!youtube[dQw4w9WgXcQ]</code>
            또는
            <code class="bg-surface-soft mx-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-ink">!youtube[https://youtu.be/dQw4w9WgXcQ]</code>
          </div>

          <div class="gap-4" :class="isMarkdownSplitMode ? 'grid lg:grid-cols-2 lg:items-stretch' : 'block'">
            <div v-if="markdownPreviewMode !== 'preview'" class="space-y-2" :class="isMarkdownSplitMode ? 'min-h-0' : ''">
              <label class="block text-xs font-semibold text-muted">Markdown 작성</label>
              <div ref="markdownEditorShellRef" class="ui-markdown-editor-shell">
                <div class="ui-markdown-editor-head">
                  <div>
                    <p class="text-xs font-extrabold tracking-[0.12em] text-muted">SOURCE</p>
                    <p class="mt-1 text-sm font-semibold text-ink">Markdown 작업영역</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs font-semibold text-muted">{{ markdownStatusText }}</p>
                    <p class="mt-1 text-[11px] text-subtle">Tab 들여쓰기 · Ctrl/Cmd+B/I/K 지원</p>
                  </div>
                </div>
                <div class="ui-markdown-editor-grid">
                  <div class="ui-markdown-editor-gutter">
                    <div class="ui-markdown-editor-gutter-track" :style="markdownGutterStyle">
                      <div v-for="lineNumber in markdownLineNumbers" :key="lineNumber" class="ui-markdown-editor-gutter-line">
                        {{ lineNumber }}
                      </div>
                    </div>
                  </div>
                  <textarea
                    ref="markdownTextareaRef"
                    :value="markdownSource"
                    class="ui-markdown-editor-input"
                    spellcheck="false"
                    :placeholder="placeholder ?? '본문을 입력하세요.'"
                    @input="onMarkdownInput"
                    @scroll="onMarkdownScroll"
                    @keydown="onMarkdownKeydown"
                  ></textarea>
                </div>
                <div class="ui-markdown-editor-status">
                  <span>표, Mermaid, 코드블록은 실제 게시글과 같은 서버 렌더 규칙을 사용합니다.</span>
                  <span class="hidden sm:inline">Mermaid 지원: `graph/flowchart`, `sequenceDiagram`, `erDiagram`</span>
                  <span class="hidden xl:inline">유튜브 지원: `!youtube[URL 또는 VIDEO_ID]`</span>
                </div>
              </div>
            </div>

            <div v-if="markdownPreviewMode !== 'write'" class="space-y-2" :class="isMarkdownSplitMode ? 'min-h-0' : ''">
              <div class="flex items-center justify-between gap-2">
                <label class="block text-xs font-semibold text-muted">미리보기</label>
                <span v-if="isPreviewLoading" class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">렌더링 중...</span>
              </div>
              <div class="ui-markdown-preview-shell" :style="markdownPreviewShellStyle">
                <div class="ui-markdown-preview-body ui-scrollbar">
                  <p v-if="previewErrorMessage" class="text-sm font-semibold text-rose-500">{{ previewErrorMessage }}</p>
                  <p v-else-if="!previewHtml" class="text-sm text-subtle">미리보기가 여기에 표시됩니다.</p>
                  <div v-else ref="markdownPreviewRef" class="ui-content max-w-none" v-html="previewHtml"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="uploads.length > 0" class="rounded-2xl border border-line bg-surface p-3 shadow-sm dark:border-line">
          <p class="text-xs font-semibold text-muted">업로드 큐</p>
          <div class="mt-2 space-y-2">
            <div v-for="item in uploads" :key="item.id" class="rounded-lg border border-line px-3 py-2 text-xs dark:border-line">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate font-semibold text-ink">{{ item.file.name }}</p>
                  <p class="text-[11px] text-muted">{{ item.kind === 'image' ? '이미지' : '영상' }} · {{ item.message }}</p>
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
                    class="hover:bg-surface-soft rounded border border-line px-2 py-1 text-[11px] font-semibold text-muted hover:border-line dark:text-subtle"
                    @click="removeUpload(item.id)"
                  >
                    지우기
                  </button>
                </div>
              </div>
              <div class="bg-surface-soft bg-surface-2 mt-2 h-1.5 overflow-hidden rounded">
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
      </div>
    </template>

    <div class="bg-surface-soft/60 border-t border-line px-4 py-2 text-[11px] text-muted dark:border-line dark:text-subtle">
      Markdown 글은 저장 전 서버 미리보기 렌더를 거치고, WYSIWYG 글은 sanitize된 HTML 기준으로 저장됩니다.
    </div>

    <input ref="markdownImportInputRef" type="file" accept=".md,.markdown,text/markdown,text/plain" class="hidden" @change="onMarkdownImportPicked" />
    <input ref="markdownImageInputRef" type="file" accept="image/*" class="hidden" multiple @change="onMarkdownImagePicked" />
    <input ref="markdownVideoInputRef" type="file" accept="video/mp4,video/webm" class="hidden" multiple @change="onMarkdownVideoPicked" />

    <BaseModal :open="isMarkdownSwitchConfirmOpen" aria-label="Markdown 전환 안내" @close="isMarkdownSwitchConfirmOpen = false">
      <template #default="{ titleId }">
        <div class="space-y-4">
          <div>
            <h2 :id="titleId" class="text-lg font-semibold text-ink">Markdown 전환 안내</h2>
            <p class="mt-1 text-sm text-muted">
              현재 본문에는 Markdown에서 완전히 표현되지 않을 수 있는 요소가 있습니다. 일부 스타일이나 고급 요소는 전환 과정에서 단순화될 수 있습니다.
            </p>
          </div>
          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:border-line dark:text-subtle dark:hover:text-white"
              @click="isMarkdownSwitchConfirmOpen = false"
            >
              취소
            </button>
            <button
              type="button"
              class="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
              @click="setMarkdownMode(pendingMarkdownSource)"
            >
              변환 후 계속
            </button>
          </div>
        </div>
      </template>
    </BaseModal>

    <BaseModal :open="isMarkdownImportConfirmOpen" aria-label="Markdown 덮어쓰기 확인" @close="isMarkdownImportConfirmOpen = false">
      <template #default="{ titleId }">
        <div class="space-y-4">
          <div>
            <h2 :id="titleId" class="text-lg font-semibold text-ink">현재 초안을 덮어쓸까요?</h2>
            <p class="mt-1 text-sm text-muted">MD 파일을 불러오면 현재 Markdown 본문이 새 내용으로 교체됩니다.</p>
          </div>
          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:border-line dark:text-subtle dark:hover:text-white"
              @click="isMarkdownImportConfirmOpen = false"
            >
              취소
            </button>
            <button
              type="button"
              class="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
              :disabled="!pendingImportedMarkdown"
              @click="pendingImportedMarkdown ? applyImportedMarkdown(pendingImportedMarkdown) : undefined"
            >
              덮어쓰기
            </button>
          </div>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
