<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import type {
  AdminNewsBotJobResponse,
  AdminNewsBotJobRunResponse,
  AdminNewsBotJobUpsertRequest,
  NewsJobExecutionStatus,
  NewsSourceType,
} from '../features/admin/system';
import {
  changeAdminNewsBotJobEnabled,
  createAdminNewsBotJob,
  getAdminNewsBotJobs,
  runAdminNewsBotJobNow,
  updateAdminNewsBotJob,
} from '../features/admin/system';
import { ApiError } from '../shared/lib/http/api';
import PageContainer from '../shared/ui/PageContainer.vue';
import AppShell from '../widgets/layout/AppShell.vue';

type HackerNewsStoryType = 'topstories' | 'newstories' | 'beststories';
type DevSourceMode = 'TAG' | 'USERNAME';

type NewsBotFormState = {
  jobName: string;
  sourceType: NewsSourceType;
  hackerNewsStoryType: HackerNewsStoryType;
  devSourceMode: DevSourceMode;
  devTag: string;
  devUsername: string;
  githubOwner: string;
  githubRepo: string;
  rssFeedUrl: string;
  targetBoardSlug: string;
  targetBoardName: string;
  targetCategoryName: string;
  collectIntervalMinutes: number;
  fetchLimit: number;
  autoCreateBoard: boolean;
  autoCreateCategory: boolean;
  timezone: string;
};

type RequiredFieldName = 'jobName' | 'devTag' | 'devUsername' | 'githubOwner' | 'githubRepo' | 'rssFeedUrl' | 'targetBoardSlug' | 'targetBoardName';

type SourceExecutionPolicy = {
  defaultInterval: number;
  defaultFetchLimit: number;
  intervalOptions: number[];
  fetchLimitOptions: number[];
  summary: string;
};

const DEFAULT_TIMEZONE = 'Asia/Seoul';
const SOURCE_EXECUTION_POLICIES: Record<NewsSourceType, SourceExecutionPolicy> = {
  DEV_TO: {
    defaultInterval: 180,
    defaultFetchLimit: 10,
    intervalOptions: [60, 180, 360],
    fetchLimitOptions: [5, 10, 20],
    summary: '운영 초반에는 3시간마다 10건 이하로 시작하는 편이 안전합니다.',
  },
  HACKER_NEWS: {
    defaultInterval: 180,
    defaultFetchLimit: 10,
    intervalOptions: [60, 180, 360],
    fetchLimitOptions: [5, 10, 20],
    summary: '커뮤니티형 소스라 너무 짧은 주기와 큰 건수는 노이즈를 늘릴 수 있습니다.',
  },
  GITHUB_RELEASES: {
    defaultInterval: 720,
    defaultFetchLimit: 1,
    intervalOptions: [360, 720, 1440],
    fetchLimitOptions: [1, 3, 5],
    summary: '릴리즈성 소스라 12시간 이상 주기와 1건 수집부터 시작하는 편이 무난합니다.',
  },
  RSS: {
    defaultInterval: 360,
    defaultFetchLimit: 8,
    intervalOptions: [180, 360, 720],
    fetchLimitOptions: [5, 8, 10],
    summary: '공식 피드라면 6시간마다 8건 내외로 시작하면 안정적입니다.',
  },
};

