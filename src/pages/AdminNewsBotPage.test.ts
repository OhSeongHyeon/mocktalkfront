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

import { i18n } from '../test/plugins';
import AdminNewsBotPage from './AdminNewsBotPage.vue';

const mountPage = async () => {
  const wrapper = mount(AdminNewsBotPage, {
    global: {
      plugins: [i18n],
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

  it('필수 입력 없이 저장하면 공통 필드와 소스 필드를 하이라이트한다', async () => {
    // given
    const wrapper = await mountPage();

    // when
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    // then
    expect(newsBotApiMocks.createAdminNewsBotJob).not.toHaveBeenCalled();
    expect(wrapper.find('input[name="jobName"]').attributes('data-invalid')).toBe('true');
    expect(wrapper.find('input[name="targetBoardSlug"]').attributes('data-invalid')).toBe('true');
    expect(wrapper.find('input[name="devTag"]').attributes('data-invalid')).toBe('true');
    expect(wrapper.text()).toContain('잡 이름을 입력해주세요.');
  });

  it('GitHub Releases 필수 입력이 비면 owner와 repo를 함께 하이라이트한다', async () => {
    // given
    const wrapper = await mountPage();
    await wrapper.find('input[name="jobName"]').setValue('스프링부트 릴리즈');
    await wrapper.find('input[name="targetBoardSlug"]').setValue('spring-news');
    await wrapper.find('select[name="sourceType"]').setValue('GITHUB_RELEASES');

    // when
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    // then
    expect(newsBotApiMocks.createAdminNewsBotJob).not.toHaveBeenCalled();
    expect(wrapper.find('input[name="githubOwner"]').attributes('data-invalid')).toBe('true');
    expect(wrapper.find('input[name="githubRepo"]').attributes('data-invalid')).toBe('true');
  });

  it('게시판 자동 생성이 켜진 상태에서 이름이 비면 게시판 이름 필드를 하이라이트한다', async () => {
    // given
    const wrapper = await mountPage();
    await wrapper.find('input[name="jobName"]').setValue('스프링 공식 블로그');
    await wrapper.find('input[name="targetBoardSlug"]').setValue('spring-news');
    await wrapper.find('input[name="autoCreateBoard"]').setValue(true);
    await wrapper.find('input[name="devTag"]').setValue('spring');

    // when
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    // then
    expect(newsBotApiMocks.createAdminNewsBotJob).not.toHaveBeenCalled();
    expect(wrapper.find('input[name="targetBoardName"]').attributes('data-invalid')).toBe('true');
  });
});
