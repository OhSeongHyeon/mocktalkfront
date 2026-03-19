import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it } from 'vitest';

import type { ContentWidthPreset } from '../../stores/layout';
import { useLayoutStore } from '../../stores/layout';
import PageContainer from './PageContainer.vue';

describe('shared/ui/PageContainer', () => {
  it.each([
    ['default', 'max-w-6xl'],
    ['comfortable', 'max-w-7xl'],
    ['wide', 'max-w-screen-2xl'],
    ['full', 'max-w-none'],
  ] as const)('auto 폭은 저장된 %s 프리셋을 반영한다', (preset, expectedClass) => {
    // given
    setActivePinia(createPinia());
    const layoutStore = useLayoutStore();
    layoutStore.setContentWidthPreset(preset as ContentWidthPreset);

    // when
    const wrapper = mount(PageContainer, {
      props: {
        width: 'auto',
      },
      slots: {
        default: '<div>content</div>',
      },
    });

    // then
    expect(wrapper.classes()).toContain(expectedClass);
  });

  it('명시적 width 속성은 저장된 프리셋보다 우선한다', () => {
    // given
    setActivePinia(createPinia());
    const layoutStore = useLayoutStore();
    layoutStore.setContentWidthPreset('wide');

    // when
    const wrapper = mount(PageContainer, {
      props: {
        width: 'narrow',
      },
      slots: {
        default: '<div>content</div>',
      },
    });

    // then
    expect(wrapper.classes()).toContain('max-w-4xl');
    expect(wrapper.classes()).not.toContain('max-w-screen-2xl');
  });
});
