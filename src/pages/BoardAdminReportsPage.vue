<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
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
const { t } = useI18n();
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
const boardName = computed(() => board.value?.boardName ?? t('admin.common.defaultBoardName'));
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
      description: t('admin.moderation.cardReason', { reasonCode: selectedReport.value.reasonCode }),
    },
  ];
});

const detailRows = computed(() => {
  if (!selectedReport.value) {
    return [];
  }
  return [
    { label: t('admin.moderation.detailRowReportId'), value: `#${selectedReport.value.id}` },
    { label: t('admin.moderation.detailRowTarget'), value: `${selectedReport.value.targetType} · ${selectedReport.value.targetId}` },
    { label: t('admin.moderation.detailRowReason'), value: selectedReport.value.reasonCode },
    {
      label: t('admin.moderation.detailRowUsers'),
      value: `${selectedReport.value.reporterUserId} / ${selectedReport.value.targetUserId ?? '-'}`,
    },
  ];
});

const loadBoard = async () => {
  boardError.value = '';
  try {
    board.value = await getBoardBySlug(boardSlug.value);
    if (!hasPermission.value) {
      boardError.value = t('admin.common.noBoardAdmin');
    }
  } catch (error) {
    boardError.value = error instanceof ApiError ? error.message : t('admin.common.loadBoardFailed');
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
    listError.value = error instanceof ApiError ? error.message : t('admin.moderation.reports.errors.loadList');
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
    detailError.value = error instanceof ApiError ? error.message : t('admin.moderation.reports.errors.loadDetail');
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
    detailError.value = error instanceof ApiError ? error.message : t('admin.moderation.reports.errors.process');
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
            :title="t('admin.moderation.boardReports.title', { boardName })"
            :description="t('admin.moderation.boardReports.description')"
          >
            <template #meta>
              <span class="ui-badge ui-badge-muted">{{ t('admin.common.currentPage', { current: page + 1, total: Math.max(totalPages, 1) }) }}</span>
              <span class="ui-badge ui-badge-accent">{{ t('admin.common.displayCount', { count: reports.length }) }}</span>
              <span class="text-xs text-muted">{{
                statusFilter === 'ALL'
                  ? t('admin.common.statusAll')
                  : t('admin.common.statusFilter', { status: formatModerationStatusLabel(statusFilter) })
              }}</span>
            </template>
            <template #actions>
              <label class="text-xs font-semibold tracking-[0.18em] text-subtle uppercase dark:text-muted">{{ t('admin.common.statusLabel') }}</label>
              <select v-model="statusFilter" class="ui-select min-w-[9rem]">
                <option v-for="option in MODERATION_STATUS_OPTIONS" :key="option" :value="option">
                  {{ option === 'ALL' ? t('admin.common.all') : formatModerationStatusLabel(option) }}
                </option>
              </select>
            </template>
            <div class="grid gap-3 md:grid-cols-3">
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Board</p>
                <p class="bbs-row-title mt-2 text-sm">{{ boardName }}</p>
                <p class="mt-1 text-xs text-muted">{{ t('admin.moderation.boardReports.queueHint') }}</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Selected</p>
                <p class="bbs-row-title mt-2 text-sm">
                  {{ selectedReport ? `#${selectedReport.id}` : t('admin.common.notSelected') }}
                </p>
                <p class="mt-1 text-xs text-muted">{{ t('admin.common.listSelectReportHint') }}</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Action</p>
                <p class="bbs-row-title mt-2 text-sm">{{ t('admin.common.statusChangeMemo') }}</p>
                <p class="mt-1 text-xs text-muted">{{ t('admin.common.memoBoardHint') }}</p>
              </div>
            </div>
          </PageHeader>

          <ReportModerationWorkspace
            :reports="reports"
            :selected-id="selectedId"
            :selected-report="selectedReport"
            :detail-cards="detailCards"
            :detail-rows="detailRows"
            :list-description="t('admin.moderation.boardReports.listDescription')"
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
