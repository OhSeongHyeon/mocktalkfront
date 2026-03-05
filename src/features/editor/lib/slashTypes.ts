import type { Editor } from '@tiptap/core';

type SlashCommandItem = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  command: (editor: Editor) => void;
};

type SlashCommandContext = {
  openImagePicker: () => void;
  openVideoPicker: () => void;
  openYoutubeModal: () => void;
};

export type { SlashCommandContext, SlashCommandItem };
