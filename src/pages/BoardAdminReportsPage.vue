<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import BoardAdminNav from '../widgets/layout/BoardAdminNav.vue';
import { ApiError } from '../shared/lib/http/api';
import { getBoardBySlug } from '../entities/board';
import type { BoardDetailResponse, BoardMemberStatus } from '../entities/board';
import { getBoardReport, getBoardReports, processBoardReport } from '../features/admin/board';
import type { ReportDetailResponse, ReportListItemResponse, ReportStatus } from '../features/admin/board';
import { useAuthStore } from '../stores/auth';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import AppShell from '../widgets/layout/AppShell.vue';

type StatusFilter = ReportStatus | 'ALL';

const route = useRoute();
const authStore = useAuthStore();
const { isAdmin } = storeToRefs(authStore);
const board = ref<BoardDetailResponse | null>(null);
const boardError = ref('');

const statusFilter = ref<StatusFilter>('ALL');
const reports = ref<ReportListItemResponse[]>([]);
const selectedId = ref<number | null>(null);
const selectedReport = ref<ReportDetailResponse | null>(null);
const listError = ref('');
const detailError = ref('');
const isLoadingList = ref(false);
const isLoadingDetail = ref(false);
const isProcessing = ref(false);
const page = ref(0);
const size = ref(10);
const totalPages = ref(0);
const processStatus = ref<ReportStatus>('PENDING');
const processNote = ref('');

const statusOptions: StatusFilter[] = ['ALL', 'PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];

const isAllowedMember = (memberStatus: BoardMemberStatus | null) => memberStatus === 'OWNER' || memberStatus === 'MODERATOR';

const hasPermission = computed(() => isAdmin.value || (board.value ? isAllowedMember(board.value.memberStatus) : false));

const boardSlug = computed(() => String(route.params.slug ?? ''));
const boardName = computed(() => board.value?.boardName ?? '게시판');

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
  if (status === 'PENDING') {
    return 'ui-badge ui-badge-warning';
  }
  if (status === 'IN_REVIEW') {
    return 'ui-badge ui-badge-accent';
  }
  if (status === 'RESOLVED') {
    return 'ui-badge ui-badge-success';
  }
  return 'ui-badge ui-badge-danger';
};

const formatDate = (value: string | null) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
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

const loadBoard = async () => {
  boardError.value = '';
  try {
    board.value = await getBoardBySlug(boardSlug.value);
    if (!hasPermission.value) {
      boardError.value = '게시판 관리자 권한이 없습니다.';
    }
  } catch (error) {
    boardError.value = error instanceof ApiError ? error.message : '게시판 정보를 불러오지 못했습니다.';
  }
};

