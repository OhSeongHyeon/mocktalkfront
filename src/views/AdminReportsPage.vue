<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { getAdminReport, getAdminReports, processAdminReport } from '../services/adminModeration';
import type { ReportDetailResponse, ReportListItemResponse, ReportStatus } from '../services/adminModeration';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

type StatusFilter = ReportStatus | 'ALL';

const isMobileMenuOpen = ref(false);
const statusFilter = ref<StatusFilter>('ALL');
const page = ref(0);
const size = ref(10);
const totalPages = ref(0);
const reports = ref<ReportListItemResponse[]>([]);
const selectedId = ref<number | null>(null);
const selectedReport = ref<ReportDetailResponse | null>(null);
const listError = ref('');
const detailError = ref('');
const isLoadingList = ref(false);
const isLoadingDetail = ref(false);
const isProcessing = ref(false);
const processStatus = ref<ReportStatus>('PENDING');
const processNote = ref('');

const statusOptions: StatusFilter[] = ['ALL', 'PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];

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

const selectedReportSnapshot = computed(() => {
  if (!selectedReport.value?.targetSnapshot) {
    return null;
  }
  try {
    const parsed = JSON.parse(selectedReport.value.targetSnapshot);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return selectedReport.value.targetSnapshot;
  }
});

const statusLabel = (status: ReportStatus) => {
  const labels: Record<ReportStatus, string> = {
    PENDING: '대기',
    IN_REVIEW: '검토',
    RESOLVED: '해결',
    REJECTED: '반려',
  };
  return labels[status] ?? status;
};

const statusBadgeClass = (status: ReportStatus) => {
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  if (status === 'PENDING') {
    return `${base} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200`;
  }
  if (status === 'IN_REVIEW') {
    return `${base} bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200`;
  }
  if (status === 'RESOLVED') {
    return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200`;
  }
  return `${base} bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200`;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

const loadReports = async () => {
  listError.value = '';
  isLoadingList.value = true;
  try {
    const response = await getAdminReports({
      status: statusFilter.value,
      page: page.value,
      size: size.value,
    });
    reports.value = response.items;
    totalPages.value = response.totalPages;
    const firstItem = response.items[0];
    if (firstItem && selectedId.value === null) {
      await selectReport(firstItem.id);
    }
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '신고 목록을 불러오지 못했습니다.';
  } finally {
    isLoadingList.value = false;
  }
};

const selectReport = async (reportId: number) => {
  selectedId.value = reportId;
  detailError.value = '';
  isLoadingDetail.value = true;
  try {
    const detail = await getAdminReport(reportId);
    selectedReport.value = detail;
    processStatus.value = detail.status;
    processNote.value = detail.processedNote ?? '';
  } catch (error) {
    detailError.value = error instanceof ApiError ? error.message : '신고 상세를 불러오지 못했습니다.';
  } finally {
    isLoadingDetail.value = false;
  }
};

const handleProcess = async () => {
  if (!selectedReport.value) {
    return;
  }
  isProcessing.value = true;
  try {
    const updated = await processAdminReport(selectedReport.value.id, {
      status: processStatus.value,
      processedNote: processNote.value.trim() || undefined,
    });
    selectedReport.value = updated;
    const updatedList = reports.value.map((item) =>
      item.id === updated.id ? { ...item, status: updated.status, processedAt: updated.processedAt } : item,
    );
    reports.value = updatedList;
  } catch (error) {
    detailError.value = error instanceof ApiError ? error.message : '신고 처리를 완료하지 못했습니다.';
  } finally {
    isProcessing.value = false;
  }
};

const movePage = async (delta: number) => {
  const next = page.value + delta;
  if (next < 0 || next >= totalPages.value) {
    return;
  }
  page.value = next;
  selectedId.value = null;
  await loadReports();
};

watch(statusFilter, async () => {
  page.value = 0;
  selectedId.value = null;
  await loadReports();
});

onMounted(async () => {
  await nextTick();
  await loadReports();
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
              <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">신고 관리</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">사이트 전체 신고를 빠르게 검토하고 처리하세요.</p>
            </div>
            <div class="flex items-center gap-3">
              <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">상태</label>
              <select
                v-model="statusFilter"
                class="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option v-for="option in statusOptions" :key="option" :value="option">
                  {{ option === 'ALL' ? '전체' : statusLabel(option) }}
                </option>
              </select>
            </div>
          </div>

          <div
            v-if="listError"
            class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ listError }}
          </div>

          <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <section class="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">신고 목록</h2>
                <span class="text-xs text-slate-400">총 {{ reports.length }}건</span>
              </div>

              <div v-if="isLoadingList" class="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
                불러오는 중...
              </div>

              <div v-else class="mt-4 flex flex-col gap-3">
                <button
                  v-for="item in reports"
                  :key="item.id"
                  type="button"
                  class="rounded-2xl border px-4 py-3 text-left transition"
                  :class="[
                    item.id === selectedId
                      ? 'border-slate-300 bg-slate-50 shadow-sm dark:border-slate-600 dark:bg-slate-900'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900/50',
                  ]"
                  @click="selectReport(item.id)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <span>#{{ item.id }}</span>
                        <span class="text-xs text-slate-400">{{ item.targetType }} · {{ item.targetId }}</span>
                      </div>
                      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">신고자 {{ item.reporterUserId }} · 사유 {{ item.reasonCode }}</p>
                    </div>
                    <span :class="statusBadgeClass(item.status)">{{ statusLabel(item.status) }}</span>
                  </div>
                  <div class="mt-2 text-xs text-slate-400">접수 {{ formatDate(item.createdAt) }}</div>
                </button>

                <div
                  v-if="reports.length === 0"
                  class="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
                >
                  현재 조건에 해당하는 신고가 없습니다.
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
                  <h2 class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">신고 상세</h2>
                </div>
                <div v-if="selectedReport" :class="statusBadgeClass(selectedReport.status)">
                  {{ statusLabel(selectedReport.status) }}
                </div>
              </div>

              <div
                v-if="detailError"
                class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
              >
                {{ detailError }}
              </div>

              <div v-if="isLoadingDetail" class="mt-6 text-sm text-slate-500">상세 정보를 불러오는 중...</div>

              <div v-else-if="selectedReport" class="mt-6 space-y-6">
                <div
                  class="grid gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                >
                  <div class="flex flex-wrap justify-between gap-3">
                    <span>신고 번호</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-100">#{{ selectedReport.id }}</span>
                  </div>
                  <div class="flex flex-wrap justify-between gap-3">
                    <span>대상</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-100">
                      {{ selectedReport.targetType }} · {{ selectedReport.targetId }}
                    </span>
                  </div>
                  <div class="flex flex-wrap justify-between gap-3">
                    <span>사유</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-100">{{ selectedReport.reasonCode }}</span>
                  </div>
                  <div class="flex flex-wrap justify-between gap-3">
                    <span>신고자 / 대상자</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-100">
                      {{ selectedReport.reporterUserId }} / {{ selectedReport.targetUserId ?? '-' }}
                    </span>
                  </div>
                  <div class="flex flex-wrap justify-between gap-3">
                    <span>게시판</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-100">{{ selectedReport.boardId ?? '-' }}</span>
                  </div>
                </div>

                <div>
                  <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">신고 상세</h3>
                  <p
                    class="mt-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                  >
                    {{ selectedReport.reasonDetail || '상세 사유가 없습니다.' }}
                  </p>
                </div>

                <div v-if="selectedReportSnapshot">
                  <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">대상 스냅샷</h3>
                  <pre
                    class="mt-2 max-h-64 overflow-auto rounded-2xl border border-slate-200/80 bg-slate-950 px-4 py-3 text-xs text-slate-100 dark:border-slate-800"
                    >{{ selectedReportSnapshot }}</pre
                  >
                </div>

                <div class="grid gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>접수 {{ formatDate(selectedReport.createdAt) }}</span>
                    <span>처리 {{ formatDate(selectedReport.processedAt) }}</span>
                  </div>
                  <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">처리 상태</label>
                  <select
                    v-model="processStatus"
                    class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <option v-for="option in statusOptions.filter((item) => item !== 'ALL')" :key="option" :value="option">
                      {{ statusLabel(option) }}
                    </option>
                  </select>
                  <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">처리 메모</label>
                  <textarea
                    v-model="processNote"
                    rows="4"
                    class="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    placeholder="처리 결과와 사유를 간단히 기록하세요."
                  ></textarea>
                  <button
                    type="button"
                    class="mt-2 inline-flex items-center justify-center rounded-2xl bg-[color:var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="isProcessing"
                    @click="handleProcess"
                  >
                    {{ isProcessing ? '처리 중...' : '처리 저장' }}
                  </button>
                </div>
              </div>

              <div
                v-else
                class="mt-10 rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
              >
                좌측에서 신고를 선택하세요.
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
