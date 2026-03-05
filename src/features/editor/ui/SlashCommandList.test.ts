import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { SlashCommandItem } from '../lib/slashTypes';
import SlashCommandList from './SlashCommandList.vue';

const createEditorStub = () =>
  ({
    chain: () => ({
      focus: () => ({
        run: () => true,
      }),
    }),
  }) as never;

const SLASH_ITEMS: SlashCommandItem[] = [
  {
    id: 'paragraph',
    title: '문단',
    description: '기본 문단으로 전환',
    keywords: ['paragraph'],
    command: vi.fn(),
  },
  {
    id: 'heading1',
    title: '제목 1',
    description: 'H1 제목으로 전환',
    keywords: ['heading'],
    command: vi.fn(),
  },
];

describe('features/editor/ui/SlashCommandList', () => {
  it('ArrowDown 후 Enter 입력 시 현재 선택 슬래시 명령을 command로 전달한다', () => {
    // given
    const onCommand = vi.fn((item: SlashCommandItem) => item.command(createEditorStub()));
    const wrapper = mount(SlashCommandList, {
      props: {
        items: SLASH_ITEMS,
        command: onCommand,
      },
    });
    const exposed = wrapper.vm as unknown as { onKeyDown: (event: KeyboardEvent) => boolean };

    // when
    const moved = exposed.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    const entered = exposed.onKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));

    // then
    expect(wrapper.findAll('button')).toHaveLength(2);
    expect(moved).toBe(true);
    expect(entered).toBe(true);
    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith(SLASH_ITEMS[1]);
  });

  it('항목이 없으면 키 입력 이벤트를 소비하지 않는다', () => {
    // given
    const wrapper = mount(SlashCommandList, {
      props: {
        items: [],
        command: vi.fn(),
      },
    });
    const exposed = wrapper.vm as unknown as { onKeyDown: (event: KeyboardEvent) => boolean };

    // when
    const handled = exposed.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

    // then
    expect(handled).toBe(false);
  });
});
