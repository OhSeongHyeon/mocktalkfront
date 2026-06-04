<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { Editor } from '@tiptap/core';

type MobileAccordionKey = 'text' | 'font' | 'structure' | 'insert' | 'table';
type TextAlignValue = 'left' | 'center' | 'right' | 'justify';

interface ToolbarOption {
  value: string;
  label: string;
}

interface ToolbarActions {
  toggleBold: () => void;
  toggleItalic: () => void;
  setLink: () => void;
  openImagePicker: () => void;
  toggleTaskList: () => void;
  undo: () => void;
  redo: () => void;
  toggleMobileMore: () => void;
  toggleMobileAccordion: (key: MobileAccordionKey) => void;
  toggleUnderline: () => void;
  toggleStrike: () => void;
  toggleInlineCode: () => void;
  toggleSubscript: () => void;
  toggleSuperscript: () => void;
  applyTextColor: () => void;
  clearTextColor: () => void;
  applyHighlightColor: () => void;
  clearHighlightColor: () => void;
  setHeading: (level: 1 | 2 | 3) => void;
  setParagraph: () => void;
  setTextAlign: (alignment: TextAlignValue) => void;
  toggleBulletList: () => void;
  toggleOrderedList: () => void;
  toggleBlockquote: () => void;
  setHorizontalRule: () => void;
  toggleCodeBlock: () => void;
  startMention: () => void;
  openVideoPicker: () => void;
  openYoutubeModal: () => void;
  applyYoutubeSize: () => void;
  insertTable: () => void;
  addRowBefore: () => void;
  addRowAfter: () => void;
  deleteRow: () => void;
  addColumnBefore: () => void;
  addColumnAfter: () => void;
  deleteColumn: () => void;
  mergeCells: () => void;
  splitCell: () => void;
  toggleHeaderRow: () => void;
  toggleHeaderColumn: () => void;
  toggleHeaderCell: () => void;
  deleteTable: () => void;
}

interface Props {
  editor: Editor | null | undefined;
  isMobileMoreOpen: boolean;
  mobileAccordionKey: MobileAccordionKey | null;
  isTableSelected: boolean;
  fontFamily: string;
  fontSize: string;
  textColor: string;
  highlightColor: string;
  codeLanguage: string;
  youtubeSize: string;
  fontFamilyOptions: ReadonlyArray<ToolbarOption>;
  fontSizeOptions: ReadonlyArray<ToolbarOption>;
  codeLanguageOptions: ReadonlyArray<ToolbarOption>;
  youtubeSizeOptions: ReadonlyArray<ToolbarOption>;
  buttonClass: (active?: boolean, emphasis?: boolean) => string;
  selectClass: string;
  sectionClass: string;
  sectionLabelClass: string;
  actions: ToolbarActions;
}

defineProps<Props>();
const { t } = useI18n();
const emit = defineEmits<{
  (event: 'update:fontFamily', value: string): void;
  (event: 'update:fontSize', value: string): void;
  (event: 'update:textColor', value: string): void;
  (event: 'update:highlightColor', value: string): void;
  (event: 'update:codeLanguage', value: string): void;
  (event: 'update:youtubeSize', value: string): void;
}>();

const onFontFamilyChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null;
  if (!target) {
    return;
  }
  emit('update:fontFamily', target.value);
};

const onFontSizeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null;
  if (!target) {
    return;
  }
  emit('update:fontSize', target.value);
};

const onTextColorChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  if (!target) {
    return;
  }
  emit('update:textColor', target.value);
};

const onHighlightColorChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  if (!target) {
    return;
  }
  emit('update:highlightColor', target.value);
};

const onCodeLanguageChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null;
  if (!target) {
    return;
  }
  emit('update:codeLanguage', target.value);
};

const onYoutubeSizeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null;
  if (!target) {
    return;
  }
  emit('update:youtubeSize', target.value);
};
</script>