const jobs = ref<AdminNewsBotJobResponse[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const runningJobId = ref<number | null>(null);
const selectedJobId = ref<number | null>(null);
const listError = ref('');
const actionErrorMessage = ref('');
const actionSuccessMessage = ref('');
const lastRunResult = ref<AdminNewsBotJobRunResponse | null>(null);
const showAdvancedExecutionSettings = ref(false);
const isSyncingForm = ref(false);
const fieldErrors = reactive<Record<RequiredFieldName, string | null>>({
  jobName: null,
  devTag: null,
  devUsername: null,
  githubOwner: null,
  githubRepo: null,
  rssFeedUrl: null,
  targetBoardSlug: null,
  targetBoardName: null,
});

const form = reactive<NewsBotFormState>({
  jobName: '',
  sourceType: 'DEV_TO',
  hackerNewsStoryType: 'topstories',
  devSourceMode: 'TAG',
  devTag: '',
  devUsername: '',
  githubOwner: '',
  githubRepo: '',
  rssFeedUrl: '',
  targetBoardSlug: '',
  targetBoardName: '',
  targetCategoryName: '',
  collectIntervalMinutes: SOURCE_EXECUTION_POLICIES.DEV_TO.defaultInterval,
  fetchLimit: SOURCE_EXECUTION_POLICIES.DEV_TO.defaultFetchLimit,
  autoCreateBoard: false,
  autoCreateCategory: true,
  timezone: DEFAULT_TIMEZONE,
});

const selectedJob = computed(() => jobs.value.find((job) => job.jobId === selectedJobId.value) ?? null);
const isEditMode = computed(() => selectedJob.value !== null);
const sourceTypeOptions: Array<{ value: NewsSourceType; label: string; description: string }> = [
  { value: 'DEV_TO', label: 'DEV API', description: 'tag 또는 username 조건으로 공개 개발 아티클을 수집합니다.' },
  { value: 'HACKER_NEWS', label: 'Hacker News', description: 'top/new/best story 목록에서 기술 커뮤니티 글을 수집합니다.' },
  { value: 'GITHUB_RELEASES', label: 'GitHub Releases', description: '특정 저장소 최신 릴리스를 수집합니다.' },
  { value: 'RSS', label: 'RSS / Atom', description: '공식 피드 URL을 읽어 최신 글을 수집합니다.' },
];
const hackerNewsStoryTypeOptions: Array<{ value: HackerNewsStoryType; label: string; description: string }> = [
  { value: 'topstories', label: 'Top Stories', description: '운영 초반 기본값으로 가장 무난합니다.' },
  { value: 'newstories', label: 'New Stories', description: '더 빠르지만 노이즈가 많아질 수 있습니다.' },
  { value: 'beststories', label: 'Best Stories', description: '반응이 좋았던 글 중심으로 가져옵니다.' },
];
const devSourceModeOptions: Array<{ value: DevSourceMode; label: string; description: string }> = [
  { value: 'TAG', label: '태그 기준', description: 'backend, java, spring 같은 주제 기준으로 모읍니다.' },
  { value: 'USERNAME', label: '작성자 기준', description: '특정 필자의 글만 큐레이션할 때 사용합니다.' },
];
const selectedSourceOption = computed(() => sourceTypeOptions.find((option) => option.value === form.sourceType) ?? null);
const selectedSourcePolicy = computed(() => SOURCE_EXECUTION_POLICIES[form.sourceType]);
const isDevTagMode = computed(() => form.devSourceMode === 'TAG');
const showTargetBoardNameField = computed(() => form.autoCreateBoard);
const showTimezoneField = computed(() => showAdvancedExecutionSettings.value || form.timezone.trim() !== DEFAULT_TIMEZONE);

const runWithFormSync = (callback: () => void) => {
  isSyncingForm.value = true;
  try {
    callback();
  } finally {
    isSyncingForm.value = false;
  }
};

const applyExecutionPolicy = (sourceType: NewsSourceType) => {
  const policy = SOURCE_EXECUTION_POLICIES[sourceType];
  form.collectIntervalMinutes = policy.defaultInterval;
  form.fetchLimit = policy.defaultFetchLimit;
};

const clearSourceSpecificFields = () => {
  form.hackerNewsStoryType = 'topstories';
  form.devSourceMode = 'TAG';
  form.devTag = '';
  form.devUsername = '';
  form.githubOwner = '';
  form.githubRepo = '';
  form.rssFeedUrl = '';
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '없음';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('ko-KR');
};

const formatIntervalPresetLabel = (minutes: number) => {
  if (minutes % 1440 === 0) {
    return `${minutes / 1440}일`;
  }
  if (minutes % 60 === 0) {
    return `${minutes / 60}시간`;
  }
  return `${minutes}분`;
};

const formatFetchLimitPresetLabel = (limit: number) => `${limit}건`;

const resolveStatusClass = (status: NewsJobExecutionStatus) => {
  if (status === 'SUCCESS') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200';
  }
  if (status === 'FAILED') {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200';
  }
  if (status === 'RUNNING') {
    return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200';
  }
  return 'bg-surface-soft text-muted bg-surface-2 ';
};

const resolveErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  return fallback;
};

const clearFieldError = (fieldName: RequiredFieldName) => {
  fieldErrors[fieldName] = null;
};

const clearAllFieldErrors = () => {
  Object.keys(fieldErrors).forEach((fieldName) => {
    fieldErrors[fieldName as RequiredFieldName] = null;
  });
};

const clearFieldErrorIfFilled = (fieldName: RequiredFieldName, value: string) => {
  if (!fieldErrors[fieldName]) {
    return;
  }
  if (value.trim()) {
    clearFieldError(fieldName);
  }
};

const resolveFieldLabelClass = (fieldName: RequiredFieldName) => (fieldErrors[fieldName] ? 'text-rose-600 dark:text-rose-300' : 'text-ink');

const resolveFieldInputClass = (fieldName: RequiredFieldName) =>
  fieldErrors[fieldName]
    ? 'rounded-ui border border-rose-400 bg-rose-50/70 px-4 py-3 text-sm text-ink shadow-sm outline-none transition focus:border-rose-500 dark:border-rose-500 dark:bg-rose-950/20 '
    : 'rounded-ui border border-line px-4 py-3 text-sm text-ink shadow-sm outline-none transition focus:border-[color:var(--accent-strong)] ';

const focusField = async (fieldName: RequiredFieldName) => {
  await nextTick();
  const target = document.querySelector<HTMLInputElement>(`[name="${fieldName}"]`);
  target?.focus();
};

const buildSourceConfig = (): Record<string, unknown> => {
  if (form.sourceType === 'HACKER_NEWS') {
    return { storyType: form.hackerNewsStoryType };
  }
  if (form.sourceType === 'DEV_TO') {
    if (form.devSourceMode === 'TAG') {
      return { tag: form.devTag.trim() };
    }
    return { username: form.devUsername.trim() };
  }
  if (form.sourceType === 'GITHUB_RELEASES') {
    return {
      owner: form.githubOwner.trim(),
      repo: form.githubRepo.trim(),
    };
  }
  return {
    feedUrl: form.rssFeedUrl.trim(),
  };
};

