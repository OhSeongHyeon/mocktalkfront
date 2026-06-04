import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { i18n } from '../../../test/plugins';
import type { MentionItem } from '../lib/mentionTypes';
import MentionList from './MentionList.vue';

const MENTION_ITEMS: MentionItem[] = [
  {
    id: '1',
    label: 'tester-one',
    handle: 'tester-one',
    displayName: '테스터 원',
    profileImageUrl: null,
  },
  {
    id: '2',
    label: 'tester-two',
    handle: 'tester-two',
    displayName: '테스터 투',
    profileImageUrl: null,
  },
];

describe('features/editor/ui/MentionList', () => {
  it('화살표 이동 후 Enter 입력 시 선택된 멘션을 command로 전달한다', () => {
    // given
    const onCommand = vi.fn();
    const wrapper = mount(MentionList, {
      props: {
        items: MENTION_ITEMS,
        command: onCommand,
      },
      global: { plugins: [i18n] },
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
    expect(onCommand).toHaveBeenCalledWith(MENTION_ITEMS[1]);
  });

  it('항목이 없으면 키 입력을 처리하지 않는다', () => {
    // given
    const wrapper = mount(MentionList, {
      props: {
        items: [],
        command: vi.fn(),
      },
      global: { plugins: [i18n] },
    });
    const exposed = wrapper.vm as unknown as { onKeyDown: (event: KeyboardEvent) => boolean };

    // when
    const handled = exposed.onKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));

    // then
    expect(handled).toBe(false);
  });
});
