<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { Editor } from '@tiptap/core';

type TextAlignValue = 'left' | 'center' | 'right' | 'justify';

interface ToolbarOption {
  value: string;
  label: string;
}

interface ToolbarActions {
  toggleBold: () => void;
  toggleItalic: () => void;
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
  toggleTaskList: () => void;
  toggleBlockquote: () => void;
  setHorizontalRule: () => void;
  toggleCodeBlock: () => void;
  setLink: () => void;
  startMention: () => void;
  openImagePicker: () => void;
  openVideoPicker: () => void;
  openYoutubeModal: () => void;
  applyYoutubeSize: () => void;
  insertTable: () => void;
  undo: () => void;
  redo: () => void;
}

interface Props {
  editor: Editor | null | undefined;
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
  <div class="hidden gap-x-2 gap-y-1 md:grid">
    <div :class="sectionClass">
      <span :class="sectionLabelClass">{{ t('editor.toolbar.section.text') }}</span>
      <button type="button" :class="buttonClass(editor?.isActive('bold'))" @click="actions.toggleBold">{{ t('editor.toolbar.bold') }}</button>
      <button type="button" :class="buttonClass(editor?.isActive('italic'))" @click="actions.toggleItalic">{{ t('editor.toolbar.italic') }}</button>
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

    <div :class="sectionClass">
      <span :class="sectionLabelClass">{{ t('editor.toolbar.section.fontColor') }}</span>
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

    <div :class="sectionClass">
      <span :class="sectionLabelClass">{{ t('editor.toolbar.section.paragraph') }}</span>
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

    <div :class="sectionClass">
      <span :class="sectionLabelClass">{{ t('editor.toolbar.section.codeInsert') }}</span>
      <button type="button" :class="buttonClass(editor?.isActive('codeBlock'))" @click="actions.toggleCodeBlock">
        {{ t('editor.toolbar.codeBlock') }}
      </button>
      <select :value="codeLanguage" :class="selectClass" :aria-label="t('editor.toolbar.aria.codeLanguage')" @change="onCodeLanguageChange">
        <option v-for="option in codeLanguageOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <button type="button" :class="buttonClass(editor?.isActive('link'))" @click="actions.setLink">{{ t('editor.toolbar.link') }}</button>
      <button type="button" :class="buttonClass()" @click="actions.startMention">{{ t('editor.toolbar.mention') }}</button>
      <button type="button" :class="buttonClass()" @click="actions.openImagePicker">{{ t('editor.toolbar.image') }}</button>
      <button type="button" :class="buttonClass()" @click="actions.openVideoPicker">{{ t('editor.toolbar.video') }}</button>
      <button type="button" :class="buttonClass()" @click="actions.openYoutubeModal">{{ t('editor.toolbar.youtube') }}</button>
      <select :value="youtubeSize" :class="selectClass" :aria-label="t('editor.toolbar.aria.youtubeSize')" @change="onYoutubeSizeChange">
        <option v-for="option in youtubeSizeOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <button type="button" :class="buttonClass()" @click="actions.applyYoutubeSize">{{ t('editor.toolbar.youtubeSizeApply') }}</button>
      <button type="button" :class="buttonClass(editor?.isActive('table'))" @click="actions.insertTable">
        {{ t('editor.toolbar.insertTable') }}
      </button>
    </div>

    <div :class="sectionClass">
      <span :class="sectionLabelClass">{{ t('editor.toolbar.section.actions') }}</span>
      <button type="button" :class="buttonClass()" @click="actions.undo">{{ t('editor.toolbar.undo') }}</button>
      <button type="button" :class="buttonClass()" @click="actions.redo">{{ t('editor.toolbar.redo') }}</button>
    </div>
  </div>
</template>