const validateForm = () => {
  clearAllFieldErrors();
  let firstInvalidField: RequiredFieldName | null = null;
  const markError = (fieldName: RequiredFieldName, message: string) => {
    fieldErrors[fieldName] = message;
    if (!firstInvalidField) {
      firstInvalidField = fieldName;
    }
  };

  if (!form.jobName.trim()) {
    markError('jobName', '잡 이름을 입력해주세요.');
  }
  if (!form.targetBoardSlug.trim()) {
    markError('targetBoardSlug', '대상 게시판 slug를 입력해주세요.');
  }
  if (form.autoCreateBoard && !form.targetBoardName.trim()) {
    markError('targetBoardName', '게시판 자동 생성을 사용하려면 대상 게시판 이름이 필요합니다.');
  }
  if (form.sourceType === 'DEV_TO' && form.devSourceMode === 'TAG' && !form.devTag.trim()) {
    markError('devTag', 'DEV API를 태그 기준으로 사용할 때는 tag를 입력해야 합니다.');
  }
  if (form.sourceType === 'DEV_TO' && form.devSourceMode === 'USERNAME' && !form.devUsername.trim()) {
    markError('devUsername', 'DEV API를 작성자 기준으로 사용할 때는 username을 입력해야 합니다.');
  }
  if (form.sourceType === 'GITHUB_RELEASES' && !form.githubOwner.trim()) {
    markError('githubOwner', 'GitHub Releases를 사용하려면 owner를 입력해야 합니다.');
  }
  if (form.sourceType === 'GITHUB_RELEASES' && !form.githubRepo.trim()) {
    markError('githubRepo', 'GitHub Releases를 사용하려면 repo를 입력해야 합니다.');
  }
  if (form.sourceType === 'RSS' && !form.rssFeedUrl.trim()) {
    markError('rssFeedUrl', 'RSS/Atom 피드 URL을 입력해주세요.');
  }
  return firstInvalidField;
};

const toPayload = (): AdminNewsBotJobUpsertRequest => ({
  jobName: form.jobName.trim(),
  sourceType: form.sourceType,
  sourceConfig: buildSourceConfig(),
  targetBoardSlug: form.targetBoardSlug.trim(),
  targetBoardName: form.targetBoardName.trim() || null,
  targetCategoryName: form.targetCategoryName.trim() || null,
  collectIntervalMinutes: form.collectIntervalMinutes,
  fetchLimit: form.fetchLimit,
  autoCreateBoard: form.autoCreateBoard,
  autoCreateCategory: form.autoCreateCategory,
  timezone: form.timezone.trim() || null,
});

const resetForm = () => {
  clearAllFieldErrors();
  runWithFormSync(() => {
    form.jobName = '';
    form.sourceType = 'DEV_TO';
    clearSourceSpecificFields();
    form.targetBoardSlug = '';
    form.targetBoardName = '';
    form.targetCategoryName = '';
    applyExecutionPolicy('DEV_TO');
    form.autoCreateBoard = false;
    form.autoCreateCategory = true;
    form.timezone = DEFAULT_TIMEZONE;
  });
  showAdvancedExecutionSettings.value = false;
  selectedJobId.value = null;
};

const applyJobToForm = (job: AdminNewsBotJobResponse) => {
  clearAllFieldErrors();
  const sourceConfig = job.sourceConfig;
  const devTag = (sourceConfig.tag as string | undefined) ?? '';
  const devUsername = (sourceConfig.username as string | undefined) ?? '';

  runWithFormSync(() => {
    form.jobName = job.jobName;
    form.sourceType = job.sourceType;
    form.hackerNewsStoryType = (sourceConfig.storyType as HackerNewsStoryType | undefined) ?? 'topstories';
    form.devSourceMode = devUsername && !devTag ? 'USERNAME' : 'TAG';
    form.devTag = devTag;
    form.devUsername = devUsername;
    form.githubOwner = (sourceConfig.owner as string | undefined) ?? '';
    form.githubRepo = (sourceConfig.repo as string | undefined) ?? '';
    form.rssFeedUrl = (sourceConfig.feedUrl as string | undefined) ?? '';
    form.targetBoardSlug = job.targetBoardSlug;
    form.targetBoardName = job.targetBoardName ?? '';
    form.targetCategoryName = job.targetCategoryName ?? '';
    form.collectIntervalMinutes = job.collectIntervalMinutes;
    form.fetchLimit = job.fetchLimit;
    form.autoCreateBoard = job.autoCreateBoard;
    form.autoCreateCategory = job.autoCreateCategory;
    form.timezone = job.timezone;
  });
  showAdvancedExecutionSettings.value = job.timezone !== DEFAULT_TIMEZONE;
};

