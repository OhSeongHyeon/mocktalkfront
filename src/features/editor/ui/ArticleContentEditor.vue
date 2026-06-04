<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import '../../../shared/styles/mermaid.css';
import '../../../shared/styles/ui-content.css';
import './article-content-editor.css';

import type { ArticleContentFormat } from '../../../entities/article';
import { attachFileViewMediaRecovery, hasFileViewMediaUrls, resolveProtectedFileViewUrlsInHtml, uploadEditorFileTask } from '../../../entities/file';
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
const { t } = useI18n();

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
const isPreviewMediaLoading = ref(false);
let detachPreviewMediaRecovery: (() => void) | undefined;
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

const bindPreviewMediaRecovery = async () => {
  detachPreviewMediaRecovery?.();
  detachPreviewMediaRecovery = undefined;
  await nextTick();
  detachPreviewMediaRecovery = attachFileViewMediaRecovery(markdownPreviewRef.value, isAuthenticated.value);
};

const applyPreviewHtml = async (html: string) => {
  const sanitized = sanitizeHtml(html);
  previewSanitizedHtml.value = sanitized;
  const shouldHydrateMedia = isAuthenticated.value && hasFileViewMediaUrls(sanitized);
  isPreviewMediaLoading.value = shouldHydrateMedia;

  try {
    previewHtml.value = await resolveProtectedFileViewUrlsInHtml(sanitized, isAuthenticated.value);
    if (shouldHydrateMedia) {
      await bindPreviewMediaRecovery();
    }
  } finally {
    isPreviewMediaLoading.value = false;
  }
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
    previewErrorMessage.value = error instanceof ApiError ? error.message : t('editor.markdown.preview.loadFailed');
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
    previewErrorMessage.value = error instanceof ApiError ? error.message : t('editor.mode.switchToMarkdownFailed');
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
    previewErrorMessage.value = error instanceof ApiError ? error.message : t('editor.mode.switchToWysiwygFailed');
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
const addCodeBlock = () => wrapSelection('```text\n', '\n```', t('editor.markdown.placeholders.code'));
const addLink = () => wrapSelection('[', '](https://example.com)', t('editor.markdown.placeholders.linkText'));
const addTable = () =>
  insertBlock(
    `\n\n| ${t('editor.markdown.table.headerItem')} | ${t('editor.markdown.table.headerValue')} |\n| --- | --- |\n| ${t('editor.markdown.table.exampleLabel')} | ${t('editor.markdown.table.exampleContent')} |\n\n`,
  );
const addMermaidBlock = () => wrapSelection('```mermaid\n', '\n```', t('editor.markdown.placeholders.mermaid'));
const addYouTubeEmbed = () => wrapSelection('!youtube[', ']', 'https://youtu.be/dQw4w9WgXcQ');
const addBold = () => wrapSelection('**', '**', t('editor.markdown.placeholders.bold'));
const addItalic = () => wrapSelection('*', '*', t('editor.markdown.placeholders.italic'));

const markdownLineNumbers = computed(() => {
  const lineCount = Math.max(1, markdownSource.value.split('\n').length);
  return Array.from({ length: lineCount }, (_, index) => index + 1);
});

const markdownCharacterCount = computed(() => markdownSource.value.length);
const markdownWordCount = computed(() => {
  const trimmed = markdownSource.value.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
});

const markdownStatusText = computed(() =>
  t('editor.markdown.panel.status', {
    lines: markdownLineNumbers.value.length,
    words: markdownWordCount.value,
    chars: markdownCharacterCount.value,
  }),
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
  const snippet = kind === 'image' ? `\n![${t('editor.upload.markdownImageAlt')}](${url})\n` : `\n<video controls src="${url}"></video>\n`;
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
  unsupportedFileMessage: t('editor.upload.unsupportedFile'),
  maxSizeExceededMessage: t('editor.upload.maxSizeExceeded'),
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
  const messages: string[] = [t('editor.markdown.import.loaded')];
  const warnings = [...result.warnings];

  if (result.metadata.title) {
    messages.push(t('editor.markdown.import.titleApplied'));
  }

  const nextVisibility = result.metadata.visibility?.trim().toUpperCase();
  const allowedVisibilities = props.availableVisibilities?.map((value) => value.trim().toUpperCase()) ?? [];
  if (nextVisibility) {
    const canDeferVisibility = Boolean(
      props.allowBoardSlugImport && result.metadata.boardSlug && props.boardSlug && result.metadata.boardSlug !== props.boardSlug,
    );
    if (canDeferVisibility || allowedVisibilities.length === 0 || allowedVisibilities.includes(nextVisibility)) {
      messages.push(t('editor.markdown.import.visibilityApplied'));
    } else {
      warnings.push(t('editor.markdown.import.visibilitySkipped', { visibility: nextVisibility }));
    }
  }

  if (result.metadata.boardSlug && props.boardSlug && result.metadata.boardSlug !== props.boardSlug) {
    if (props.allowBoardSlugImport) {
      messages.push(t('editor.markdown.import.boardSlugApplied', { boardSlug: result.metadata.boardSlug }));
    } else {
      warnings.push(
        t('editor.markdown.import.boardSlugSkipped', {
          boardSlug: result.metadata.boardSlug,
          currentBoardSlug: props.boardSlug,
        }),
      );
    }
  }

  if (result.metadata.tags.length > 0 || result.metadata.summary) {
    warnings.push(t('editor.markdown.import.tagsSummaryPreserved'));
  }

  if (result.unsupportedFields.length > 0) {
    warnings.push(t('editor.markdown.import.unsupportedFields', { fields: result.unsupportedFields.join(', ') }));
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
      : 'border-line bg-surface text-muted hover:border-line hover:text-ink dark:text-subtle dark:hover:text-ink',
  ].join(' ');

const actionButtonClass =
  'inline-flex h-8 items-center rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:text-subtle dark:hover:text-ink';

const previewModeButtonClass = (active: boolean) =>
  [
    'inline-flex h-8 items-center rounded-xl border px-3 text-xs font-semibold transition',
    active
      ? 'border-[color:var(--accent-strong)] bg-[color:var(--accent-strong)] text-white dark:border-line dark:bg-surface-2 dark:text-ink'
      : 'border-line bg-surface text-muted hover:border-line hover:text-ink dark:text-subtle dark:hover:text-ink',
  ].join(' ');

const markdownPanelClass = computed(() =>
  [
    'rounded-ui border border-dashed px-4 py-3 transition',
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
    await applyPreviewHtml(previewSanitizedHtml.value);
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
  detachPreviewMediaRecovery?.();
  detachPreviewMediaRecovery = undefined;
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
    <div class="space-y-3 border-b border-line bg-surface-soft/70 px-4 py-3 dark:border-line">
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" :class="tabClass(viewMode === 'markdown')" :disabled="isModeSwitching" @click="switchToMarkdownMode">
          {{ t('editor.mode.markdown') }}
        </button>
        <button type="button" :class="tabClass(viewMode === 'wysiwyg')" :disabled="isModeSwitching" @click="switchToWysiwygMode">
          {{ t('editor.mode.wysiwygLabel') }}
        </button>
        <span
          v-if="isModeSwitching"
          class="inline-flex h-8 items-center rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
        >
          {{ t('editor.mode.switching') }}
        </span>
        <span
          v-if="uploadInProgressCount > 0 && viewMode === 'markdown'"
          class="inline-flex h-8 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {{ t('editor.upload.inProgress', { count: uploadInProgressCount }) }}
        </span>
      </div>

      <template v-if="viewMode === 'markdown'">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" :class="previewModeButtonClass(markdownPreviewMode === 'write')" @click="markdownPreviewMode = 'write'">
            {{ t('editor.markdown.preview.write') }}
          </button>
          <button type="button" :class="previewModeButtonClass(markdownPreviewMode === 'split')" @click="markdownPreviewMode = 'split'">
            {{ t('editor.markdown.preview.split') }}
          </button>
          <button type="button" :class="previewModeButtonClass(markdownPreviewMode === 'preview')" @click="markdownPreviewMode = 'preview'">
            {{ t('editor.markdown.preview.preview') }}
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" :class="actionButtonClass" @click="addHeading(1)">H1</button>
          <button type="button" :class="actionButtonClass" @click="addHeading(2)">H2</button>
          <button type="button" :class="actionButtonClass" @click="addBold">{{ t('editor.markdown.toolbar.bold') }}</button>
          <button type="button" :class="actionButtonClass" @click="addItalic">{{ t('editor.markdown.toolbar.italic') }}</button>
          <button type="button" :class="actionButtonClass" @click="addLink">{{ t('editor.markdown.toolbar.link') }}</button>
          <button type="button" :class="actionButtonClass" @click="addBulletList">{{ t('editor.markdown.toolbar.bulletList') }}</button>
          <button type="button" :class="actionButtonClass" @click="addOrderedList">{{ t('editor.markdown.toolbar.orderedList') }}</button>
          <button type="button" :class="actionButtonClass" @click="addTaskList">{{ t('editor.markdown.toolbar.taskList') }}</button>
          <button type="button" :class="actionButtonClass" @click="addBlockquote">{{ t('editor.markdown.toolbar.blockquote') }}</button>
          <button type="button" :class="actionButtonClass" @click="addCodeBlock">{{ t('editor.markdown.toolbar.codeBlock') }}</button>
          <button type="button" :class="actionButtonClass" @click="addTable">{{ t('editor.markdown.toolbar.table') }}</button>
          <button type="button" :class="actionButtonClass" @click="addMermaidBlock">{{ t('editor.markdown.toolbar.mermaid') }}</button>
          <button type="button" :class="actionButtonClass" @click="addYouTubeEmbed">{{ t('editor.markdown.toolbar.youtube') }}</button>
          <button type="button" :class="actionButtonClass" @click="openMarkdownImagePicker">{{ t('editor.markdown.toolbar.imageUpload') }}</button>
          <button type="button" :class="actionButtonClass" @click="openMarkdownVideoPicker">{{ t('editor.markdown.toolbar.videoUpload') }}</button>
          <button type="button" :class="actionButtonClass" @click="openMarkdownImportPicker">{{ t('editor.markdown.toolbar.importMd') }}</button>
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
          class="rounded-ui border px-4 py-3 text-xs font-medium"
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
            <span>{{ t('editor.markdown.panel.splitHint') }}</span>
            <span class="text-[11px]">{{ t('editor.markdown.panel.dragDropHint') }}</span>
          </div>
          <div class="mb-3 rounded-xl border border-line bg-surface/80 px-3 py-2 text-[11px] text-muted dark:border-line dark:text-subtle">
            {{ t('editor.markdown.panel.youtubeSyntax') }}
            <code class="mx-1 rounded bg-surface-soft px-1.5 py-0.5 text-[11px] font-semibold text-ink">!youtube[dQw4w9WgXcQ]</code>
            {{ t('editor.markdown.panel.or') }}
            <code class="mx-1 rounded bg-surface-soft px-1.5 py-0.5 text-[11px] font-semibold text-ink">!youtube[https://youtu.be/dQw4w9WgXcQ]</code>
          </div>

          <div class="gap-4" :class="isMarkdownSplitMode ? 'grid lg:grid-cols-2 lg:items-stretch' : 'block'">
            <div v-if="markdownPreviewMode !== 'preview'" class="space-y-2" :class="isMarkdownSplitMode ? 'min-h-0' : ''">
              <label class="block text-xs font-semibold text-muted">{{ t('editor.markdown.panel.writeLabel') }}</label>
              <div ref="markdownEditorShellRef" class="ui-markdown-editor-shell">
                <div class="ui-markdown-editor-head">
                  <div>
                    <p class="text-xs font-extrabold tracking-[0.12em] text-muted">{{ t('editor.markdown.panel.source') }}</p>
                    <p class="mt-1 text-sm font-semibold text-ink">{{ t('editor.markdown.panel.workspace') }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs font-semibold text-muted">{{ markdownStatusText }}</p>
                    <p class="mt-1 text-[11px] text-subtle">{{ t('editor.markdown.panel.editorHints') }}</p>
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
                    :placeholder="placeholder ?? t('editor.placeholder.body')"
                    @input="onMarkdownInput"
                    @scroll="onMarkdownScroll"
                    @keydown="onMarkdownKeydown"
                  ></textarea>
                </div>
                <div class="ui-markdown-editor-status">
                  <span>{{ t('editor.markdown.panel.footerServerRender') }}</span>
                  <span class="hidden sm:inline">{{ t('editor.markdown.panel.footerMermaid') }}</span>
                  <span class="hidden xl:inline">{{ t('editor.markdown.panel.footerYoutube') }}</span>
                </div>
              </div>
            </div>

            <div v-if="markdownPreviewMode !== 'write'" class="space-y-2" :class="isMarkdownSplitMode ? 'min-h-0' : ''">
              <div class="flex items-center justify-between gap-2">
                <label class="block text-xs font-semibold text-muted">{{ t('editor.markdown.preview.label') }}</label>
                <span v-if="isPreviewLoading" class="text-[11px] font-semibold text-success">{{ t('editor.markdown.preview.loading') }}</span>
              </div>
              <div class="ui-markdown-preview-shell" :style="markdownPreviewShellStyle">
                <div class="ui-markdown-preview-body ui-scrollbar relative min-h-32">
                  <p v-if="previewErrorMessage" class="text-sm font-semibold text-danger">{{ previewErrorMessage }}</p>
                  <p v-else-if="!previewHtml && !isPreviewMediaLoading" class="text-sm text-subtle">{{ t('editor.markdown.preview.empty') }}</p>
                  <div v-if="isPreviewMediaLoading" class="flex min-h-32 items-center justify-center">
                    <p class="ui-section-loading">{{ t('editor.markdown.preview.mediaLoading') }}</p>
                  </div>
                  <div
                    v-show="previewHtml && !isPreviewMediaLoading"
                    ref="markdownPreviewRef"
                    class="ui-content max-w-none"
                    v-html="previewHtml"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="uploads.length > 0" class="rounded-ui border border-line bg-surface p-3 shadow-sm dark:border-line">
          <p class="text-xs font-semibold text-muted">{{ t('editor.upload.queue') }}</p>
          <div class="mt-2 space-y-2">
            <div v-for="item in uploads" :key="item.id" class="rounded-lg border border-line px-3 py-2 text-xs dark:border-line">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate font-semibold text-ink">{{ item.file.name }}</p>
                  <p class="text-[11px] text-muted">
                    {{ item.kind === 'image' ? t('editor.upload.kind.image') : t('editor.upload.kind.video') }} · {{ item.message }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    v-if="item.status === 'uploading'"
                    type="button"
                    class="rounded border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                    @click="cancelUpload(item.id)"
                  >
                    {{ t('editor.upload.cancel') }}
                  </button>
                  <button
                    v-if="item.status === 'error' || item.status === 'canceled'"
                    type="button"
                    class="rounded border border-amber-200 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:border-amber-300 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-950/40"
                    @click="retryUpload(item.id)"
                  >
                    {{ t('editor.upload.retry') }}
                  </button>
                  <button
                    v-if="item.status !== 'uploading'"
                    type="button"
                    class="rounded border border-line px-2 py-1 text-[11px] font-semibold text-muted hover:border-line hover:bg-surface-soft dark:text-subtle"
                    @click="removeUpload(item.id)"
                  >
                    {{ t('editor.upload.remove') }}
                  </button>
                </div>
              </div>
              <div class="mt-2 h-1.5 overflow-hidden rounded bg-surface-2 bg-surface-soft">
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

    <div class="border-t border-line bg-surface-soft/60 px-4 py-2 text-[11px] text-muted dark:border-line dark:text-subtle">
      {{ t('editor.mode.footer') }}
    </div>

    <input ref="markdownImportInputRef" type="file" accept=".md,.markdown,text/markdown,text/plain" class="hidden" @change="onMarkdownImportPicked" />
    <input ref="markdownImageInputRef" type="file" accept="image/*" class="hidden" multiple @change="onMarkdownImagePicked" />
    <input ref="markdownVideoInputRef" type="file" accept="video/mp4,video/webm" class="hidden" multiple @change="onMarkdownVideoPicked" />

    <BaseModal :open="isMarkdownSwitchConfirmOpen" :aria-label="t('editor.markdown.switch.modalAria')" @close="isMarkdownSwitchConfirmOpen = false">
      <template #default="{ titleId }">
        <div class="space-y-4">
          <div>
            <h2 :id="titleId" class="text-lg font-semibold text-ink">{{ t('editor.markdown.switch.title') }}</h2>
            <p class="mt-1 text-sm text-muted">
              {{ t('editor.markdown.switch.description') }}
            </p>
          </div>
          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:border-line dark:text-subtle dark:hover:text-ink"
              @click="isMarkdownSwitchConfirmOpen = false"
            >
              {{ t('editor.upload.cancel') }}
            </button>
            <button
              type="button"
              class="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
              @click="setMarkdownMode(pendingMarkdownSource)"
            >
              {{ t('editor.markdown.switch.continue') }}
            </button>
          </div>
        </div>
      </template>
    </BaseModal>

    <BaseModal :open="isMarkdownImportConfirmOpen" :aria-label="t('editor.markdown.import.modalAria')" @close="isMarkdownImportConfirmOpen = false">
      <template #default="{ titleId }">
        <div class="space-y-4">
          <div>
            <h2 :id="titleId" class="text-lg font-semibold text-ink">{{ t('editor.markdown.import.overwriteTitle') }}</h2>
            <p class="mt-1 text-sm text-muted">{{ t('editor.markdown.import.overwriteDescription') }}</p>
          </div>
          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:border-line dark:text-subtle dark:hover:text-ink"
              @click="isMarkdownImportConfirmOpen = false"
            >
              {{ t('editor.upload.cancel') }}
            </button>
            <button
              type="button"
              class="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
              :disabled="!pendingImportedMarkdown"
              @click="pendingImportedMarkdown ? applyImportedMarkdown(pendingImportedMarkdown) : undefined"
            >
              {{ t('editor.markdown.import.overwrite') }}
            </button>
          </div>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
