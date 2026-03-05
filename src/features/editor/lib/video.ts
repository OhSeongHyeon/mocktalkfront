import { Node, mergeAttributes } from '@tiptap/core';
import type { CommandProps } from '@tiptap/core';

interface VideoOptions {
  HTMLAttributes: Record<string, string>;
}

type VideoAttributes = {
  src?: string | null;
  controls?: boolean;
  poster?: string | null;
  width?: number | string | null;
  height?: number | string | null;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (attributes: VideoAttributes) => ReturnType;
    };
  }
}

const Video = Node.create<VideoOptions>({
  name: 'video',
  group: 'block',
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      controls: {
        default: true,
      },
      poster: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'video' }];
  },

  renderHTML({ HTMLAttributes }) {
    const attributes = {
      ...HTMLAttributes,
      controls: HTMLAttributes.controls === false ? null : 'controls',
    };
    return ['video', mergeAttributes(this.options.HTMLAttributes, attributes)];
  },

  addCommands() {
    return {
      setVideo:
        (attributes: VideoAttributes) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({
            type: this.name,
            attrs: attributes,
          }),
    };
  },
});

export { Video };
