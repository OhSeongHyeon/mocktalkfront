import { Extension } from '@tiptap/core';
import { VueRenderer } from '@tiptap/vue-3';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';

import { translate } from '../../../shared/i18n/translate';
import SlashCommandList from '../ui/SlashCommandList.vue';
import type { SlashCommandContext, SlashCommandItem } from './slashTypes';

const createSlashCommandItems = (context: SlashCommandContext): SlashCommandItem[] => [
  {
    id: 'paragraph',
    title: translate('editor.slash.commands.paragraph.title'),
    description: translate('editor.slash.commands.paragraph.description'),
    keywords: ['paragraph', 'p', '문단'],
    command: (editor) => {
      editor.chain().focus().setParagraph().run();
    },
  },
  {
    id: 'heading1',
    title: translate('editor.slash.commands.heading1.title'),
    description: translate('editor.slash.commands.heading1.description'),
    keywords: ['h1', 'heading', '제목'],
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    id: 'heading2',
    title: translate('editor.slash.commands.heading2.title'),
    description: translate('editor.slash.commands.heading2.description'),
    keywords: ['h2', 'heading', '제목'],
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    id: 'heading3',
    title: translate('editor.slash.commands.heading3.title'),
    description: translate('editor.slash.commands.heading3.description'),
    keywords: ['h3', 'heading', '제목'],
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    id: 'bullet-list',
    title: translate('editor.slash.commands.bulletList.title'),
    description: translate('editor.slash.commands.bulletList.description'),
    keywords: ['list', 'bullet', '목록'],
    command: (editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    id: 'ordered-list',
    title: translate('editor.slash.commands.orderedList.title'),
    description: translate('editor.slash.commands.orderedList.description'),
    keywords: ['list', 'ordered', '번호'],
    command: (editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    id: 'task-list',
    title: translate('editor.slash.commands.taskList.title'),
    description: translate('editor.slash.commands.taskList.description'),
    keywords: ['task', 'checklist', 'todo', '체크', '할일'],
    command: (editor) => {
      editor.chain().focus().toggleTaskList().run();
    },
  },
  {
    id: 'blockquote',
    title: translate('editor.slash.commands.blockquote.title'),
    description: translate('editor.slash.commands.blockquote.description'),
    keywords: ['quote', 'blockquote', '인용'],
    command: (editor) => {
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    id: 'code-block',
    title: translate('editor.slash.commands.codeBlock.title'),
    description: translate('editor.slash.commands.codeBlock.description'),
    keywords: ['code', '코드'],
    command: (editor) => {
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    id: 'table',
    title: translate('editor.slash.commands.table.title'),
    description: translate('editor.slash.commands.table.description'),
    keywords: ['table', '표'],
    command: (editor) => {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    id: 'hr',
    title: translate('editor.slash.commands.hr.title'),
    description: translate('editor.slash.commands.hr.description'),
    keywords: ['divider', 'hr', '구분선'],
    command: (editor) => {
      editor.chain().focus().setHorizontalRule().run();
    },
  },
  {
    id: 'image',
    title: translate('editor.slash.commands.image.title'),
    description: translate('editor.slash.commands.image.description'),
    keywords: ['image', 'photo', '이미지'],
    command: () => {
      context.openImagePicker();
    },
  },
  {
    id: 'video',
    title: translate('editor.slash.commands.video.title'),
    description: translate('editor.slash.commands.video.description'),
    keywords: ['video', '영상'],
    command: () => {
      context.openVideoPicker();
    },
  },
  {
    id: 'youtube',
    title: translate('editor.slash.commands.youtube.title'),
    description: translate('editor.slash.commands.youtube.description'),
    keywords: ['youtube', '유튜브', 'embed'],
    command: () => {
      context.openYoutubeModal();
    },
  },
];

const createSlashSuggestionOptions = (context: SlashCommandContext): Omit<SuggestionOptions<SlashCommandItem>, 'editor'> => ({
  char: '/',
  allowSpaces: true,
  startOfLine: true,
  items: ({ query }) => {
    const items = createSlashCommandItems(context);
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

const createSlashCommandExtension = (context: SlashCommandContext) =>
  Extension.create({
    name: 'slashCommand',
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...createSlashSuggestionOptions(context),
        }),
      ];
    },
  });

export { createSlashCommandExtension, createSlashCommandItems };
