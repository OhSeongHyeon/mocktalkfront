<script setup lang="ts">
import { useI18n } from 'vue-i18n';
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

const { t } = useI18n();

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
const sourceExecutionPolicies = computed<Record<NewsSourceType, SourceExecutionPolicy>>(() => ({
  DEV_TO: {
    defaultInterval: 180,
    defaultFetchLimit: 10,
    intervalOptions: [60, 180, 360],
    fetchLimitOptions: [5, 10, 20],
    summary: t('admin.newsBot.presets.devTo'),
  },
  HACKER_NEWS: {
    defaultInterval: 180,
    defaultFetchLimit: 10,
    intervalOptions: [60, 180, 360],
    fetchLimitOptions: [5, 10, 20],
    summary: t('admin.newsBot.presets.hackerNews'),
  },
  GITHUB_RELEASES: {
    defaultInterval: 720,
    defaultFetchLimit: 1,
    intervalOptions: [360, 720, 1440],
    fetchLimitOptions: [1, 3, 5],
    summary: t('admin.newsBot.presets.githubReleases'),
  },
  RSS: {
    defaultInterval: 360,
    defaultFetchLimit: 8,
    intervalOptions: [180, 360, 720],
    fetchLimitOptions: [5, 8, 10],
    summary: t('admin.newsBot.presets.rss'),
  },
}));

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
  collectIntervalMinutes: 180,
  fetchLimit: 10,
  autoCreateBoard: false,
  autoCreateCategory: true,
  timezone: DEFAULT_TIMEZONE,
});

const selectedJob = computed(() => jobs.value.find((job) => job.jobId === selectedJobId.value) ?? null);
const isEditMode = computed(() => selectedJob.value !== null);
const sourceTypeOptions = computed(() =>
  (['DEV_TO', 'HACKER_NEWS', 'GITHUB_RELEASES', 'RSS'] as NewsSourceType[]).map((value) => ({
    value,
    label: t(`admin.newsBot.sources.${value}.label`),
    description: t(`admin.newsBot.sources.${value}.description`),
  })),
);
const hackerNewsStoryTypeOptions = computed(() =>
  (['topstories', 'newstories', 'beststories'] as HackerNewsStoryType[]).map((value) => ({
    value,
    label: t(`admin.newsBot.hnFeeds.${value}.label`),
    description: t(`admin.newsBot.hnFeeds.${value}.description`),
  })),
);
const devSourceModeOptions = computed(() =>
  (['TAG', 'USERNAME'] as DevSourceMode[]).map((value) => ({
    value,
    label: t(`admin.newsBot.devModes.${value}.label`),
    description: t(`admin.newsBot.devModes.${value}.description`),
  })),
);
const selectedSourceOption = computed(() => sourceTypeOptions.value.find((option) => option.value === form.sourceType) ?? null);
const selectedSourcePolicy = computed(() => sourceExecutionPolicies.value[form.sourceType]);
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
  const policy = sourceExecutionPolicies.value[sourceType];
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
    return t('admin.newsBot.none');
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('ko-KR');
};

const formatIntervalPresetLabel = (minutes: number) => {
  if (minutes % 1440 === 0) {
    return t('admin.newsBot.intervalDays', { days: minutes / 1440 });
  }
  if (minutes % 60 === 0) {
    return t('admin.newsBot.intervalHours', { hours: minutes / 60 });
  }
  return t('admin.newsBot.intervalMinutes', { minutes });
};

