import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SectionHeader from './SectionHeader.vue';

describe('shared/ui/SectionHeader', () => {
  it('renders eyebrow, title, and description', () => {
    const wrapper = mount(SectionHeader, {
      props: {
        eyebrow: 'Contents',
        title: '콘텐츠',
        description: '설명 텍스트',
      },
    });

    expect(wrapper.text()).toContain('Contents');
    expect(wrapper.text()).toContain('콘텐츠');
    expect(wrapper.text()).toContain('설명 텍스트');
    expect(wrapper.find('.ui-eyebrow').exists()).toBe(true);
  });
});