const loadReports = async () => {
  if (!board.value || !hasPermission.value) {
    return;
  }
  listError.value = '';
  isLoadingList.value = true;
  try {
    const response = await getBoardReports(board.value.id, {
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
  if (!board.value) {
    return;
  }
  selectedId.value = reportId;
  detailError.value = '';
  isLoadingDetail.value = true;
  try {
    const detail = await getBoardReport(board.value.id, reportId);
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
  if (!board.value || !selectedReport.value) {
    return;
  }
  isProcessing.value = true;
  try {
    const updated = await processBoardReport(board.value.id, selectedReport.value.id, {
      status: processStatus.value,
      processedNote: processNote.value.trim() || undefined,
    });
    selectedReport.value = updated;
    reports.value = reports.value.map((item) =>
      item.id === updated.id ? { ...item, status: updated.status, processedAt: updated.processedAt } : item,
    );
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
  await loadBoard();
  await loadReports();
});
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <div class="space-y-6">
        <BoardAdminNav v-if="board && hasPermission" :slug="board.slug" :board-name="boardName" active="reports" />

        <div v-if="boardError" class="ui-state ui-state-danger">
          {{ boardError }}
        </div>

        <div v-if="board && hasPermission" class="space-y-6">
          <PageHeader
            eyebrow="Board Reports"
            :title="`${boardName} 신고 관리`"
            description="해당 게시판에서 발생한 신고를 같은 운영 패턴으로 처리합니다."
          >
            <template #meta>
              <span class="ui-badge ui-badge-muted">현재 페이지 {{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
              <span class="ui-badge ui-badge-accent">표시 {{ reports.length }}건</span>
              <span class="text-xs text-slate-500 dark:text-slate-400">{{
                statusFilter === 'ALL' ? '전체 상태' : `${statusLabel(statusFilter)} 상태`
              }}</span>
            </template>
            <template #actions>
              <label class="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">상태</label>
              <select v-model="statusFilter" class="ui-select min-w-[9rem]">
                <option v-for="option in statusOptions" :key="option" :value="option">
                  {{ option === 'ALL' ? '전체' : statusLabel(option) }}
                </option>
              </select>
            </template>
            <div class="grid gap-3 md:grid-cols-3">
              <div class="ui-data-panel p-4">
                <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Board</p>
                <p class="mt-2 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">{{ boardName }}</p>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">게시판 전용 신고 큐입니다.</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Selected</p>
                <p class="mt-2 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {{ selectedReport ? `#${selectedReport.id}` : '미선택' }}
                </p>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">좌측 목록에서 신고를 선택하면 상세가 갱신됩니다.</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Action</p>
                <p class="mt-2 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">상태 변경 + 메모 기록</p>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">처리 메모는 운영 판단 근거로 남깁니다.</p>
              </div>
            </div>
          </PageHeader>

          <div v-if="listError" class="ui-state ui-state-danger">
            {{ listError }}
          </div>

          <div class="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <section class="ui-panel p-5">
              <div class="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800/80">
                <div>
                  <h2 class="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">신고 목록</h2>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">게시판 내부 신고만 모아서 빠르게 검토합니다.</p>
                </div>
                <span class="ui-badge ui-badge-muted">총 {{ reports.length }}건</span>
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
                  class="ui-list-row text-left"
                  :class="[item.id === selectedId ? 'border-[color:var(--line-strong)] bg-white/95 shadow-sm dark:bg-slate-900/80' : '']"
                  @click="selectReport(item.id)"
                >
                  <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span :class="statusBadgeClass(item.status)">{{ statusLabel(item.status) }}</span>
                        <span class="ui-badge ui-badge-muted">{{ item.targetType }}</span>
                        <span>대상 {{ item.targetId }}</span>
                      </div>
                      <div class="mt-2 flex flex-wrap items-center gap-2">
                        <span class="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">#{{ item.id }}</span>
                        <span class="truncate text-sm text-slate-600 dark:text-slate-300">사유 {{ item.reasonCode }}</span>
                      </div>
                      <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        신고자 {{ item.reporterUserId }} · 접수 {{ formatDate(item.createdAt) }}
                      </p>
                    </div>

                    <div class="text-xs text-slate-400 md:text-right">
                      <p>처리 {{ formatDate(item.processedAt) }}</p>
                    </div>
                  </div>
                </button>

                <div v-if="reports.length === 0" class="ui-state ui-state-empty px-4 py-10">현재 조건에 해당하는 신고가 없습니다.</div>
              </div>

              <div class="ui-toolbar mt-4 justify-between text-sm text-slate-500 dark:text-slate-400">
                <button type="button" class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-40" :disabled="page === 0" @click="movePage(-1)">
                  이전
                </button>
                <span>{{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
                <button
                  type="button"
                  class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-40"
                  :disabled="page + 1 >= totalPages"
                  @click="movePage(1)"
                >
                  다음
                </button>
              </div>
            </section>

            <section class="ui-panel p-5">
              <div class="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800/80">
                <div>
                  <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Detail</p>
                  <h2 class="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">신고 상세</h2>
                </div>
                <div v-if="selectedReport" :class="statusBadgeClass(selectedReport.status)">
                  {{ statusLabel(selectedReport.status) }}
                </div>
              </div>

              <div v-if="detailError" class="ui-state ui-state-danger mt-4">
                {{ detailError }}
              </div>

              <div v-if="isLoadingDetail" class="mt-6 text-sm text-slate-500">상세 정보를 불러오는 중...</div>

              <div v-else-if="selectedReport" class="mt-6 space-y-6">
                <div class="grid gap-3 md:grid-cols-2">
                  <div class="ui-data-panel p-4">
                    <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Target</p>
                    <p class="mt-2 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
                      {{ selectedReport.targetType }} · {{ selectedReport.targetId }}
                    </p>
                  </div>
                  <div class="ui-data-panel p-4">
                    <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Reporter</p>
                    <p class="mt-2 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">
                      {{ selectedReport.reporterUserId }} / {{ selectedReport.targetUserId ?? '-' }}
                    </p>
                    <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">사유 {{ selectedReport.reasonCode }}</p>
                  </div>
                </div>

                <div
                  class="grid gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                >
                  <div class="flex flex-wrap justify-between gap-3">
                    <span>신고 번호</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-100">#{{ selectedReport.id }}</span>
                  </div>
                  <div class="flex flex-wrap justify-between gap-3">
                    <span>대상</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-100"
                      >{{ selectedReport.targetType }} · {{ selectedReport.targetId }}</span
                    >
                  </div>
                  <div class="flex flex-wrap justify-between gap-3">
                    <span>사유</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-100">{{ selectedReport.reasonCode }}</span>
                  </div>
                  <div class="flex flex-wrap justify-between gap-3">
                    <span>신고자 / 대상자</span>
                    <span class="font-semibold text-slate-900 dark:text-slate-100"
                      >{{ selectedReport.reporterUserId }} / {{ selectedReport.targetUserId ?? '-' }}</span
                    >
                  </div>
                </div>

                <div>
                  <h3 class="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">신고 상세</h3>
                  <p
                    class="mt-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                  >
                    {{ selectedReport.reasonDetail || '상세 사유가 없습니다.' }}
                  </p>
                </div>

                <div v-if="selectedReportSnapshot">
                  <h3 class="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">대상 스냅샷</h3>
                  <pre
                    class="ui-scrollbar mt-2 max-h-64 overflow-auto rounded-2xl border border-slate-200/80 bg-slate-950 px-4 py-3 text-xs text-slate-100 dark:border-slate-800"
                    >{{ selectedReportSnapshot }}</pre
                  >
                </div>

                <div class="grid gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>접수 {{ formatDate(selectedReport.createdAt) }}</span>
                    <span>처리 {{ formatDate(selectedReport.processedAt) }}</span>
                  </div>
                  <label class="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">처리 상태</label>
                  <select v-model="processStatus" class="ui-select">
                    <option v-for="option in statusOptions.filter((item) => item !== 'ALL')" :key="option" :value="option">
                      {{ statusLabel(option) }}
                    </option>
                  </select>
                  <label class="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">처리 메모</label>
                  <textarea v-model="processNote" rows="4" class="ui-textarea" placeholder="처리 결과와 사유를 간단히 기록하세요."></textarea>
                  <button
                    type="button"
                    class="ui-button-accent mt-2 h-11 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="isProcessing"
                    @click="handleProcess"
                  >
                    {{ isProcessing ? '처리 중...' : '처리 저장' }}
                  </button>
                </div>
              </div>

              <div v-else class="ui-state ui-state-empty mt-10 px-6 py-10">좌측에서 신고를 선택하세요.</div>
            </section>
          </div>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>
