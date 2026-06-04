<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { MODERATION_STATUS_OPTIONS, formatModerationStatusLabel, type ModerationStatusFilter } from '../features/admin/lib/reportModeration';
import { ApiError } from '../shared/lib/http/api';
import { getAdminReport, getAdminReports, processAdminReport } from '../features/admin/system';
import type { ReportDetailResponse, ReportListItemResponse, ReportStatus } from '../features/admin/system';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import ReportModerationWorkspace from '../widgets/admin/ReportModerationWorkspace.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const { t } = useI18n();

const statusFilter = ref<ModerationStatusFilter>('ALL');
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

const detailCards = computed(() => {
  if (!selectedReport.value) {
    return [];
  }
  return [
    {
      eyebrow: 'Target',
      title: `${selectedReport.value.targetType} · ${selectedReport.value.targetId}`,
      description: t('admin.moderation.cardBoard', { boardId: selectedReport.value.boardId ?? '-' }),
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
    { label: t('admin.moderation.detailRowBoard'), value: selectedReport.value.boardId ?? '-' },
  ];
});

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
    listError.value = error instanceof ApiError ? error.message : t('admin.moderation.reports.errors.loadList');
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
    detailError.value = error instanceof ApiError ? error.message : t('admin.moderation.reports.errors.loadDetail');
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
  await loadReports();
});
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <div class="space-y-6">
        <PageHeader eyebrow="Admin Reports" :title="t('admin.moderation.reports.title')" :description="t('admin.moderation.reports.description')">
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
              <p class="ui-eyebrow">Queue</p>
              <p class="bbs-row-title mt-2 text-2xl">{{ reports.length }}</p>
              <p class="mt-1 text-xs text-muted">{{ t('admin.common.queuePageCount') }}</p>
            </div>
            <div class="ui-data-panel p-4">
              <p class="ui-eyebrow">Selected</p>
              <p class="bbs-row-title mt-2 text-sm">
                {{ selectedReport ? `#${selectedReport.id}` : t('admin.common.notSelected') }}
              </p>
              <p class="mt-1 text-xs text-muted">{{ t('admin.common.listSelectHint') }}</p>
            </div>
            <div class="ui-data-panel p-4">
              <p class="ui-eyebrow">Action</p>
              <p class="bbs-row-title mt-2 text-sm">{{ t('admin.common.statusChangeMemo') }}</p>
              <p class="mt-1 text-xs text-muted">{{ t('admin.common.memoAuditHint') }}</p>
            </div>
          </div>
        </PageHeader>

        <ReportModerationWorkspace
          :reports="reports"
          :selected-id="selectedId"
          :selected-report="selectedReport"
          :detail-cards="detailCards"
          :detail-rows="detailRows"
          :list-description="t('admin.moderation.reports.listDescription')"
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
    </PageContainer>
  </AppShell>
</template>
