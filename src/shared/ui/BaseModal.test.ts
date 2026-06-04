import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { i18n } from '../../test/plugins';
import BaseModal from './BaseModal.vue';

describe('shared/ui/BaseModal', () => {
  it('백드롭 클릭과 ESC 입력으로 close 이벤트를 발생시킨다', async () => {
    // given
    const wrapper = mount(BaseModal, {
      props: {
        open: true,
      },
      slots: {
        default: '<p>내용</p>',
      },
      global: {
        plugins: [i18n],
      },
    });

    // when
    await wrapper.get('.absolute.inset-0').trigger('click');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    // then
    expect(wrapper.emitted('close')).toHaveLength(2);
  });

  it('닫기 옵션이 꺼져 있으면 백드롭과 ESC로 닫히지 않는다', async () => {
    // given
    const wrapper = mount(BaseModal, {
      props: {
        open: true,
        closeOnBackdrop: false,
        closeOnEsc: false,
      },
      slots: {
        default: '<p>내용</p>',
      },
      global: {
        plugins: [i18n],
      },
    });

    // when
    await wrapper.get('.absolute.inset-0').trigger('click');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    // then
    expect(wrapper.emitted('close')).toBeUndefined();
  });
});