const formatFetchLimitPresetLabel = (limit: number) => t('admin.newsBot.fetchLimitCount', { limit });

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
    markError('jobName', t('admin.newsBot.errors.jobNameRequired'));
  }
  if (!form.targetBoardSlug.trim()) {
    markError('targetBoardSlug', t('admin.newsBot.errors.targetBoardSlugRequired'));
  }
  if (form.autoCreateBoard && !form.targetBoardName.trim()) {
    markError('targetBoardName', t('admin.newsBot.errors.targetBoardNameRequired'));
  }
  if (form.sourceType === 'DEV_TO' && form.devSourceMode === 'TAG' && !form.devTag.trim()) {
    markError('devTag', t('admin.newsBot.errors.devTagRequired'));
  }
  if (form.sourceType === 'DEV_TO' && form.devSourceMode === 'USERNAME' && !form.devUsername.trim()) {
    markError('devUsername', t('admin.newsBot.errors.devUsernameRequired'));
  }
  if (form.sourceType === 'GITHUB_RELEASES' && !form.githubOwner.trim()) {
    markError('githubOwner', t('admin.newsBot.errors.githubOwnerRequired'));
  }
  if (form.sourceType === 'GITHUB_RELEASES' && !form.githubRepo.trim()) {
    markError('githubRepo', t('admin.newsBot.errors.githubRepoRequired'));
  }
  if (form.sourceType === 'RSS' && !form.rssFeedUrl.trim()) {
    markError('rssFeedUrl', t('admin.newsBot.errors.rssFeedUrlRequired'));
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
    listError.value = resolveErrorMessage(error, t('admin.newsBot.errors.loadList'));
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
    actionErrorMessage.value = fieldErrors[firstInvalidField] ?? t('admin.newsBot.errors.requiredFields');
    await focusField(firstInvalidField);
    return;
  }

  isSaving.value = true;
  try {
    const payload = toPayload();
    if (selectedJob.value) {
      await updateAdminNewsBotJob(selectedJob.value.jobId, payload);
      actionSuccessMessage.value = t('admin.newsBot.success.updated');
    } else {
      await createAdminNewsBotJob(payload);
      actionSuccessMessage.value = t('admin.newsBot.success.created');
      resetForm();
    }
    await loadJobs();
    clearAllFieldErrors();
  } catch (error) {
    actionErrorMessage.value = resolveErrorMessage(error, t('admin.newsBot.errors.saveFailed'));
  } finally {
    isSaving.value = false;
  }
};

const toggleEnabled = async (job: AdminNewsBotJobResponse) => {
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  try {
    await changeAdminNewsBotJobEnabled(job.jobId, !job.enabled);
    actionSuccessMessage.value = job.enabled ? t('admin.newsBot.success.disabled') : t('admin.newsBot.success.enabled');
    await loadJobs();
  } catch (error) {
    actionErrorMessage.value = resolveErrorMessage(error, t('admin.newsBot.errors.toggleFailed'));
  }
};

