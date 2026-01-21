<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { getAdminAuditLogs } from '../services/adminAuditLogs';
import type { AdminActionType, AdminAuditLogResponse, AdminTargetType } from '../services/adminAuditLogs';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

const isMobileMenuOpen = ref(false);
const page = ref(0);
const size = ref(10);
const totalPages = ref(0);
const logs = ref<AdminAuditLogResponse[]>([]);
const listError = ref('');
const isLoading = ref(false);

const actionFilter = ref<AdminActionType | 'ALL'>('ALL');
const targetFilter = ref<AdminTargetType | 'ALL'>('ALL');
const actorUserId = ref('');
const targetId = ref('');
const fromAt = ref('');
const toAt = ref('');
const selectedLog = ref<AdminAuditLogResponse | null>(null);

const actionOptions: Array<AdminActionType | 'ALL'> = ['ALL', 'REPORT_PROCESS', 'SANCTION_CREATE', 'SANCTION_REVOKE'];
const targetOptions: Array<AdminTargetType | 'ALL'> = ['ALL', 'REPORT', 'SANCTION', 'ARTICLE', 'COMMENT', 'USER', 'BOARD'];

const isMobileView = () => (typeof window !== 'undefined' ? window.innerWidth < 768 : false);

const toggleMenu = () => {
  if (isMobileView()) {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
    return;
  }
  setMenuCollapsed(!menuCollapsed.value);
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

const buildIso = (value: string) => {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
};

const loadLogs = async () => {
  listError.value = '';
  isLoading.value = true;
  try {
    const response = await getAdminAuditLogs({
      actionType: actionFilter.value === 'ALL' ? undefined : actionFilter.value,
      targetType: targetFilter.value === 'ALL' ? undefined : targetFilter.value,
      actorUserId: actorUserId.value ? Number(actorUserId.value) : undefined,
      targetId: targetId.value ? Number(targetId.value) : undefined,
      fromAt: buildIso(fromAt.value),
      toAt: buildIso(toAt.value),
      page: page.value,
      size: size.value,
    });
    logs.value = response.items;
    totalPages.value = response.totalPages;
    selectedLog.value = response.items[0] ?? null;
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '운영 로그를 불러오지 못했습니다.';
  } finally {
    isLoading.value = false;
  }
};

const applyFilters = async () => {
  page.value = 0;
  await loadLogs();
};

const resetFilters = async () => {
  actionFilter.value = 'ALL';
  targetFilter.value = 'ALL';
  actorUserId.value = '';
  targetId.value = '';
  fromAt.value = '';
  toAt.value = '';
  await applyFilters();
};

const movePage = async (delta: number) => {
  const next = page.value + delta;
  if (next < 0 || next >= totalPages.value) {
    return;
  }
  page.value = next;
  await loadLogs();
};

const selectLog = (log: AdminAuditLogResponse) => {
  selectedLog.value = log;
};

const filterSummary = computed(() => {
  const parts: string[] = [];
  if (actionFilter.value !== 'ALL') {
    parts.push(`액션 ${actionFilter.value}`);
  }
  if (targetFilter.value !== 'ALL') {
    parts.push(`대상 ${targetFilter.value}`);
  }
  if (actorUserId.value) {
    parts.push(`행위자 ${actorUserId.value}`);
  }
  if (targetId.value) {
    parts.push(`대상ID ${targetId.value}`);
  }
  if (fromAt.value || toAt.value) {
    parts.push(`기간 ${fromAt.value || '시작'} ~ ${toAt.value || '오늘'}`);
  }
  return parts.length ? parts.join(' · ') : '전체 로그';
});

const detailJsonPretty = computed(() => {
  if (!selectedLog.value?.detailJson) {
    return null;
  }
  try {
    const parsed = JSON.parse(selectedLog.value.detailJson);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return selectedLog.value.detailJson;
  }
});

watch([actionFilter, targetFilter], async () => {
  await applyFilters();
});

onMounted(async () => {
  await nextTick();
  await loadLogs();
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-6xl">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">운영 로그</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">관리자 활동 이력을 확인합니다.</p>
            </div>
          </div>

          <div class="mt-6 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
            <div class="flex flex-wrap items-center gap-3">
              <select
                v-model="actionFilter"
                class="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option v-for="option in actionOptions" :key="option" :value="option">
                  {{ option === 'ALL' ? '모든 액션' : option }}
                </option>
              </select>
              <select
                v-model="targetFilter"
                class="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option v-for="option in targetOptions" :key="option" :value="option">
                  {{ option === 'ALL' ? '모든 대상' : option }}
                </option>
              </select>
              <input
                v-model="actorUserId"
                type="number"
                class="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                placeholder="행위자 ID"
              />
              <input
                v-model="targetId"
                type="number"
                class="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                placeholder="대상 ID"
              />
              <input
                v-model="fromAt"
                type="datetime-local"
                class="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
              <input
                v-model="toAt"
                type="datetime-local"
                class="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
              <button
                type="button"
                class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
                @click="applyFilters"
              >
                적용
              </button>
              <button
                type="button"
                class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
                @click="resetFilters"
              >
                초기화
              </button>
            </div>
            <p class="mt-3 text-xs text-slate-400">{{ filterSummary }}</p>
          </div>

          <div
            v-if="listError"
            class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ listError }}
          </div>

          <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <section class="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">로그 목록</h2>
                <span class="text-xs text-slate-400">총 {{ logs.length }}건</span>
              </div>

              <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
                불러오는 중...
              </div>

              <div v-else class="mt-4 flex flex-col gap-3">
                <button
                  v-for="log in logs"
                  :key="log.id"
                  type="button"
                  class="rounded-2xl border px-4 py-3 text-left transition"
                  :class="[
                    selectedLog?.id === log.id
                      ? 'border-slate-300 bg-slate-50 shadow-sm dark:border-slate-600 dark:bg-slate-900'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900/50',
                  ]"
                  @click="selectLog(log)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <span>#{{ log.id }}</span>
                        <span class="text-xs text-slate-400">{{ log.actionType }} · {{ log.targetType }}</span>
                      </div>
                      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">행위자 {{ log.actorUserId }}</p>
                    </div>
                    <span class="text-xs text-slate-400">{{ formatDate(log.createdAt) }}</span>
                  </div>
                  <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">{{ log.summary }}</p>
                </button>

                <div
                  v-if="logs.length === 0"
                  class="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
                >
                  조건에 해당하는 로그가 없습니다.
                </div>
              </div>

              <div class="mt-4 flex items-center justify-between text-sm text-slate-500">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300"
                  :disabled="page === 0"
                  @click="movePage(-1)"
                >
                  이전
                </button>
                <span>{{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300"
                  :disabled="page + 1 >= totalPages"
                  @click="movePage(1)"
                >
                  다음
                </button>
              </div>
            </section>

            <section class="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Detail</p>
                  <h2 class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">로그 상세</h2>
                </div>
              </div>

              <div v-if="selectedLog" class="mt-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <div class="flex justify-between">
                  <span>로그 번호</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">#{{ selectedLog.id }}</span>
                </div>
                <div class="flex justify-between">
                  <span>행위자</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ selectedLog.actorUserId }}</span>
                </div>
                <div class="flex justify-between">
                  <span>액션</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ selectedLog.actionType }}</span>
                </div>
                <div class="flex justify-between">
                  <span>대상</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">
                    {{ selectedLog.targetType }} · {{ selectedLog.targetId ?? '-' }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span>게시판</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ selectedLog.boardId ?? '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span>시간</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ formatDate(selectedLog.createdAt) }}</span>
                </div>
                <div class="flex justify-between">
                  <span>요청 IP</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ selectedLog.ipAddress ?? '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span>User-Agent</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ selectedLog.userAgent ?? '-' }}</span>
                </div>
                <div
                  class="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  {{ selectedLog.summary }}
                </div>
                <div
                  v-if="detailJsonPretty"
                  class="rounded-2xl border border-slate-200/80 bg-slate-950 px-4 py-3 text-xs text-slate-100 dark:border-slate-800"
                >
                  <pre class="whitespace-pre-wrap">{{ detailJsonPretty }}</pre>
                </div>
              </div>

              <div
                v-else
                class="mt-10 rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
              >
                로그를 선택하세요.
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