<template>
  <div class="space-y-1 md:hidden">
    <div :class="sectionClass">
      <span :class="sectionLabelClass">{{ t('editor.toolbar.section.quick') }}</span>
      <button type="button" :class="buttonClass(editor?.isActive('bold'))" @click="actions.toggleBold">{{ t('editor.toolbar.bold') }}</button>
      <button type="button" :class="buttonClass(editor?.isActive('italic'))" @click="actions.toggleItalic">{{ t('editor.toolbar.italic') }}</button>
      <button type="button" :class="buttonClass(editor?.isActive('link'))" @click="actions.setLink">{{ t('editor.toolbar.link') }}</button>
      <button type="button" :class="buttonClass()" @click="actions.openImagePicker">{{ t('editor.toolbar.image') }}</button>
      <button type="button" :class="buttonClass(editor?.isActive('taskList'))" @click="actions.toggleTaskList">
        {{ t('editor.toolbar.check') }}
      </button>
      <button type="button" :class="buttonClass()" @click="actions.undo">{{ t('editor.toolbar.undo') }}</button>
      <button type="button" :class="buttonClass()" @click="actions.redo">{{ t('editor.toolbar.redo') }}</button>
      <button
        type="button"
        :class="buttonClass(isMobileMoreOpen, true)"
        aria-controls="mobile-editor-more"
        :aria-expanded="isMobileMoreOpen"
        @click="actions.toggleMobileMore"
      >
        {{ isMobileMoreOpen ? t('editor.toolbar.moreClose') : t('editor.toolbar.more') }}
      </button>
    </div>

    <div
      v-if="isMobileMoreOpen"
      id="mobile-editor-more"
      class="dark:border-line/80 space-y-1 rounded-ui border border-line bg-surface-soft bg-surface/75 p-2 shadow-sm"
    >
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          :class="buttonClass(mobileAccordionKey === 'text', true)"
          aria-controls="mobile-accordion-text"
          :aria-expanded="mobileAccordionKey === 'text'"
          @click="actions.toggleMobileAccordion('text')"
        >
          {{ t('editor.toolbar.section.text') }}
        </button>
        <button
          type="button"
          :class="buttonClass(mobileAccordionKey === 'font', true)"
          aria-controls="mobile-accordion-font"
          :aria-expanded="mobileAccordionKey === 'font'"
          @click="actions.toggleMobileAccordion('font')"
        >
          {{ t('editor.toolbar.section.fontColor') }}
        </button>
        <button
          type="button"
          :class="buttonClass(mobileAccordionKey === 'structure', true)"
          aria-controls="mobile-accordion-structure"
          :aria-expanded="mobileAccordionKey === 'structure'"
          @click="actions.toggleMobileAccordion('structure')"
        >
          {{ t('editor.toolbar.section.paragraph') }}
        </button>
        <button
          type="button"
          :class="buttonClass(mobileAccordionKey === 'insert', true)"
          aria-controls="mobile-accordion-insert"
          :aria-expanded="mobileAccordionKey === 'insert'"
          @click="actions.toggleMobileAccordion('insert')"
        >
          {{ t('editor.toolbar.section.codeInsert') }}
        </button>
        <button
          type="button"
          :class="buttonClass(mobileAccordionKey === 'table', true)"
          aria-controls="mobile-accordion-table"
          :aria-expanded="mobileAccordionKey === 'table'"
          @click="actions.toggleMobileAccordion('table')"
        >
          {{ t('editor.toolbar.section.table') }}
        </button>
      </div>

      <div v-if="mobileAccordionKey === 'text'" id="mobile-accordion-text" :class="sectionClass">
        <button type="button" :class="buttonClass(editor?.isActive('underline'))" @click="actions.toggleUnderline">
          {{ t('editor.toolbar.underline') }}
        </button>
        <button type="button" :class="buttonClass(editor?.isActive('strike'))" @click="actions.toggleStrike">{{ t('editor.toolbar.strike') }}</button>
        <button type="button" :class="buttonClass(editor?.isActive('code'))" @click="actions.toggleInlineCode">
          {{ t('editor.toolbar.inlineCode') }}
        </button>
        <button type="button" :class="buttonClass(editor?.isActive('subscript'))" @click="actions.toggleSubscript">
          {{ t('editor.toolbar.subscript') }}
        </button>
        <button type="button" :class="buttonClass(editor?.isActive('superscript'))" @click="actions.toggleSuperscript">
          {{ t('editor.toolbar.superscript') }}
        </button>
      </div>

      <div v-if="mobileAccordionKey === 'font'" id="mobile-accordion-font" class="dark:border-line/80 ui-card space-y-2 p-2">
        <div class="flex flex-wrap items-center gap-2">
          <select :value="fontFamily" :class="selectClass" :aria-label="t('editor.toolbar.aria.fontFamily')" @change="onFontFamilyChange">
            <option v-for="option in fontFamilyOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <select :value="fontSize" :class="selectClass" :aria-label="t('editor.toolbar.aria.fontSize')" @change="onFontSizeChange">
            <option v-for="option in fontSizeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <label class="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
            {{ t('editor.toolbar.textColor') }}
            <input :value="textColor" type="color" class="h-7 w-7 rounded border border-line p-0.5 dark:border-line" @input="onTextColorChange" />
          </label>
          <button type="button" :class="buttonClass()" @click="actions.applyTextColor">{{ t('editor.toolbar.apply') }}</button>
          <button type="button" :class="buttonClass()" @click="actions.clearTextColor">{{ t('editor.toolbar.clear') }}</button>
          <label class="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
            {{ t('editor.toolbar.highlight') }}
            <input
              :value="highlightColor"
              type="color"
              class="h-7 w-7 rounded border border-line p-0.5 dark:border-line"
              @input="onHighlightColorChange"
            />
          </label>
          <button type="button" :class="buttonClass(editor?.isActive('highlight'))" @click="actions.applyHighlightColor">
            {{ t('editor.toolbar.apply') }}
          </button>
          <button type="button" :class="buttonClass()" @click="actions.clearHighlightColor">{{ t('editor.toolbar.clear') }}</button>
        </div>
      </div>

      <div v-if="mobileAccordionKey === 'structure'" id="mobile-accordion-structure" :class="sectionClass">
        <button type="button" :class="buttonClass(editor?.isActive('heading', { level: 1 }))" @click="actions.setHeading(1)">H1</button>
        <button type="button" :class="buttonClass(editor?.isActive('heading', { level: 2 }))" @click="actions.setHeading(2)">H2</button>
        <button type="button" :class="buttonClass(editor?.isActive('heading', { level: 3 }))" @click="actions.setHeading(3)">H3</button>
        <button type="button" :class="buttonClass(editor?.isActive('paragraph'))" @click="actions.setParagraph">
          {{ t('editor.toolbar.paragraph') }}
        </button>
        <button type="button" :class="buttonClass(editor?.isActive({ textAlign: 'left' }))" @click="actions.setTextAlign('left')">
          {{ t('editor.toolbar.alignLeft') }}
        </button>
        <button type="button" :class="buttonClass(editor?.isActive({ textAlign: 'center' }))" @click="actions.setTextAlign('center')">
          {{ t('editor.toolbar.alignCenter') }}
        </button>
        <button type="button" :class="buttonClass(editor?.isActive({ textAlign: 'right' }))" @click="actions.setTextAlign('right')">
          {{ t('editor.toolbar.alignRight') }}
        </button>
        <button type="button" :class="buttonClass(editor?.isActive({ textAlign: 'justify' }))" @click="actions.setTextAlign('justify')">
          {{ t('editor.toolbar.alignJustify') }}
        </button>
        <button type="button" :class="buttonClass(editor?.isActive('bulletList'))" @click="actions.toggleBulletList">
          {{ t('editor.toolbar.bulletList') }}
        </button>
        <button type="button" :class="buttonClass(editor?.isActive('orderedList'))" @click="actions.toggleOrderedList">
          {{ t('editor.toolbar.orderedList') }}
        </button>
        <button type="button" :class="buttonClass(editor?.isActive('taskList'))" @click="actions.toggleTaskList">
          {{ t('editor.toolbar.taskList') }}
        </button>
        <button type="button" :class="buttonClass(editor?.isActive('blockquote'))" @click="actions.toggleBlockquote">
          {{ t('editor.toolbar.blockquote') }}
        </button>
        <button type="button" :class="buttonClass()" @click="actions.setHorizontalRule">{{ t('editor.toolbar.horizontalRule') }}</button>
      </div>

      <div v-if="mobileAccordionKey === 'insert'" id="mobile-accordion-insert" class="dark:border-line/80 ui-card space-y-2 p-2">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" :class="buttonClass(editor?.isActive('codeBlock'))" @click="actions.toggleCodeBlock">
            {{ t('editor.toolbar.codeBlock') }}
          </button>
          <select :value="codeLanguage" :class="selectClass" :aria-label="t('editor.toolbar.aria.codeLanguage')" @change="onCodeLanguageChange">
            <option v-for="option in codeLanguageOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <button type="button" :class="buttonClass()" @click="actions.startMention">{{ t('editor.toolbar.mention') }}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" :class="buttonClass()" @click="actions.openImagePicker">{{ t('editor.toolbar.image') }}</button>
          <button type="button" :class="buttonClass()" @click="actions.openVideoPicker">{{ t('editor.toolbar.video') }}</button>
          <button type="button" :class="buttonClass()" @click="actions.openYoutubeModal">{{ t('editor.toolbar.youtube') }}</button>
          <select :value="youtubeSize" :class="selectClass" :aria-label="t('editor.toolbar.aria.youtubeSize')" @change="onYoutubeSizeChange">
            <option v-for="option in youtubeSizeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <button type="button" :class="buttonClass()" @click="actions.applyYoutubeSize">{{ t('editor.toolbar.youtubeSizeApply') }}</button>
        </div>
      </div>

      <div v-if="mobileAccordionKey === 'table'" id="mobile-accordion-table" class="dark:border-line/80 ui-card space-y-2 p-2">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" :class="buttonClass(editor?.isActive('table'))" @click="actions.insertTable">
            {{ t('editor.toolbar.insertTable') }}
          </button>
        </div>
        <div v-if="isTableSelected" class="flex flex-wrap items-center gap-2">
          <button type="button" :class="buttonClass()" @click="actions.addRowBefore">{{ t('editor.toolbar.rowAddBefore') }}</button>
          <button type="button" :class="buttonClass()" @click="actions.addRowAfter">{{ t('editor.toolbar.rowAddAfter') }}</button>
          <button type="button" :class="buttonClass()" @click="actions.deleteRow">{{ t('editor.toolbar.rowDelete') }}</button>
          <button type="button" :class="buttonClass()" @click="actions.addColumnBefore">{{ t('editor.toolbar.colAddBefore') }}</button>
          <button type="button" :class="buttonClass()" @click="actions.addColumnAfter">{{ t('editor.toolbar.colAddAfter') }}</button>
          <button type="button" :class="buttonClass()" @click="actions.deleteColumn">{{ t('editor.toolbar.colDelete') }}</button>
          <button type="button" :class="buttonClass()" @click="actions.mergeCells">{{ t('editor.toolbar.mergeCells') }}</button>
          <button type="button" :class="buttonClass()" @click="actions.splitCell">{{ t('editor.toolbar.splitCell') }}</button>
          <button type="button" :class="buttonClass()" @click="actions.toggleHeaderRow">{{ t('editor.toolbar.headerRow') }}</button>
          <button type="button" :class="buttonClass()" @click="actions.toggleHeaderColumn">{{ t('editor.toolbar.headerColumn') }}</button>
          <button type="button" :class="buttonClass()" @click="actions.toggleHeaderCell">{{ t('editor.toolbar.headerCell') }}</button>
          <button type="button" :class="buttonClass()" @click="actions.deleteTable">{{ t('editor.toolbar.deleteTable') }}</button>
        </div>
        <p v-else class="text-[11px] font-semibold text-muted">{{ t('editor.toolbar.tableCursorHint') }}</p>
      </div>
    </div>
  </div>
</template>
