import { Extension } from '@tiptap/core';
import { VueRenderer } from '@tiptap/vue-3';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';

import SlashCommandList from '../../components/SlashCommandList.vue';
import type { SlashCommandContext, SlashCommandItem } from './slashTypes';

const createSlashCommandItems = (context: SlashCommandContext): SlashCommandItem[] => [
  {
    id: 'paragraph',
    title: '문단',
    description: '기본 문단으로 전환',
    keywords: ['paragraph', 'p', '문단'],
    command: (editor) => {
      editor.chain().focus().setParagraph().run();
    },
  },
  {
    id: 'heading1',
    title: '제목 1',
    description: 'H1 제목으로 전환',
    keywords: ['h1', 'heading', '제목'],
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    id: 'heading2',
    title: '제목 2',
    description: 'H2 제목으로 전환',
    keywords: ['h2', 'heading', '제목'],
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    id: 'heading3',
    title: '제목 3',
    description: 'H3 제목으로 전환',
    keywords: ['h3', 'heading', '제목'],
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    id: 'bullet-list',
    title: '글머리 목록',
    description: '불릿 목록 토글',
    keywords: ['list', 'bullet', '목록'],
    command: (editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    id: 'ordered-list',
    title: '번호 목록',
    description: '순서 목록 토글',
    keywords: ['list', 'ordered', '번호'],
    command: (editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    id: 'task-list',
    title: '체크리스트',
    description: '할 일 목록 토글',
    keywords: ['task', 'checklist', 'todo', '체크', '할일'],
    command: (editor) => {
      editor.chain().focus().toggleTaskList().run();
    },
  },
  {
    id: 'blockquote',
    title: '인용문',
    description: '인용 블록 토글',
    keywords: ['quote', 'blockquote', '인용'],
    command: (editor) => {
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    id: 'code-block',
    title: '코드 블록',
    description: '코드 블록 토글',
    keywords: ['code', '코드'],
    command: (editor) => {
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    id: 'table',
    title: '테이블',
    description: '3x3 표 삽입',
    keywords: ['table', '표'],
    command: (editor) => {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    id: 'hr',
    title: '구분선',
    description: '수평선 삽입',
    keywords: ['divider', 'hr', '구분선'],
    command: (editor) => {
      editor.chain().focus().setHorizontalRule().run();
    },
  },
  {
    id: 'image',
    title: '이미지 업로드',
    description: '파일 선택 창 열기',
    keywords: ['image', 'photo', '이미지'],
    command: () => {
      context.openImagePicker();
    },
  },
  {
    id: 'video',
    title: '영상 업로드',
    description: '동영상 파일 선택 창 열기',
    keywords: ['video', '영상'],
    command: () => {
      context.openVideoPicker();
    },
  },
  {
    id: 'youtube',
    title: '유튜브 임베드',
    description: '유튜브 링크 입력 모달 열기',
    keywords: ['youtube', '유튜브', 'embed'],
    command: () => {
      context.openYoutubeModal();
    },
  },
];

const createSlashSuggestionOptions = (items: SlashCommandItem[]): Omit<SuggestionOptions<SlashCommandItem>, 'editor'> => ({
  char: '/',
  allowSpaces: true,
  startOfLine: true,
  items: ({ query }) => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return items.slice(0, 8);
    }
    return items
      .filter((item) => {
        const haystacks = [item.title, item.description, ...item.keywords];
        return haystacks.some((value) => value.toLowerCase().includes(keyword));
      })
      .slice(0, 8);
  },
  command: ({ editor, range, props }) => {
    editor.chain().focus().deleteRange(range).run();
    props.command(editor);
  },
  render: () => {
    let component: VueRenderer | null = null;
    let popup: HTMLDivElement | null = null;

    const updatePosition = (clientRect?: (() => DOMRect | null) | null) => {
      if (!popup || !clientRect) {
        return;
      }
      const rect = clientRect();
      if (!rect) {
        return;
      }
      popup.style.left = `${rect.left + window.scrollX}px`;
      popup.style.top = `${rect.bottom + window.scrollY + 6}px`;
    };

    return {
      onStart: (props) => {
        component = new VueRenderer(SlashCommandList, {
          props,
          editor: props.editor,
        });
        popup = document.createElement('div');
        popup.style.position = 'absolute';
        popup.style.zIndex = '9999';
        if (component.element) {
          popup.appendChild(component.element);
        }
        document.body.appendChild(popup);
        updatePosition(props.clientRect);
      },
      onUpdate: (props) => {
        component?.updateProps(props);
        updatePosition(props.clientRect);
      },
      onKeyDown: (props) => {
        if (component?.ref?.onKeyDown) {
          return component.ref.onKeyDown(props.event);
        }
        return false;
      },
      onExit: () => {
        popup?.remove();
        component?.destroy();
      },
    };
  },
});

const createSlashCommandExtension = (items: SlashCommandItem[]) =>
  Extension.create({
    name: 'slashCommand',
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...createSlashSuggestionOptions(items),
        }),
      ];
    },
  });

export { createSlashCommandExtension, createSlashCommandItems };
