<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
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

type NewsBotFormState = {
  jobName: string;
  sourceType: NewsSourceType;
  hackerNewsStoryType: HackerNewsStoryType;
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

const jobs = ref<AdminNewsBotJobResponse[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const runningJobId = ref<number | null>(null);
const selectedJobId = ref<number | null>(null);
const listError = ref('');
const actionErrorMessage = ref('');
const actionSuccessMessage = ref('');
const lastRunResult = ref<AdminNewsBotJobRunResponse | null>(null);

const form = reactive<NewsBotFormState>({
  jobName: '',
  sourceType: 'DEV_TO',
  hackerNewsStoryType: 'topstories',
  devTag: '',
  devUsername: '',
  githubOwner: '',
  githubRepo: '',
  rssFeedUrl: '',
  targetBoardSlug: '',
  targetBoardName: '',
  targetCategoryName: '',
  collectIntervalMinutes: 60,
  fetchLimit: 20,
  autoCreateBoard: false,
  autoCreateCategory: true,
  timezone: 'Asia/Seoul',
});

const selectedJob = computed(() => jobs.value.find((job) => job.jobId === selectedJobId.value) ?? null);
const isEditMode = computed(() => selectedJob.value !== null);
const sourceTypeOptions: Array<{ value: NewsSourceType; label: string; description: string }> = [
  { value: 'DEV_TO', label: 'DEV API', description: 'tag 또는 username 기준 공개 글을 수집합니다.' },
  { value: 'HACKER_NEWS', label: 'Hacker News', description: 'top/new/best story 목록을 수집합니다.' },
  { value: 'GITHUB_RELEASES', label: 'GitHub Releases', description: '특정 저장소 최신 릴리스를 수집합니다.' },
  { value: 'RSS', label: 'RSS / Atom', description: '공식 피드 URL을 읽어 최신 글을 수집합니다.' },
];
const hackerNewsStoryTypeOptions: Array<{ value: HackerNewsStoryType; label: string }> = [
  { value: 'topstories', label: 'Top Stories' },
  { value: 'newstories', label: 'New Stories' },
  { value: 'beststories', label: 'Best Stories' },
];

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '없음';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('ko-KR');
};

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
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200';
};

const resolveErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  return fallback;
};

