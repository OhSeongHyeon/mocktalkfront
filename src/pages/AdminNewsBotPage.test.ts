import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const newsBotApiMocks = vi.hoisted(() => ({
  getAdminNewsBotJobs: vi.fn(),
  createAdminNewsBotJob: vi.fn(),
  updateAdminNewsBotJob: vi.fn(),
  changeAdminNewsBotJobEnabled: vi.fn(),
  runAdminNewsBotJobNow: vi.fn(),
}));

vi.mock('../features/admin/system', () => ({
  getAdminNewsBotJobs: newsBotApiMocks.getAdminNewsBotJobs,
  createAdminNewsBotJob: newsBotApiMocks.createAdminNewsBotJob,
  updateAdminNewsBotJob: newsBotApiMocks.updateAdminNewsBotJob,
  changeAdminNewsBotJobEnabled: newsBotApiMocks.changeAdminNewsBotJobEnabled,
  runAdminNewsBotJobNow: newsBotApiMocks.runAdminNewsBotJobNow,
}));

import AdminNewsBotPage from './AdminNewsBotPage.vue';

const mountPage = async () => {
  const wrapper = mount(AdminNewsBotPage, {
    global: {
      stubs: {
        RouterLink: {
          template: '<a><slot /></a>',
        },
        AppShell: {
          template: '<div><slot /></div>',
        },
        PageContainer: {
          template: '<div><slot /></div>',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('pages/AdminNewsBotPage', () => {
  beforeEach(() => {
    newsBotApiMocks.getAdminNewsBotJobs.mockReset();
    newsBotApiMocks.createAdminNewsBotJob.mockReset();
    newsBotApiMocks.updateAdminNewsBotJob.mockReset();
    newsBotApiMocks.changeAdminNewsBotJobEnabled.mockReset();
    newsBotApiMocks.runAdminNewsBotJobNow.mockReset();
    newsBotApiMocks.getAdminNewsBotJobs.mockResolvedValue([]);
  });

  it('DEV 소스는 기본으로 태그 기준 입력만 보여준다', async () => {
    // given
    const wrapper = await mountPage();

    // when
    const tagInput = wrapper.find('input[name="devTag"]');
    const usernameInput = wrapper.find('input[name="devUsername"]');

    // then
    expect(tagInput.exists()).toBe(true);
    expect(usernameInput.exists()).toBe(false);
  });

  it('DEV 수집 기준을 작성자 기준으로 바꾸면 username 입력만 노출한다', async () => {
    // given
    const wrapper = await mountPage();

    // when
    await wrapper.find('input[name="devSourceMode"][value="USERNAME"]').setValue();

    // then
    expect(wrapper.find('input[name="devTag"]').exists()).toBe(false);
    expect(wrapper.find('input[name="devUsername"]').exists()).toBe(true);
  });

  it('게시판 자동 생성이 꺼져 있으면 게시판 이름 입력을 숨긴다', async () => {
    // given
    const wrapper = await mountPage();

    // when
    const hiddenBefore = wrapper.find('input[name="targetBoardName"]');
    await wrapper.find('input[name="autoCreateBoard"]').setValue(true);
    const visibleAfter = wrapper.find('input[name="targetBoardName"]');

    // then
    expect(hiddenBefore.exists()).toBe(false);
    expect(visibleAfter.exists()).toBe(true);
  });

  it('외부 소스를 GitHub Releases로 바꾸면 권장 실행 정책을 적용한다', async () => {
    // given
    const wrapper = await mountPage();

    // when
    await wrapper.find('select[name="sourceType"]').setValue('GITHUB_RELEASES');

    const intervalInput = wrapper.find('input[name="collectIntervalMinutes"]').element as HTMLInputElement;
    const fetchLimitInput = wrapper.find('input[name="fetchLimit"]').element as HTMLInputElement;

    // then
    expect(wrapper.find('input[name="githubOwner"]').exists()).toBe(true);
    expect(wrapper.find('input[name="githubRepo"]').exists()).toBe(true);
    expect(intervalInput.value).toBe('720');
    expect(fetchLimitInput.value).toBe('1');
  });

  it('고급 실행 설정을 열면 timezone 입력을 노출한다', async () => {
    // given
    const wrapper = await mountPage();

    // when
    expect(wrapper.find('input[name="timezone"]').exists()).toBe(false);
    await wrapper.find('[data-testid="news-bot-advanced-toggle"]').trigger('click');

    // then
    expect(wrapper.find('input[name="timezone"]').exists()).toBe(true);
  });
});
