<script setup lang="ts">
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
      <span :class="sectionLabelClass">빠른 작업</span>
      <button type="button" :class="buttonClass(editor?.isActive('bold'))" @click="actions.toggleBold">굵게</button>
      <button type="button" :class="buttonClass(editor?.isActive('italic'))" @click="actions.toggleItalic">기울임</button>
      <button type="button" :class="buttonClass(editor?.isActive('link'))" @click="actions.setLink">링크</button>
      <button type="button" :class="buttonClass()" @click="actions.openImagePicker">이미지</button>
      <button type="button" :class="buttonClass(editor?.isActive('taskList'))" @click="actions.toggleTaskList">체크</button>
      <button type="button" :class="buttonClass()" @click="actions.undo">되돌리기</button>
      <button type="button" :class="buttonClass()" @click="actions.redo">다시</button>
      <button
        type="button"
        :class="buttonClass(isMobileMoreOpen, true)"
        aria-controls="mobile-editor-more"
        :aria-expanded="isMobileMoreOpen"
        @click="actions.toggleMobileMore"
      >
        {{ isMobileMoreOpen ? '더보기 닫기' : '더보기' }}
      </button>
    </div>

    <div
      v-if="isMobileMoreOpen"
      id="mobile-editor-more"
      class="bg-surface-soft dark:border-line/80 /60 space-y-1 rounded-2xl border border-line bg-white/75 p-2 shadow-sm"
    >
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          :class="buttonClass(mobileAccordionKey === 'text', true)"
          aria-controls="mobile-accordion-text"
          :aria-expanded="mobileAccordionKey === 'text'"
          @click="actions.toggleMobileAccordion('text')"
        >
          텍스트
        </button>
        <button
          type="button"
          :class="buttonClass(mobileAccordionKey === 'font', true)"
          aria-controls="mobile-accordion-font"
          :aria-expanded="mobileAccordionKey === 'font'"
          @click="actions.toggleMobileAccordion('font')"
        >
          폰트·색상
        </button>
        <button
          type="button"
          :class="buttonClass(mobileAccordionKey === 'structure', true)"
          aria-controls="mobile-accordion-structure"
          :aria-expanded="mobileAccordionKey === 'structure'"
          @click="actions.toggleMobileAccordion('structure')"
        >
          문단·목록
        </button>
        <button
          type="button"
          :class="buttonClass(mobileAccordionKey === 'insert', true)"
          aria-controls="mobile-accordion-insert"
          :aria-expanded="mobileAccordionKey === 'insert'"
          @click="actions.toggleMobileAccordion('insert')"
        >
          코드·삽입
        </button>
        <button
          type="button"
          :class="buttonClass(mobileAccordionKey === 'table', true)"
          aria-controls="mobile-accordion-table"
          :aria-expanded="mobileAccordionKey === 'table'"
          @click="actions.toggleMobileAccordion('table')"
        >
          테이블
        </button>
      </div>

      <div v-if="mobileAccordionKey === 'text'" id="mobile-accordion-text" :class="sectionClass">
        <button type="button" :class="buttonClass(editor?.isActive('underline'))" @click="actions.toggleUnderline">밑줄</button>
        <button type="button" :class="buttonClass(editor?.isActive('strike'))" @click="actions.toggleStrike">취소선</button>
        <button type="button" :class="buttonClass(editor?.isActive('code'))" @click="actions.toggleInlineCode">인라인코드</button>
        <button type="button" :class="buttonClass(editor?.isActive('subscript'))" @click="actions.toggleSubscript">아래첨자</button>
        <button type="button" :class="buttonClass(editor?.isActive('superscript'))" @click="actions.toggleSuperscript">위첨자</button>
      </div>

      <div
        v-if="mobileAccordionKey === 'font'"
        id="mobile-accordion-font"
        class="bg-surface-soft bg-surface-soft/80 dark:border-line/80 /60 space-y-2 rounded-2xl border border-line p-2"
      >
        <div class="flex flex-wrap items-center gap-2">
          <select :value="fontFamily" :class="selectClass" aria-label="폰트 패밀리" @change="onFontFamilyChange">
            <option v-for="option in fontFamilyOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <select :value="fontSize" :class="selectClass" aria-label="폰트 크기" @change="onFontSizeChange">
            <option v-for="option in fontSizeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <label class="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
            글자색
            <input :value="textColor" type="color" class="h-7 w-7 rounded border border-line p-0.5 dark:border-line" @input="onTextColorChange" />
          </label>
          <button type="button" :class="buttonClass()" @click="actions.applyTextColor">적용</button>
          <button type="button" :class="buttonClass()" @click="actions.clearTextColor">해제</button>
          <label class="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
            형광
            <input
              :value="highlightColor"
              type="color"
              class="h-7 w-7 rounded border border-line p-0.5 dark:border-line"
              @input="onHighlightColorChange"
            />
          </label>
          <button type="button" :class="buttonClass(editor?.isActive('highlight'))" @click="actions.applyHighlightColor">적용</button>
          <button type="button" :class="buttonClass()" @click="actions.clearHighlightColor">해제</button>
        </div>
      </div>

      <div v-if="mobileAccordionKey === 'structure'" id="mobile-accordion-structure" :class="sectionClass">
        <button type="button" :class="buttonClass(editor?.isActive('heading', { level: 1 }))" @click="actions.setHeading(1)">H1</button>
        <button type="button" :class="buttonClass(editor?.isActive('heading', { level: 2 }))" @click="actions.setHeading(2)">H2</button>
        <button type="button" :class="buttonClass(editor?.isActive('heading', { level: 3 }))" @click="actions.setHeading(3)">H3</button>
        <button type="button" :class="buttonClass(editor?.isActive('paragraph'))" @click="actions.setParagraph">문단</button>
        <button type="button" :class="buttonClass(editor?.isActive({ textAlign: 'left' }))" @click="actions.setTextAlign('left')">좌측</button>
        <button type="button" :class="buttonClass(editor?.isActive({ textAlign: 'center' }))" @click="actions.setTextAlign('center')">중앙</button>
        <button type="button" :class="buttonClass(editor?.isActive({ textAlign: 'right' }))" @click="actions.setTextAlign('right')">우측</button>
        <button type="button" :class="buttonClass(editor?.isActive({ textAlign: 'justify' }))" @click="actions.setTextAlign('justify')">양쪽</button>
        <button type="button" :class="buttonClass(editor?.isActive('bulletList'))" @click="actions.toggleBulletList">글머리</button>
        <button type="button" :class="buttonClass(editor?.isActive('orderedList'))" @click="actions.toggleOrderedList">번호</button>
        <button type="button" :class="buttonClass(editor?.isActive('taskList'))" @click="actions.toggleTaskList">체크리스트</button>
        <button type="button" :class="buttonClass(editor?.isActive('blockquote'))" @click="actions.toggleBlockquote">인용</button>
        <button type="button" :class="buttonClass()" @click="actions.setHorizontalRule">구분선</button>
      </div>

      <div
        v-if="mobileAccordionKey === 'insert'"
        id="mobile-accordion-insert"
        class="bg-surface-soft bg-surface-soft/80 dark:border-line/80 /60 space-y-2 rounded-2xl border border-line p-2"
      >
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" :class="buttonClass(editor?.isActive('codeBlock'))" @click="actions.toggleCodeBlock">코드블록</button>
          <select :value="codeLanguage" :class="selectClass" aria-label="코드 언어" @change="onCodeLanguageChange">
            <option v-for="option in codeLanguageOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <button type="button" :class="buttonClass()" @click="actions.startMention">멘션</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" :class="buttonClass()" @click="actions.openImagePicker">이미지</button>
          <button type="button" :class="buttonClass()" @click="actions.openVideoPicker">영상</button>
          <button type="button" :class="buttonClass()" @click="actions.openYoutubeModal">유튜브</button>
          <select :value="youtubeSize" :class="selectClass" aria-label="유튜브 크기" @change="onYoutubeSizeChange">
            <option v-for="option in youtubeSizeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <button type="button" :class="buttonClass()" @click="actions.applyYoutubeSize">크기 적용</button>
        </div>
      </div>

      <div
        v-if="mobileAccordionKey === 'table'"
        id="mobile-accordion-table"
        class="bg-surface-soft bg-surface-soft/80 dark:border-line/80 /60 space-y-2 rounded-2xl border border-line p-2"
      >
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" :class="buttonClass(editor?.isActive('table'))" @click="actions.insertTable">테이블 삽입</button>
        </div>
        <div v-if="isTableSelected" class="flex flex-wrap items-center gap-2">
          <button type="button" :class="buttonClass()" @click="actions.addRowBefore">행+앞</button>
          <button type="button" :class="buttonClass()" @click="actions.addRowAfter">행+뒤</button>
          <button type="button" :class="buttonClass()" @click="actions.deleteRow">행삭제</button>
          <button type="button" :class="buttonClass()" @click="actions.addColumnBefore">열+앞</button>
          <button type="button" :class="buttonClass()" @click="actions.addColumnAfter">열+뒤</button>
          <button type="button" :class="buttonClass()" @click="actions.deleteColumn">열삭제</button>
          <button type="button" :class="buttonClass()" @click="actions.mergeCells">셀병합</button>
          <button type="button" :class="buttonClass()" @click="actions.splitCell">셀분할</button>
          <button type="button" :class="buttonClass()" @click="actions.toggleHeaderRow">헤더행</button>
          <button type="button" :class="buttonClass()" @click="actions.toggleHeaderColumn">헤더열</button>
          <button type="button" :class="buttonClass()" @click="actions.toggleHeaderCell">헤더셀</button>
          <button type="button" :class="buttonClass()" @click="actions.deleteTable">표삭제</button>
        </div>
        <p v-else class="text-[11px] font-semibold text-muted">테이블 안에 커서를 두면 편집 버튼이 활성화됩니다.</p>
      </div>
    </div>
  </div>
</template>