const loadJobs = async () => {
  listError.value = '';
  isLoading.value = true;
  try {
    jobs.value = await getAdminNewsBotJobs();
    if (selectedJobId.value) {
      const matched = jobs.value.find((job) => job.jobId === selectedJobId.value);
      if (matched) {
        applyJobToForm(matched);
      } else {
        resetForm();
      }
    }
  } catch (error) {
    listError.value = resolveErrorMessage(error, '뉴스봇 잡 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const selectJob = (job: AdminNewsBotJobResponse) => {
  selectedJobId.value = job.jobId;
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  applyJobToForm(job);
};

const submitForm = async () => {
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  const firstInvalidField = validateForm();
  if (firstInvalidField) {
    actionErrorMessage.value = fieldErrors[firstInvalidField] ?? '필수 입력값을 확인해주세요.';
    await focusField(firstInvalidField);
    return;
  }

  isSaving.value = true;
  try {
    const payload = toPayload();
    if (selectedJob.value) {
      await updateAdminNewsBotJob(selectedJob.value.jobId, payload);
      actionSuccessMessage.value = '뉴스봇 잡을 수정했습니다.';
    } else {
      await createAdminNewsBotJob(payload);
      actionSuccessMessage.value = '뉴스봇 잡을 생성했습니다.';
      resetForm();
    }
    await loadJobs();
    clearAllFieldErrors();
  } catch (error) {
    actionErrorMessage.value = resolveErrorMessage(error, '뉴스봇 잡 저장에 실패했습니다.');
  } finally {
    isSaving.value = false;
  }
};

const toggleEnabled = async (job: AdminNewsBotJobResponse) => {
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  try {
    await changeAdminNewsBotJobEnabled(job.jobId, !job.enabled);
    actionSuccessMessage.value = job.enabled ? '뉴스봇 잡을 비활성화했습니다.' : '뉴스봇 잡을 활성화했습니다.';
    await loadJobs();
  } catch (error) {
    actionErrorMessage.value = resolveErrorMessage(error, '뉴스봇 잡 상태 변경에 실패했습니다.');
  }
};

const runNow = async (job: AdminNewsBotJobResponse) => {
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  runningJobId.value = job.jobId;
  try {
    lastRunResult.value = await runAdminNewsBotJobNow(job.jobId);
    actionSuccessMessage.value = '뉴스봇 잡을 즉시 실행했습니다.';
    await loadJobs();
  } catch (error) {
    actionErrorMessage.value = resolveErrorMessage(error, '뉴스봇 즉시 실행에 실패했습니다.');
  } finally {
    runningJobId.value = null;
  }
};

onMounted(async () => {
  await nextTick();
  await loadJobs();
});

watch(
  () => form.sourceType,
  (nextSourceType, previousSourceType) => {
    if (isSyncingForm.value || nextSourceType === previousSourceType) {
      return;
    }
    clearSourceSpecificFields();
    clearFieldError('devTag');
    clearFieldError('devUsername');
    clearFieldError('githubOwner');
    clearFieldError('githubRepo');
    clearFieldError('rssFeedUrl');
    applyExecutionPolicy(nextSourceType);
    form.timezone = DEFAULT_TIMEZONE;
    showAdvancedExecutionSettings.value = false;
  },
);

watch(
  () => form.devSourceMode,
  (mode) => {
    if (isSyncingForm.value || form.sourceType !== 'DEV_TO') {
      return;
    }
    clearFieldError('devTag');
    clearFieldError('devUsername');
    if (mode === 'TAG') {
      form.devUsername = '';
      return;
    }
    form.devTag = '';
  },
);

watch(
  () => form.autoCreateBoard,
  (enabled) => {
    if (isSyncingForm.value) {
      return;
    }
    if (!enabled) {
      form.targetBoardName = '';
      clearFieldError('targetBoardName');
    }
  },
);
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="ui-heading-page">뉴스봇 운영</h1>
            <p class="mt-1 text-sm text-muted">외부 공개 API/RSS를 주기적으로 수집해 게시판에 새소식을 자동 발행합니다.</p>
          </div>
          <RouterLink
            to="/admin"
            class="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-line hover:bg-surface-soft"
          >
            백오피스 홈
          </RouterLink>
        </div>

        <div v-if="actionErrorMessage" class="ui-state ui-state-danger">
          {{ actionErrorMessage }}
        </div>
        <div v-if="actionSuccessMessage" class="ui-state ui-state-success">
          {{ actionSuccessMessage }}
        </div>
        <div v-if="listError" class="ui-state ui-state-danger">
          {{ listError }}
        </div>

        <div class="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section class="ui-panel p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-ink">잡 목록</h2>
                <p class="mt-1 text-sm text-muted">`1 job = 1 board` 기준으로 운영하고, 게시판 자동 생성은 신중하게 켜는 편이 안전합니다.</p>
              </div>
              <button
                type="button"
                class="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:text-subtle"
                @click="resetForm"
              >
                새 잡 작성
              </button>
            </div>

            <div v-if="isLoading" class="mt-6 flex items-center gap-2 text-sm text-muted">
              <span class="h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)] dark:bg-surface-2"></span>
              불러오는 중...
            </div>

            <div v-else class="mt-6 flex flex-col gap-4">
              <button
                v-for="job in jobs"
                :key="job.jobId"
                type="button"
                class="ui-card text-left transition hover:border-line hover:bg-surface-2"
                :class="job.jobId === selectedJobId ? 'border-line bg-surface-soft/70 shadow-sm' : 'border-line'"
                @click="selectJob(job)"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="text-base font-semibold text-ink">{{ job.jobName }}</h3>
                      <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="resolveStatusClass(job.lastStatus)">
                        {{ job.lastStatus }}
                      </span>
                      <span
                        class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        :class="
                          job.enabled
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
                            : 'bg-surface-2 bg-surface-soft text-muted'
                        "
                      >
                        {{ job.enabled ? 'ON' : 'OFF' }}
                      </span>
                    </div>
                    <p class="mt-2 text-sm text-muted">
                      {{ job.sourceType }} · /b/{{ job.targetBoardSlug }} · {{ job.collectIntervalMinutes }}분마다 · 최대 {{ job.fetchLimit }}건
                    </p>
                    <p class="mt-1 text-xs text-subtle">다음 실행 {{ formatDateTime(job.nextRunAt) }}</p>
                    <p v-if="job.lastErrorMessage" class="mt-2 text-xs text-danger">최근 오류: {{ job.lastErrorMessage }}</p>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      class="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:text-subtle"
                      @click.stop="toggleEnabled(job)"
                    >
                      {{ job.enabled ? '끄기' : '켜기' }}
                    </button>
                    <button
                      type="button"
                      class="rounded-full bg-[color:var(--accent-strong)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-surface-soft dark:text-ink"
                      :disabled="runningJobId === job.jobId"
                      @click.stop="runNow(job)"
                    >
                      {{ runningJobId === job.jobId ? '실행 중...' : '지금 실행' }}
                    </button>
                  </div>
                </div>
              </button>

              <div v-if="jobs.length === 0" class="ui-state ui-state-empty px-4 py-12">등록된 뉴스봇 잡이 없습니다.</div>
            </div>
          </section>

          <div class="space-y-6">
            <section class="ui-panel p-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs tracking-[0.2em] text-subtle uppercase">{{ isEditMode ? 'Edit' : 'Create' }}</p>
                  <h2 class="mt-1 text-lg font-semibold text-ink">
                    {{ isEditMode ? '뉴스봇 잡 수정' : '뉴스봇 잡 생성' }}
                  </h2>
                </div>
                <span v-if="selectedJob" class="text-xs text-subtle">ID {{ selectedJob.jobId }}</span>
              </div>

              <form class="mt-6 space-y-4" @submit.prevent="submitForm">
                <div class="ui-card">
                  <div>
                    <h3 class="text-sm font-semibold text-ink">공통 정보</h3>
                    <p class="mt-1 text-xs leading-6 text-muted">이 잡이 어떤 목적의 잡인지 먼저 정하고, 어떤 외부 소스를 쓸지 고릅니다.</p>
                  </div>
                  <div class="mt-4 grid gap-4">
                    <label :class="['flex flex-col gap-2 text-sm font-medium', resolveFieldLabelClass('jobName')]">
                      잡 이름
                      <input
                        v-model="form.jobName"
                        name="jobName"
                        type="text"
                        maxlength="120"
                        :class="resolveFieldInputClass('jobName')"
                        :aria-invalid="Boolean(fieldErrors.jobName)"
                        :data-invalid="fieldErrors.jobName ? 'true' : 'false'"
                        placeholder="예: 스프링 부트 릴리즈"
                        @input="clearFieldErrorIfFilled('jobName', form.jobName)"
                      />
                      <span v-if="fieldErrors.jobName" class="text-xs font-medium text-rose-600 dark:text-rose-300">
                        {{ fieldErrors.jobName }}
                      </span>
                    </label>
                    <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                      외부 소스
                      <select
                        v-model="form.sourceType"
                        name="sourceType"
                        class="rounded-ui border border-line px-4 py-3 text-sm text-ink shadow-sm transition outline-none focus:border-[color:var(--accent-strong)]"
                      >
                        <option v-for="option in sourceTypeOptions" :key="option.value" :value="option.value">
                          {{ option.label }}
                        </option>
                      </select>
                    </label>
                  </div>
                  <div
                    class="mt-3 rounded-ui border border-line bg-surface-soft bg-surface/80 px-4 py-3 text-xs leading-6 text-muted dark:border-line dark:text-subtle"
                  >
                    <p>{{ selectedSourceOption?.description }}</p>
                    <p class="mt-1">{{ selectedSourcePolicy.summary }}</p>
                  </div>
                </div>

                <div class="ui-card">
                  <div>
                    <h3 class="text-sm font-semibold text-ink">외부 소스 조건</h3>
                    <p class="mt-1 text-xs leading-6 text-muted">
                      아래 값은 어떤 글을 가져올지 결정합니다. 게시판 slug나 카테고리와는 역할이 다릅니다.
                    </p>
                  </div>

                  <div v-if="form.sourceType === 'HACKER_NEWS'" class="mt-4 grid gap-4">
                    <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                      storyType
                      <select
                        v-model="form.hackerNewsStoryType"
                        name="hackerNewsStoryType"
                        class="rounded-ui border border-line px-4 py-3 text-sm text-ink shadow-sm transition outline-none focus:border-[color:var(--accent-strong)]"
                      >
                        <option v-for="option in hackerNewsStoryTypeOptions" :key="option.value" :value="option.value">
                          {{ option.label }}
                        </option>
                      </select>
                    </label>
                    <p class="text-xs leading-6 text-muted">
                      {{ hackerNewsStoryTypeOptions.find((option) => option.value === form.hackerNewsStoryType)?.description }}
                    </p>
                  </div>

                  <div v-if="form.sourceType === 'DEV_TO'" class="mt-4 space-y-4">
                    <fieldset class="space-y-2">
                      <legend class="text-sm font-medium text-ink">수집 기준</legend>
                      <div class="grid gap-3 md:grid-cols-2">
                        <label
                          v-for="option in devSourceModeOptions"
                          :key="option.value"
                          class="flex cursor-pointer items-start gap-3 rounded-ui border px-4 py-3 text-sm transition"
                          :class="
                            form.devSourceMode === option.value
                              ? 'border-[color:var(--line-strong)] bg-surface text-ink shadow-sm dark:border-line'
                              : 'border-line text-muted dark:text-subtle'
                          "
                        >
                          <input v-model="form.devSourceMode" type="radio" name="devSourceMode" :value="option.value" class="mt-1 h-4 w-4" />
                          <span>
                            <span class="block font-semibold">{{ option.label }}</span>
                            <span class="mt-1 block text-xs leading-5 text-muted">{{ option.description }}</span>
                          </span>
                        </label>
                      </div>
                    </fieldset>

                    <label v-if="isDevTagMode" :class="['flex flex-col gap-2 text-sm font-medium', resolveFieldLabelClass('devTag')]">
                      tag
                      <input
                        v-model="form.devTag"
                        name="devTag"
                        type="text"
                        :class="resolveFieldInputClass('devTag')"
                        :aria-invalid="Boolean(fieldErrors.devTag)"
                        :data-invalid="fieldErrors.devTag ? 'true' : 'false'"
                        placeholder="예: backend"
                        @input="clearFieldErrorIfFilled('devTag', form.devTag)"
                      />
                      <span v-if="fieldErrors.devTag" class="text-xs font-medium text-rose-600 dark:text-rose-300">
                        {{ fieldErrors.devTag }}
                      </span>
                    </label>
                    <label v-else :class="['flex flex-col gap-2 text-sm font-medium', resolveFieldLabelClass('devUsername')]">
                      username
                      <input
                        v-model="form.devUsername"
                        name="devUsername"
                        type="text"
                        :class="resolveFieldInputClass('devUsername')"
                        :aria-invalid="Boolean(fieldErrors.devUsername)"
                        :data-invalid="fieldErrors.devUsername ? 'true' : 'false'"
                        placeholder="예: ben"
                        @input="clearFieldErrorIfFilled('devUsername', form.devUsername)"
                      />
                      <span v-if="fieldErrors.devUsername" class="text-xs font-medium text-rose-600 dark:text-rose-300">
                        {{ fieldErrors.devUsername }}
                      </span>
                    </label>
                  </div>

                  <div v-if="form.sourceType === 'GITHUB_RELEASES'" class="mt-4 grid gap-4 md:grid-cols-2">
                    <label :class="['flex flex-col gap-2 text-sm font-medium', resolveFieldLabelClass('githubOwner')]">
                      owner
                      <input
                        v-model="form.githubOwner"
                        name="githubOwner"
                        type="text"
                        :class="resolveFieldInputClass('githubOwner')"
                        :aria-invalid="Boolean(fieldErrors.githubOwner)"
                        :data-invalid="fieldErrors.githubOwner ? 'true' : 'false'"
                        placeholder="예: spring-projects"
                        @input="clearFieldErrorIfFilled('githubOwner', form.githubOwner)"
                      />
                      <span v-if="fieldErrors.githubOwner" class="text-xs font-medium text-rose-600 dark:text-rose-300">
                        {{ fieldErrors.githubOwner }}
                      </span>
                    </label>
                    <label :class="['flex flex-col gap-2 text-sm font-medium', resolveFieldLabelClass('githubRepo')]">
                      repo
                      <input
                        v-model="form.githubRepo"
                        name="githubRepo"
                        type="text"
                        :class="resolveFieldInputClass('githubRepo')"
                        :aria-invalid="Boolean(fieldErrors.githubRepo)"
                        :data-invalid="fieldErrors.githubRepo ? 'true' : 'false'"
                        placeholder="예: spring-boot"
                        @input="clearFieldErrorIfFilled('githubRepo', form.githubRepo)"
                      />
                      <span v-if="fieldErrors.githubRepo" class="text-xs font-medium text-rose-600 dark:text-rose-300">
                        {{ fieldErrors.githubRepo }}
                      </span>
                    </label>
                  </div>

                  <div v-if="form.sourceType === 'RSS'" class="mt-4 grid gap-4">
                    <label :class="['flex flex-col gap-2 text-sm font-medium', resolveFieldLabelClass('rssFeedUrl')]">
                      feedUrl
                      <input
                        v-model="form.rssFeedUrl"
                        name="rssFeedUrl"
                        type="url"
                        :class="resolveFieldInputClass('rssFeedUrl')"
                        :aria-invalid="Boolean(fieldErrors.rssFeedUrl)"
                        :data-invalid="fieldErrors.rssFeedUrl ? 'true' : 'false'"
                        placeholder="예: https://spring.io/blog.atom"
                        @input="clearFieldErrorIfFilled('rssFeedUrl', form.rssFeedUrl)"
                      />
                      <span v-if="fieldErrors.rssFeedUrl" class="text-xs font-medium text-rose-600 dark:text-rose-300">
                        {{ fieldErrors.rssFeedUrl }}
                      </span>
                    </label>
                  </div>
                </div>

                <div class="ui-card">
                  <div>
                    <h3 class="text-sm font-semibold text-ink">내부 적재 정보</h3>
                    <p class="mt-1 text-xs leading-6 text-muted">
                      가져온 글을 어느 게시판과 카테고리에 넣을지 정합니다. 외부 검색 조건은 바꾸지 않습니다.
                    </p>
                  </div>
                  <div class="mt-4 grid gap-4">
                    <label :class="['flex flex-col gap-2 text-sm font-medium', resolveFieldLabelClass('targetBoardSlug')]">
                      대상 게시판 slug
                      <input
                        v-model="form.targetBoardSlug"
                        name="targetBoardSlug"
                        type="text"
                        maxlength="80"
                        :class="resolveFieldInputClass('targetBoardSlug')"
                        :aria-invalid="Boolean(fieldErrors.targetBoardSlug)"
                        :data-invalid="fieldErrors.targetBoardSlug ? 'true' : 'false'"
                        placeholder="예: spring-news"
                        @input="clearFieldErrorIfFilled('targetBoardSlug', form.targetBoardSlug)"
                      />
                      <span v-if="fieldErrors.targetBoardSlug" class="text-xs font-medium text-rose-600 dark:text-rose-300">
                        {{ fieldErrors.targetBoardSlug }}
                      </span>
                    </label>
                    <label
                      v-if="showTargetBoardNameField"
                      :class="['flex flex-col gap-2 text-sm font-medium', resolveFieldLabelClass('targetBoardName')]"
                    >
                      자동 생성용 게시판 이름
                      <input
                        v-model="form.targetBoardName"
                        name="targetBoardName"
                        type="text"
                        maxlength="255"
                        :class="resolveFieldInputClass('targetBoardName')"
                        :aria-invalid="Boolean(fieldErrors.targetBoardName)"
                        :data-invalid="fieldErrors.targetBoardName ? 'true' : 'false'"
                        placeholder="예: 스프링 새소식"
                        @input="clearFieldErrorIfFilled('targetBoardName', form.targetBoardName)"
                      />
                      <span v-if="fieldErrors.targetBoardName" class="text-xs font-medium text-rose-600 dark:text-rose-300">
                        {{ fieldErrors.targetBoardName }}
                      </span>
                    </label>
                    <p
                      v-else
                      class="rounded-ui border border-dashed border-line px-4 py-3 text-xs leading-6 text-muted dark:border-line dark:text-subtle"
                    >
                      게시판 자동 생성이 꺼져 있어 게시판 이름 입력은 숨겨집니다. 기존 게시판 slug로만 적재합니다.
                    </p>
                    <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                      기본 카테고리
                      <input
                        v-model="form.targetCategoryName"
                        name="targetCategoryName"
                        type="text"
                        maxlength="48"
                        class="rounded-ui border border-line px-4 py-3 text-sm text-ink shadow-sm transition outline-none focus:border-[color:var(--accent-strong)]"
                        placeholder="예: release"
                      />
                    </label>
                  </div>
                </div>

                <div class="ui-card">
                  <div>
                    <h3 class="text-sm font-semibold text-ink">실행 정책</h3>
                    <p class="mt-1 text-xs leading-6 text-muted">
                      주기와 수집 건수를 조절합니다. 아래 preset은 현재 선택한 외부 소스 기준 추천값입니다.
                    </p>
                  </div>
                  <div class="mt-4 grid gap-4 md:grid-cols-2">
                    <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                      수집 주기(분)
                      <input
                        v-model.number="form.collectIntervalMinutes"
                        name="collectIntervalMinutes"
                        type="number"
                        min="5"
                        max="10080"
                        class="rounded-ui border border-line px-4 py-3 text-sm text-ink shadow-sm transition outline-none focus:border-[color:var(--accent-strong)]"
                      />
                      <span class="text-xs font-normal text-subtle">예: 180=3시간, 1440=24시간</span>
                    </label>
                    <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                      1회 최대 수집 건수
                      <input
                        v-model.number="form.fetchLimit"
                        name="fetchLimit"
                        type="number"
                        min="1"
                        max="100"
                        class="rounded-ui border border-line px-4 py-3 text-sm text-ink shadow-sm transition outline-none focus:border-[color:var(--accent-strong)]"
                      />
                      <span class="text-xs font-normal text-subtle">한 번 실행할 때 가져올 최대 글 수입니다.</span>
                    </label>
                  </div>

                  <div class="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p class="text-xs font-semibold tracking-[0.14em] text-subtle uppercase">주기 preset</p>
                      <div class="mt-2 flex flex-wrap gap-2">
                        <button
                          v-for="preset in selectedSourcePolicy.intervalOptions"
                          :key="preset"
                          type="button"
                          class="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                          :class="
                            form.collectIntervalMinutes === preset
                              ? 'border-[color:var(--line-strong)] bg-surface text-ink shadow-sm dark:border-line'
                              : 'border-line text-muted hover:border-line dark:text-subtle'
                          "
                          @click="form.collectIntervalMinutes = preset"
                        >
                          {{ formatIntervalPresetLabel(preset) }}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p class="text-xs font-semibold tracking-[0.14em] text-subtle uppercase">수집 건수 preset</p>
                      <div class="mt-2 flex flex-wrap gap-2">
                        <button
                          v-for="preset in selectedSourcePolicy.fetchLimitOptions"
                          :key="preset"
                          type="button"
                          class="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                          :class="
                            form.fetchLimit === preset
                              ? 'border-[color:var(--line-strong)] bg-surface text-ink shadow-sm dark:border-line'
                              : 'border-line text-muted hover:border-line dark:text-subtle'
                          "
                          @click="form.fetchLimit = preset"
                        >
                          {{ formatFetchLimitPresetLabel(preset) }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="ui-card mt-4">
                    <button
                      type="button"
                      data-testid="news-bot-advanced-toggle"
                      class="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-ink"
                      @click="showAdvancedExecutionSettings = !showAdvancedExecutionSettings"
                    >
                      <span>고급 실행 설정</span>
                      <span class="text-xs text-subtle">{{ showTimezoneField ? '숨기기' : '열기' }}</span>
                    </button>
                    <p class="mt-2 text-xs leading-6 text-muted">
                      timezone 기본값은 {{ DEFAULT_TIMEZONE }} 입니다. 특별한 이유가 없으면 기본값을 유지하는 편이 좋습니다.
                    </p>
                    <label v-if="showTimezoneField" class="mt-4 flex flex-col gap-2 text-sm font-medium text-ink">
                      timezone
                      <input
                        v-model="form.timezone"
                        name="timezone"
                        type="text"
                        maxlength="64"
                        class="rounded-ui border border-line px-4 py-3 text-sm text-ink shadow-sm transition outline-none focus:border-[color:var(--accent-strong)]"
                        placeholder="예: Asia/Seoul"
                      />
                    </label>
                  </div>
                </div>

                <div class="ui-card">
                  <div>
                    <h3 class="text-sm font-semibold text-ink">자동 생성 정책</h3>
                    <p class="mt-1 text-xs leading-6 text-muted">
                      게시판 자동 생성은 외부 데이터 분산을 막기 위해 기본적으로 꺼두는 편이 안전합니다.
                    </p>
                  </div>
                  <div class="mt-4 grid gap-3">
                    <label class="flex items-center gap-3 text-sm font-medium text-ink">
                      <input
                        v-model="form.autoCreateBoard"
                        name="autoCreateBoard"
                        type="checkbox"
                        class="h-4 w-4 rounded border-line text-ink focus:ring-[color:var(--accent-ring)]"
                      />
                      게시판 자동 생성 허용
                    </label>
                    <label class="flex items-center gap-3 text-sm font-medium text-ink">
                      <input
                        v-model="form.autoCreateCategory"
                        name="autoCreateCategory"
                        type="checkbox"
                        class="h-4 w-4 rounded border-line text-ink focus:ring-[color:var(--accent-ring)]"
                      />
                      카테고리 자동 생성 허용
                    </label>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    class="rounded-full bg-[color:var(--accent-strong)] px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-surface-soft dark:text-ink"
                    :disabled="isSaving"
                  >
                    {{ isSaving ? '저장 중...' : isEditMode ? '잡 수정' : '잡 생성' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-line px-6 py-2 text-sm font-semibold text-muted transition hover:border-line hover:text-ink dark:text-subtle"
                    @click="resetForm"
                  >
                    폼 초기화
                  </button>
                </div>
              </form>
            </section>

            <section v-if="lastRunResult" class="ui-panel p-5">
              <h2 class="text-lg font-semibold text-ink">최근 즉시 실행 결과</h2>
              <div class="mt-4 grid gap-3 md:grid-cols-2">
                <div class="ui-stat-card">
                  <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">실행 시각</p>
                  <p class="mt-2 text-sm font-semibold text-ink">{{ formatDateTime(lastRunResult.executedAt) }}</p>
                </div>
                <div class="ui-stat-card">
                  <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">상태</p>
                  <p class="mt-2 text-sm font-semibold text-ink">{{ lastRunResult.status }}</p>
                </div>
                <div class="ui-stat-card">
                  <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">가져온 항목</p>
                  <p class="mt-2 text-lg font-semibold text-ink">{{ lastRunResult.fetchedCount }}</p>
                </div>
                <div class="ui-stat-card">
                  <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">생성/갱신/스킵</p>
                  <p class="mt-2 text-sm font-semibold text-ink">
                    {{ lastRunResult.createdCount }} / {{ lastRunResult.updatedCount }} / {{ lastRunResult.skippedCount }}
                  </p>
                </div>
              </div>
              <p v-if="lastRunResult.errorMessage" class="mt-4 text-sm text-rose-600 dark:text-rose-300">오류: {{ lastRunResult.errorMessage }}</p>
            </section>
          </div>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>
