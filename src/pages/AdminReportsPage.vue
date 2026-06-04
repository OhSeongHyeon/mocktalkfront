<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { MODERATION_STATUS_OPTIONS, formatModerationStatusLabel, type ModerationStatusFilter } from '../features/admin/lib/reportModeration';
import { ApiError } from '../shared/lib/http/api';
import { getAdminReport, getAdminReports, processAdminReport } from '../features/admin/system';
import type { ReportDetailResponse, ReportListItemResponse, ReportStatus } from '../features/admin/system';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import ReportModerationWorkspace from '../widgets/admin/ReportModerationWorkspace.vue';
import AppShell from '../widgets/layout/AppShell.vue';

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
      description: `게시판 ${selectedReport.value.boardId ?? '-'}`,
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
    { label: '게시판', value: selectedReport.value.boardId ?? '-' },
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
  <AppShell>
    <PageContainer width="wide">
      <div class="space-y-6">
        <PageHeader eyebrow="Admin Reports" title="신고 관리" description="사이트 전체 신고를 빠르게 검토하고 상태를 갱신합니다.">
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
              <p class="ui-eyebrow">Queue</p>
              <p class="bbs-row-title mt-2 text-2xl">{{ reports.length }}</p>
              <p class="mt-1 text-xs text-muted">현재 페이지에서 확인 중인 신고 건수</p>
            </div>
            <div class="ui-data-panel p-4">
              <p class="ui-eyebrow">Selected</p>
              <p class="bbs-row-title mt-2 text-sm">
                {{ selectedReport ? `#${selectedReport.id}` : '미선택' }}
              </p>
              <p class="mt-1 text-xs text-muted">좌측 목록에서 대상을 선택해 상세를 열 수 있습니다.</p>
            </div>
            <div class="ui-data-panel p-4">
              <p class="ui-eyebrow">Action</p>
              <p class="bbs-row-title mt-2 text-sm">상태 변경 + 메모 기록</p>
              <p class="mt-1 text-xs text-muted">처리 메모는 운영 로그 추적 기준으로 활용됩니다.</p>
            </div>
          </div>
        </PageHeader>

        <ReportModerationWorkspace
          :reports="reports"
          :selected-id="selectedId"
          :selected-report="selectedReport"
          :detail-cards="detailCards"
          :detail-rows="detailRows"
          :list-description="'접수 순서대로 빠르게 훑고 필요한 항목만 선택합니다.'"
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