const runNow = async (job: AdminNewsBotJobResponse) => {
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  runningJobId.value = job.jobId;
  try {
    lastRunResult.value = await runAdminNewsBotJobNow(job.jobId);
    actionSuccessMessage.value = t('admin.newsBot.success.ran');
    await loadJobs();
  } catch (error) {
    actionErrorMessage.value = resolveErrorMessage(error, t('admin.newsBot.errors.runFailed'));
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
            <h1 class="ui-heading-page">{{ t('admin.newsBot.title') }}</h1>
            <p class="mt-1 text-sm text-muted">{{ t('admin.newsBot.description') }}</p>
          </div>
          <RouterLink
            to="/admin"
            class="inline-flex items-center rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-line hover:bg-surface-soft"
          >
            {{ t('admin.common.backofficeHome') }}
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
                <h2 class="text-lg font-semibold text-ink">{{ t('admin.newsBot.jobListTitle') }}</h2>
                <p class="mt-1 text-sm text-muted">{{ t('admin.newsBot.jobListHint') }}</p>
              </div>
              <button
                type="button"
                class="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:text-subtle"
                @click="resetForm"
              >
                {{ t('admin.newsBot.newJob') }}
              </button>
            </div>

            <div v-if="isLoading" class="mt-6 flex items-center gap-2 text-sm text-muted">
              <span class="h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)] dark:bg-surface-2"></span>
              {{ t('common.loading') }}
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
                      {{
                        t('admin.newsBot.jobMeta', {
                          source: job.sourceType,
                          slug: job.targetBoardSlug,
                          interval: job.collectIntervalMinutes,
                          limit: job.fetchLimit,
                        })
                      }}
                    </p>
                    <p class="mt-1 text-xs text-subtle">{{ t('admin.newsBot.nextRun') }} {{ formatDateTime(job.nextRunAt) }}</p>
                    <p v-if="job.lastErrorMessage" class="mt-2 text-xs text-danger">{{ t('admin.newsBot.lastError') }} {{ job.lastErrorMessage }}</p>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      class="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:text-subtle"
                      @click.stop="toggleEnabled(job)"
                    >
                      {{ job.enabled ? t('admin.newsBot.disable') : t('admin.newsBot.enable') }}
                    </button>
                    <button
                      type="button"
                      class="rounded-full bg-[color:var(--accent-strong)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-surface-soft dark:text-ink"
                      :disabled="runningJobId === job.jobId"
                      @click.stop="runNow(job)"
                    >
                      {{ runningJobId === job.jobId ? t('admin.newsBot.runNowSubmitting') : t('admin.newsBot.runNow') }}
                    </button>
                  </div>
                </div>
              </button>

              <div v-if="jobs.length === 0" class="ui-state ui-state-empty px-4 py-12">{{ t('admin.newsBot.empty') }}</div>
            </div>
          </section>

          <div class="space-y-6">
            <section class="ui-panel p-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs tracking-[0.2em] text-subtle uppercase">{{ isEditMode ? 'Edit' : 'Create' }}</p>
                  <h2 class="mt-1 text-lg font-semibold text-ink">
                    {{ isEditMode ? t('admin.newsBot.editJob') : t('admin.newsBot.createJob') }}
                  </h2>
                </div>
                <span v-if="selectedJob" class="text-xs text-subtle">ID {{ selectedJob.jobId }}</span>
              </div>

              <form class="mt-6 space-y-4" @submit.prevent="submitForm">
                <div class="ui-card">
                  <div>
                    <h3 class="text-sm font-semibold text-ink">{{ t('admin.newsBot.commonInfo') }}</h3>
                    <p class="mt-1 text-xs leading-6 text-muted">{{ t('admin.newsBot.commonInfoHint') }}</p>
                  </div>
                  <div class="mt-4 grid gap-4">
                    <label :class="['flex flex-col gap-2 text-sm font-medium', resolveFieldLabelClass('jobName')]">
                      {{ t('admin.newsBot.jobName') }}
                      <input
                        v-model="form.jobName"
                        name="jobName"
                        type="text"
                        maxlength="120"
                        :class="resolveFieldInputClass('jobName')"
                        :aria-invalid="Boolean(fieldErrors.jobName)"
                        :data-invalid="fieldErrors.jobName ? 'true' : 'false'"
                        :placeholder="t('admin.newsBot.jobNamePlaceholder')"
                        @input="clearFieldErrorIfFilled('jobName', form.jobName)"
                      />
                      <span v-if="fieldErrors.jobName" class="text-xs font-medium text-rose-600 dark:text-rose-300">
                        {{ fieldErrors.jobName }}
                      </span>
                    </label>
                    <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                      {{ t('admin.newsBot.externalSource') }}
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
                    <h3 class="text-sm font-semibold text-ink">{{ t('admin.newsBot.sourceConditions') }}</h3>
                    <p class="mt-1 text-xs leading-6 text-muted">
                      {{ t('admin.newsBot.sourceConditionsHint') }}
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
                      <legend class="text-sm font-medium text-ink">{{ t('admin.newsBot.collectCriteria') }}</legend>
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
                        :placeholder="t('admin.newsBot.placeholders.devTag')"
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
                        :placeholder="t('admin.newsBot.placeholders.devUsername')"
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
                        :placeholder="t('admin.newsBot.placeholders.githubOwner')"
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
                        :placeholder="t('admin.newsBot.placeholders.githubRepo')"
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
                        :placeholder="t('admin.newsBot.placeholders.rssFeedUrl')"
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
                    <h3 class="text-sm font-semibold text-ink">{{ t('admin.newsBot.internalStorage') }}</h3>
                    <p class="mt-1 text-xs leading-6 text-muted">
                      {{ t('admin.newsBot.internalStorageHint') }}
                    </p>
                  </div>
                  <div class="mt-4 grid gap-4">
                    <label :class="['flex flex-col gap-2 text-sm font-medium', resolveFieldLabelClass('targetBoardSlug')]">
                      {{ t('admin.newsBot.targetBoardSlug') }}
                      <input
                        v-model="form.targetBoardSlug"
                        name="targetBoardSlug"
                        type="text"
                        maxlength="80"
                        :class="resolveFieldInputClass('targetBoardSlug')"
                        :aria-invalid="Boolean(fieldErrors.targetBoardSlug)"
                        :data-invalid="fieldErrors.targetBoardSlug ? 'true' : 'false'"
                        :placeholder="t('admin.newsBot.targetBoardSlugPlaceholder')"
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
                      {{ t('admin.newsBot.autoCreateBoardName') }}
                      <input
                        v-model="form.targetBoardName"
                        name="targetBoardName"
                        type="text"
                        maxlength="255"
                        :class="resolveFieldInputClass('targetBoardName')"
                        :aria-invalid="Boolean(fieldErrors.targetBoardName)"
                        :data-invalid="fieldErrors.targetBoardName ? 'true' : 'false'"
                        :placeholder="t('admin.newsBot.autoCreateBoardNamePlaceholder')"
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
                      {{ t('admin.newsBot.autoCreateBoardHidden') }}
                    </p>
                    <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                      {{ t('admin.newsBot.defaultCategory') }}
                      <input
                        v-model="form.targetCategoryName"
                        name="targetCategoryName"
                        type="text"
                        maxlength="48"
                        class="rounded-ui border border-line px-4 py-3 text-sm text-ink shadow-sm transition outline-none focus:border-[color:var(--accent-strong)]"
                        :placeholder="t('admin.newsBot.defaultCategoryPlaceholder')"
                      />
                    </label>
                  </div>
                </div>

                <div class="ui-card">
                  <div>
                    <h3 class="text-sm font-semibold text-ink">{{ t('admin.newsBot.executionPolicy') }}</h3>
                    <p class="mt-1 text-xs leading-6 text-muted">
                      {{ t('admin.newsBot.executionPolicyHint') }}
                    </p>
                  </div>
                  <div class="mt-4 grid gap-4 md:grid-cols-2">
                    <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                      {{ t('admin.newsBot.collectIntervalMinutes') }}
                      <input
                        v-model.number="form.collectIntervalMinutes"
                        name="collectIntervalMinutes"
                        type="number"
                        min="5"
                        max="10080"
                        class="rounded-ui border border-line px-4 py-3 text-sm text-ink shadow-sm transition outline-none focus:border-[color:var(--accent-strong)]"
                      />
                      <span class="text-xs font-normal text-subtle">{{ t('admin.newsBot.collectIntervalHint') }}</span>
                    </label>
                    <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                      {{ t('admin.newsBot.fetchLimit') }}
                      <input
                        v-model.number="form.fetchLimit"
                        name="fetchLimit"
                        type="number"
                        min="1"
                        max="100"
                        class="rounded-ui border border-line px-4 py-3 text-sm text-ink shadow-sm transition outline-none focus:border-[color:var(--accent-strong)]"
                      />
                      <span class="text-xs font-normal text-subtle">{{ t('admin.newsBot.fetchLimitHint') }}</span>
                    </label>
                  </div>

                  <div class="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p class="text-xs font-semibold tracking-[0.14em] text-subtle uppercase">{{ t('admin.newsBot.intervalPreset') }}</p>
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
                      <p class="text-xs font-semibold tracking-[0.14em] text-subtle uppercase">{{ t('admin.newsBot.fetchLimitPreset') }}</p>
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
                      <span>{{ t('admin.newsBot.advancedSettings') }}</span>
                      <span class="text-xs text-subtle">{{
                        showTimezoneField ? t('admin.newsBot.advancedHide') : t('admin.newsBot.advancedShow')
                      }}</span>
                    </button>
                    <p class="mt-2 text-xs leading-6 text-muted">
                      {{ t('admin.newsBot.timezoneDefaultHint', { timezone: DEFAULT_TIMEZONE }) }}
                    </p>
                    <label v-if="showTimezoneField" class="mt-4 flex flex-col gap-2 text-sm font-medium text-ink">
                      timezone
                      <input
                        v-model="form.timezone"
                        name="timezone"
                        type="text"
                        maxlength="64"
                        class="rounded-ui border border-line px-4 py-3 text-sm text-ink shadow-sm transition outline-none focus:border-[color:var(--accent-strong)]"
                        :placeholder="t('admin.newsBot.timezonePlaceholder')"
                      />
                    </label>
                  </div>
                </div>

                <div class="ui-card">
                  <div>
                    <h3 class="text-sm font-semibold text-ink">{{ t('admin.newsBot.autoCreatePolicy') }}</h3>
                    <p class="mt-1 text-xs leading-6 text-muted">
                      {{ t('admin.newsBot.autoCreatePolicyHint') }}
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
                      {{ t('admin.newsBot.allowAutoCreateBoard') }}
                    </label>
                    <label class="flex items-center gap-3 text-sm font-medium text-ink">
                      <input
                        v-model="form.autoCreateCategory"
                        name="autoCreateCategory"
                        type="checkbox"
                        class="h-4 w-4 rounded border-line text-ink focus:ring-[color:var(--accent-ring)]"
                      />
                      {{ t('admin.newsBot.allowAutoCreateCategory') }}
                    </label>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    class="rounded-full bg-[color:var(--accent-strong)] px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-surface-soft dark:text-ink"
                    :disabled="isSaving"
                  >
                    {{ isSaving ? t('admin.newsBot.saveSubmitting') : isEditMode ? t('admin.newsBot.saveEdit') : t('admin.newsBot.saveCreate') }}
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-line px-6 py-2 text-sm font-semibold text-muted transition hover:border-line hover:text-ink dark:text-subtle"
                    @click="resetForm"
                  >
                    {{ t('admin.newsBot.resetForm') }}
                  </button>
                </div>
              </form>
            </section>

            <section v-if="lastRunResult" class="ui-panel p-5">
              <h2 class="text-lg font-semibold text-ink">{{ t('admin.newsBot.lastRunTitle') }}</h2>
              <div class="mt-4 grid gap-3 md:grid-cols-2">
                <div class="ui-stat-card">
                  <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">{{ t('admin.newsBot.executedAt') }}</p>
                  <p class="mt-2 text-sm font-semibold text-ink">{{ formatDateTime(lastRunResult.executedAt) }}</p>
                </div>
                <div class="ui-stat-card">
                  <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">{{ t('admin.newsBot.runStatus') }}</p>
                  <p class="mt-2 text-sm font-semibold text-ink">{{ lastRunResult.status }}</p>
                </div>
                <div class="ui-stat-card">
                  <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">{{ t('admin.newsBot.fetchedItems') }}</p>
                  <p class="mt-2 text-lg font-semibold text-ink">{{ lastRunResult.fetchedCount }}</p>
                </div>
                <div class="ui-stat-card">
                  <p class="text-xs font-semibold tracking-[0.12em] text-subtle uppercase dark:text-muted">
                    {{ t('admin.newsBot.createdUpdatedSkipped') }}
                  </p>
                  <p class="mt-2 text-sm font-semibold text-ink">
                    {{ lastRunResult.createdCount }} / {{ lastRunResult.updatedCount }} / {{ lastRunResult.skippedCount }}
                  </p>
                </div>
              </div>
              <p v-if="lastRunResult.errorMessage" class="mt-4 text-sm text-rose-600 dark:text-rose-300">
                {{ t('admin.newsBot.errorPrefix') }} {{ lastRunResult.errorMessage }}
              </p>
            </section>
          </div>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>
