import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { i18n } from '../../test/plugins';
import ReportModerationWorkspace from './ReportModerationWorkspace.vue';

const createProps = () => ({
  reports: [
    {
      id: 41,
      status: 'PENDING' as const,
      targetType: 'ARTICLE',
      targetId: 91,
      reasonCode: 'SPAM',
      reporterUserId: 7,
      processedAt: null,
      createdAt: '2026-03-19T10:00:00.000Z',
    },
  ],
  selectedId: 41,
  selectedReport: {
    id: 41,
    status: 'PENDING' as const,
    targetType: 'ARTICLE',
    targetId: 91,
    reasonCode: 'SPAM',
    reporterUserId: 7,
    targetUserId: 18,
    processedAt: null,
    processedNote: null,
    reasonDetail: '도배 신고',
    targetSnapshot: '{"title":"spam"}',
    createdAt: '2026-03-19T10:00:00.000Z',
  },
  detailCards: [
    {
      eyebrow: 'Target',
      title: 'ARTICLE · 91',
      description: '게시판 12',
    },
  ],
  detailRows: [
    { label: '신고 번호', value: '#41' },
    { label: '대상', value: 'ARTICLE · 91' },
  ],
  listDescription: '신고 목록 설명',
  page: 0,
  totalPages: 2,
  processStatus: 'PENDING' as const,
  processNote: '',
});

describe('widgets/admin/ReportModerationWorkspace', () => {
  it('목록 선택과 페이지 이동, 처리 저장을 이벤트로 전달한다', async () => {
    // given
    const wrapper = mount(ReportModerationWorkspace, {
      props: createProps(),
      global: { plugins: [i18n] },
    });

    // when
    await wrapper.get('[data-testid="report-row-41"]').trigger('click');
    await wrapper.get('[data-testid="report-next"]').trigger('click');
    await wrapper.get('[data-testid="report-process"]').trigger('click');

    // then
    expect(wrapper.emitted('select-report')?.[0]).toEqual([41]);
    expect(wrapper.emitted('move-page')?.[0]).toEqual([1]);
    expect(wrapper.emitted('process')).toHaveLength(1);
  });

  it('처리 상태와 메모 변경을 상위로 전달한다', async () => {
    // given
    const wrapper = mount(ReportModerationWorkspace, {
      props: createProps(),
      global: { plugins: [i18n] },
    });

    // when
    await wrapper.get('select').setValue('RESOLVED');
    await wrapper.get('textarea').setValue('조치 완료');

    // then
    expect(wrapper.emitted('update:processStatus')?.[0]).toEqual(['RESOLVED']);
    expect(wrapper.emitted('update:processNote')?.[0]).toEqual(['조치 완료']);
  });
});
