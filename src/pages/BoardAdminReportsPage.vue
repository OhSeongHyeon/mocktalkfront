<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { MODERATION_STATUS_OPTIONS, formatModerationStatusLabel, type ModerationStatusFilter } from '../features/admin/lib/reportModeration';
import BoardAdminNav from '../widgets/layout/BoardAdminNav.vue';
import { ApiError } from '../shared/lib/http/api';
import { getBoardBySlug } from '../entities/board';
import type { BoardDetailResponse, BoardMemberStatus } from '../entities/board';
import { getBoardReport, getBoardReports, processBoardReport } from '../features/admin/board';
import type { ReportDetailResponse, ReportListItemResponse, ReportStatus } from '../features/admin/board';
import { useAuthStore } from '../stores/auth';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import ReportModerationWorkspace from '../widgets/admin/ReportModerationWorkspace.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const route = useRoute();
const authStore = useAuthStore();
const { isAdmin } = storeToRefs(authStore);
const board = ref<BoardDetailResponse | null>(null);
const boardError = ref('');

const statusFilter = ref<ModerationStatusFilter>('ALL');
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

const isAllowedMember = (memberStatus: BoardMemberStatus | null) => memberStatus === 'OWNER' || memberStatus === 'MODERATOR';

const hasPermission = computed(() => isAdmin.value || (board.value ? isAllowedMember(board.value.memberStatus) : false));

const boardSlug = computed(() => String(route.params.slug ?? ''));
const boardName = computed(() => board.value?.boardName ?? '게시판');
const detailCards = computed(() => {
  if (!selectedReport.value) {
    return [];
  }
  return [
    {
      eyebrow: 'Target',
      title: `${selectedReport.value.targetType} · ${selectedReport.value.targetId}`,
    },
    {
      eyebrow: 'Reporter',
      title: `${selectedReport.value.reporterUserId} / ${selectedReport.value.targetUserId ?? '-'}`,
      description: `사유 ${selectedReport.value.reasonCode}`,
    },
  ];
});

const detailRows = computed(() => {
  if (!selectedReport.value) {
    return [];
  }
  return [
    { label: '신고 번호', value: `#${selectedReport.value.id}` },
    { label: '대상', value: `${selectedReport.value.targetType} · ${selectedReport.value.targetId}` },
    { label: '사유', value: selectedReport.value.reasonCode },
    { label: '신고자 / 대상자', value: `${selectedReport.value.reporterUserId} / ${selectedReport.value.targetUserId ?? '-'}` },
  ];
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
              <span class="text-xs text-muted">{{ statusFilter === 'ALL' ? '전체 상태' : `${formatModerationStatusLabel(statusFilter)} 상태` }}</span>
            </template>
            <template #actions>
              <label class="text-xs font-semibold tracking-[0.18em] text-subtle uppercase dark:text-muted">상태</label>
              <select v-model="statusFilter" class="ui-select min-w-[9rem]">
                <option v-for="option in MODERATION_STATUS_OPTIONS" :key="option" :value="option">
                  {{ option === 'ALL' ? '전체' : formatModerationStatusLabel(option) }}
                </option>
              </select>
            </template>
            <div class="grid gap-3 md:grid-cols-3">
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Board</p>
                <p class="bbs-row-title mt-2 text-sm">{{ boardName }}</p>
                <p class="mt-1 text-xs text-muted">게시판 전용 신고 큐입니다.</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Selected</p>
                <p class="bbs-row-title mt-2 text-sm">
                  {{ selectedReport ? `#${selectedReport.id}` : '미선택' }}
                </p>
                <p class="mt-1 text-xs text-muted">좌측 목록에서 신고를 선택하면 상세가 갱신됩니다.</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Action</p>
                <p class="bbs-row-title mt-2 text-sm">상태 변경 + 메모 기록</p>
                <p class="mt-1 text-xs text-muted">처리 메모는 운영 판단 근거로 남깁니다.</p>
              </div>
            </div>
          </PageHeader>

          <ReportModerationWorkspace
            :reports="reports"
            :selected-id="selectedId"
            :selected-report="selectedReport"
            :detail-cards="detailCards"
            :detail-rows="detailRows"
            :list-description="'게시판 내부 신고만 모아서 빠르게 검토합니다.'"
            :list-error="listError"
            :detail-error="detailError"
            :is-loading-list="isLoadingList"
            :is-loading-detail="isLoadingDetail"
            :is-processing="isProcessing"
            :page="page"
            :total-pages="totalPages"
            :process-status="processStatus"
            :process-note="processNote"
            @select-report="selectReport"
            @move-page="movePage"
            @update:process-status="processStatus = $event"
            @update:process-note="processNote = $event"
            @process="handleProcess"
          />
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>