const buildSourceConfig = (): Record<string, unknown> => {
  if (form.sourceType === 'HACKER_NEWS') {
    return { storyType: form.hackerNewsStoryType };
  }
  if (form.sourceType === 'DEV_TO') {
    const sourceConfig: Record<string, unknown> = {};
    if (form.devTag.trim()) {
      sourceConfig.tag = form.devTag.trim();
    }
    if (form.devUsername.trim()) {
      sourceConfig.username = form.devUsername.trim();
    }
    return sourceConfig;
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
  if (!form.jobName.trim()) {
    return '잡 이름을 입력해주세요.';
  }
  if (!form.targetBoardSlug.trim()) {
    return '대상 게시판 slug를 입력해주세요.';
  }
  if (form.autoCreateBoard && !form.targetBoardName.trim()) {
    return '게시판 자동 생성을 사용하려면 대상 게시판 이름이 필요합니다.';
  }
  if (form.sourceType === 'DEV_TO' && !form.devTag.trim() && !form.devUsername.trim()) {
    return 'DEV API는 tag 또는 username 중 하나를 입력해야 합니다.';
  }
  if (form.sourceType === 'GITHUB_RELEASES' && (!form.githubOwner.trim() || !form.githubRepo.trim())) {
    return 'GitHub Releases는 owner와 repo가 모두 필요합니다.';
  }
  if (form.sourceType === 'RSS' && !form.rssFeedUrl.trim()) {
    return 'RSS/Atom 피드 URL을 입력해주세요.';
  }
  return null;
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
  form.jobName = '';
  form.sourceType = 'DEV_TO';
  form.hackerNewsStoryType = 'topstories';
  form.devTag = '';
  form.devUsername = '';
  form.githubOwner = '';
  form.githubRepo = '';
  form.rssFeedUrl = '';
  form.targetBoardSlug = '';
  form.targetBoardName = '';
  form.targetCategoryName = '';
  form.collectIntervalMinutes = 60;
  form.fetchLimit = 20;
  form.autoCreateBoard = false;
  form.autoCreateCategory = true;
  form.timezone = 'Asia/Seoul';
  selectedJobId.value = null;
};

const applyJobToForm = (job: AdminNewsBotJobResponse) => {
  form.jobName = job.jobName;
  form.sourceType = job.sourceType;
  form.hackerNewsStoryType = (job.sourceConfig.storyType as HackerNewsStoryType | undefined) ?? 'topstories';
  form.devTag = (job.sourceConfig.tag as string | undefined) ?? '';
  form.devUsername = (job.sourceConfig.username as string | undefined) ?? '';
  form.githubOwner = (job.sourceConfig.owner as string | undefined) ?? '';
  form.githubRepo = (job.sourceConfig.repo as string | undefined) ?? '';
  form.rssFeedUrl = (job.sourceConfig.feedUrl as string | undefined) ?? '';
  form.targetBoardSlug = job.targetBoardSlug;
  form.targetBoardName = job.targetBoardName ?? '';
  form.targetCategoryName = job.targetCategoryName ?? '';
  form.collectIntervalMinutes = job.collectIntervalMinutes;
  form.fetchLimit = job.fetchLimit;
  form.autoCreateBoard = job.autoCreateBoard;
  form.autoCreateCategory = job.autoCreateCategory;
  form.timezone = job.timezone;
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
  const validationMessage = validateForm();
  if (validationMessage) {
    actionErrorMessage.value = validationMessage;
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
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">뉴스봇 운영</h1>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">외부 공개 API/RSS를 주기적으로 수집해 게시판에 새소식을 자동 발행합니다.</p>
          </div>
          <RouterLink
            to="/admin"
            class="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
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
                <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">잡 목록</h2>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  `1 job = 1 board` 기준으로 운영하고, 게시판 자동 생성은 신중하게 켜는 편이 안전합니다.
                </p>
              </div>
              <button
                type="button"
                class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
                @click="resetForm"
              >
                새 잡 작성
              </button>
            </div>

            <div v-if="isLoading" class="mt-6 flex items-center gap-2 text-sm text-slate-500">
              <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
              불러오는 중...
            </div>

            <div v-else class="mt-6 flex flex-col gap-4">
              <button
                v-for="job in jobs"
                :key="job.jobId"
                type="button"
                class="rounded-3xl border p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-900/60"
                :class="
                  job.jobId === selectedJobId
                    ? 'border-slate-300 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-900/70'
                    : 'border-slate-200 dark:border-slate-800'
                "
                @click="selectJob(job)"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{{ job.jobName }}</h3>
                      <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="resolveStatusClass(job.lastStatus)">
                        {{ job.lastStatus }}
                      </span>
                      <span
                        class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        :class="
                          job.enabled
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200'
                        "
                      >
                        {{ job.enabled ? 'ON' : 'OFF' }}
                      </span>
                    </div>
                    <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {{ job.sourceType }} · /b/{{ job.targetBoardSlug }} · {{ job.collectIntervalMinutes }}분마다 · 최대 {{ job.fetchLimit }}건
                    </p>
                    <p class="mt-1 text-xs text-slate-400">다음 실행 {{ formatDateTime(job.nextRunAt) }}</p>
                    <p v-if="job.lastErrorMessage" class="mt-2 text-xs text-rose-500 dark:text-rose-300">최근 오류: {{ job.lastErrorMessage }}</p>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      class="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
                      @click.stop="toggleEnabled(job)"
                    >
                      {{ job.enabled ? '끄기' : '켜기' }}
                    </button>
                    <button
                      type="button"
                      class="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
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
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-400">{{ isEditMode ? 'Edit' : 'Create' }}</p>
                  <h2 class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {{ isEditMode ? '뉴스봇 잡 수정' : '뉴스봇 잡 생성' }}
                  </h2>
                </div>
                <span v-if="selectedJob" class="text-xs text-slate-400">ID {{ selectedJob.jobId }}</span>
              </div>

              <form class="mt-6 space-y-4" @submit.prevent="submitForm">
                <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  잡 이름
                  <input
                    v-model="form.jobName"
                    type="text"
                    maxlength="120"
                    class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="예: 백엔드 새소식"
                  />
                </label>

                <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  외부 소스
                  <select
                    v-model="form.sourceType"
                    class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option v-for="option in sourceTypeOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                <p class="text-xs text-slate-400">
                  {{ sourceTypeOptions.find((option) => option.value === form.sourceType)?.description }}
                </p>

                <div v-if="form.sourceType === 'HACKER_NEWS'" class="grid gap-4">
                  <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    storyType
                    <select
                      v-model="form.hackerNewsStoryType"
                      class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option v-for="option in hackerNewsStoryTypeOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                  </label>
                </div>

                <div v-if="form.sourceType === 'DEV_TO'" class="grid gap-4 md:grid-cols-2">
                  <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    tag
                    <input
                      v-model="form.devTag"
                      type="text"
                      class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="예: backend"
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    username
                    <input
                      v-model="form.devUsername"
                      type="text"
                      class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="예: ben"
                    />
                  </label>
                </div>

                <div v-if="form.sourceType === 'GITHUB_RELEASES'" class="grid gap-4 md:grid-cols-2">
                  <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    owner
                    <input
                      v-model="form.githubOwner"
                      type="text"
                      class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="예: spring-projects"
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    repo
                    <input
                      v-model="form.githubRepo"
                      type="text"
                      class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="예: spring-boot"
                    />
                  </label>
                </div>

                <div v-if="form.sourceType === 'RSS'" class="grid gap-4">
                  <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    feedUrl
                    <input
                      v-model="form.rssFeedUrl"
                      type="url"
                      class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="예: https://spring.io/blog.atom"
                    />
                  </label>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    대상 게시판 slug
                    <input
                      v-model="form.targetBoardSlug"
                      type="text"
                      maxlength="80"
                      class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="예: backend-news"
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    자동 생성용 게시판 이름
                    <input
                      v-model="form.targetBoardName"
                      type="text"
                      maxlength="255"
                      class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="예: 백엔드 새소식"
                    />
                  </label>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    기본 카테고리
                    <input
                      v-model="form.targetCategoryName"
                      type="text"
                      maxlength="48"
                      class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="예: DEV"
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    timezone
                    <input
                      v-model="form.timezone"
                      type="text"
                      maxlength="64"
                      class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="예: Asia/Seoul"
                    />
                  </label>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    수집 주기(분)
                    <input
                      v-model.number="form.collectIntervalMinutes"
                      type="number"
                      min="5"
                      max="10080"
                      class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                  <label class="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    1회 최대 수집 건수
                    <input
                      v-model.number="form.fetchLimit"
                      type="number"
                      min="1"
                      max="100"
                      class="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                </div>

                <div class="grid gap-3 rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <label class="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <input
                      v-model="form.autoCreateBoard"
                      type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    게시판 자동 생성 허용
                  </label>
                  <label class="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <input
                      v-model="form.autoCreateCategory"
                      type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    카테고리 자동 생성 허용
                  </label>
                  <p class="text-xs leading-6 text-slate-500 dark:text-slate-400">
                    외부 데이터가 게시판/카테고리를 무한히 퍼뜨리지 않도록 게시판 자동 생성은 기본적으로 꺼두는 편이 안전합니다.
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    class="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
                    :disabled="isSaving"
                  >
                    {{ isSaving ? '저장 중...' : isEditMode ? '잡 수정' : '잡 생성' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
                    @click="resetForm"
                  >
                    폼 초기화
                  </button>
                </div>
              </form>
            </section>

            <section v-if="lastRunResult" class="ui-panel p-5">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">최근 즉시 실행 결과</h2>
              <div class="mt-4 grid gap-3 md:grid-cols-2">
                <div class="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">실행 시각</p>
                  <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatDateTime(lastRunResult.executedAt) }}</p>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">상태</p>
                  <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ lastRunResult.status }}</p>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">가져온 항목</p>
                  <p class="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{{ lastRunResult.fetchedCount }}</p>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">생성/갱신/스킵</p>
                  <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
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
