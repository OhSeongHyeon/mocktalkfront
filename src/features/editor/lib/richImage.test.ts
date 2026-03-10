import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

import { RichImage } from './richImage';

describe('RichImage', () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it('이미지 크기와 정렬 속성을 HTML로 직렬화한다', () => {
    editor = new Editor({
      extensions: [StarterKit, RichImage],
      content: '',
    });

    editor.commands.insertContent({
      type: 'image',
      attrs: {
        src: '/uploads/editor/sample.png',
        alt: 'sample',
        align: 'right',
        width: '640px',
        height: '360px',
        originalWidth: 1280,
        originalHeight: 720,
        caption: '샘플 이미지',
      },
    });

    const html = editor.getHTML();

    expect(html).toContain('data-type="editor-image"');
    expect(html).toContain('data-align="right"');
    expect(html).toContain('data-original-width="1280"');
    expect(html).toContain('data-original-height="720"');
    expect(html).toContain('data-width="640px"');
    expect(html).toContain('data-height="360px"');
    expect(html).toContain('width="640"');
    expect(html).toContain('height="360"');
    expect(html).toContain('editor-image-node-right');
    expect(html).toContain('<figcaption>샘플 이미지</figcaption>');
  });

  it('이미지 속성 변경 후에도 크기 정보가 유지된다', () => {
    editor = new Editor({
      extensions: [StarterKit, RichImage],
      content: '',
    });

    editor.commands.insertContent({
      type: 'image',
      attrs: {
        src: '/uploads/editor/sample.png',
        align: 'left',
        width: '640px',
        height: '360px',
        originalWidth: 1280,
        originalHeight: 720,
      },
    });

    editor.commands.setNodeSelection(0);
    editor.commands.updateAttributes('image', {
      align: 'center',
      width: '320px',
      height: '180px',
      originalWidth: 1280,
      originalHeight: 720,
    });

    const html = editor.getHTML();

    expect(html).toContain('data-align="center"');
    expect(html).toContain('data-width="320px"');
    expect(html).toContain('data-height="180px"');
    expect(html).toContain('width="320"');
    expect(html).toContain('height="180"');
    expect(html).toContain('editor-image-node-center');
  });
});
