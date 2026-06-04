import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ConfirmModal from './ConfirmModal.vue';

describe('shared/ui/ConfirmModal', () => {
  it('확인과 취소 버튼 클릭을 각각 이벤트로 전달한다', async () => {
    // given
    const wrapper = mount(ConfirmModal, {
      props: {
        open: true,
        title: '삭제 확인',
        description: '정말 삭제할까요?',
      },
    });
    const buttons = wrapper.findAll('button');

    // when
    await buttons[0]?.trigger('click');
    await buttons[1]?.trigger('click');

    // then
    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.emitted('confirm')).toHaveLength(1);
    expect(wrapper.text()).toContain('삭제 확인');
    expect(wrapper.text()).toContain('정말 삭제할까요?');
  });

  it('danger 변형과 disabled 상태를 버튼에 반영한다', () => {
    // given
    const wrapper = mount(ConfirmModal, {
      props: {
        open: true,
        title: '위험 작업',
        confirmVariant: 'danger',
        confirmDisabled: true,
        cancelDisabled: true,
      },
    });
    const buttons = wrapper.findAll('button');

    // when
    const cancelButton = buttons[0];
    const confirmButton = buttons[1];

    // then
    expect(cancelButton?.attributes('disabled')).toBeDefined();
    expect(confirmButton?.attributes('disabled')).toBeDefined();
    expect(confirmButton?.classes()).toContain('ui-button-danger');
  });
});
