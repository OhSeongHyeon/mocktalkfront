<script setup lang="ts">
import { computed } from 'vue';

import {
  MODERATION_STATUS_OPTIONS,
  formatModerationStatusLabel,
  parseModerationTargetSnapshot,
  resolveModerationStatusBadgeClass,
  type ModerationReportStatus,
} from '../../features/admin/lib/reportModeration';
import { formatKoreanDateTime } from '../../shared/lib/date';

interface ModerationSummaryCard {
  eyebrow: string;
  title: string;
  description?: string;
}

interface ModerationDetailRow {
  label: string;
  value: string | number | null | undefined;
}

interface ModerationReportListItem {
  id: number;
  status: ModerationReportStatus;
  targetType: string;
  targetId: number;
  reasonCode: string;
  reporterUserId: number;
  processedAt: string | null;
  createdAt: string;
}

interface ModerationReportDetail extends ModerationReportListItem {
  targetUserId: number | null;
  reasonDetail: string | null;
  targetSnapshot: string | null;
  processedNote: string | null;
}

const props = withDefaults(
  defineProps<{
    reports: ModerationReportListItem[];
    selectedId: number | null;
    selectedReport: ModerationReportDetail | null;
    detailCards: ModerationSummaryCard[];
    detailRows: ModerationDetailRow[];
    listDescription: string;
    listError?: string;
    detailError?: string;
    isLoadingList?: boolean;
    isLoadingDetail?: boolean;
    isProcessing?: boolean;
    page: number;
    totalPages: number;
    processStatus: ModerationReportStatus;
    processNote: string;
    listEmptyMessage?: string;
    detailEmptyMessage?: string;
  }>(),
  {
    listError: '',
    detailError: '',
    isLoadingList: false,
    isLoadingDetail: false,
    isProcessing: false,
    listEmptyMessage: '현재 조건에 해당하는 신고가 없습니다.',
    detailEmptyMessage: '좌측에서 신고를 선택하세요.',
  },
);

const emit = defineEmits<{
  (event: 'select-report', reportId: number): void;
  (event: 'move-page', delta: number): void;
  (event: 'update:processStatus', value: ModerationReportStatus): void;
  (event: 'update:processNote', value: string): void;
  (event: 'process'): void;
}>();

const selectedReportSnapshot = computed(() => parseModerationTargetSnapshot(props.selectedReport?.targetSnapshot ?? null));

const processStatusModel = computed({
  get: () => props.processStatus,
  set: (value: ModerationReportStatus) => emit('update:processStatus', value),
});

const processNoteModel = computed({
  get: () => props.processNote,
  set: (value: string) => emit('update:processNote', value),
});

const handleMovePage = (delta: number) => {
  emit('move-page', delta);
};

const handleSelectReport = (reportId: number) => {
  emit('select-report', reportId);
};

const handleProcess = () => {
  emit('process');
};
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
    <section class="ui-panel p-5">
      <div class="bg-surface-soft flex items-center justify-between gap-3 border border-b border-line pb-3 dark:border-line">
        <div>
          <h2 class="bbs-row-title text-lg">신고 목록</h2>
          <p class="mt-1 text-sm text-muted">{{ listDescription }}</p>
        </div>
        <span class="ui-badge ui-badge-muted">총 {{ reports.length }}건</span>
      </div>

      <div v-if="listError" class="ui-state ui-state-danger mt-4">
        {{ listError }}
      </div>

      <div v-if="isLoadingList" class="mt-4 flex items-center gap-2 text-sm text-muted">
        <span class="dark:bg-surface-soft0 h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)]"></span>
        불러오는 중...
      </div>

      <div v-else class="mt-4 flex flex-col gap-3">
        <button
          v-for="item in reports"
          :key="item.id"
          :data-testid="`report-row-${item.id}`"
          type="button"
          class="ui-list-row text-left"
          :class="[item.id === selectedId ? '/80 border-[color:var(--line-strong)] bg-white/95 shadow-sm' : '']"
          @click="handleSelectReport(item.id)"
        >
          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span :class="resolveModerationStatusBadgeClass(item.status)">{{ formatModerationStatusLabel(item.status) }}</span>
                <span class="ui-badge ui-badge-muted">{{ item.targetType }}</span>
                <span>대상 {{ item.targetId }}</span>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span class="bbs-row-title text-sm">#{{ item.id }}</span>
                <span class="truncate text-sm text-muted">사유 {{ item.reasonCode }}</span>
              </div>
              <p class="mt-2 text-xs text-muted">
                신고자 {{ item.reporterUserId }} · 접수 {{ formatKoreanDateTime(item.createdAt, item.createdAt) }}
              </p>
            </div>

            <div class="text-xs text-subtle md:text-right">
              <p>처리 {{ formatKoreanDateTime(item.processedAt) }}</p>
            </div>
          </div>
        </button>

        <div v-if="reports.length === 0" class="ui-state ui-state-empty px-4 py-10">{{ listEmptyMessage }}</div>
      </div>

      <div class="ui-toolbar mt-4 justify-between text-sm text-muted">
        <button
          data-testid="report-previous"
          type="button"
          class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-40"
          :disabled="page === 0"
          @click="handleMovePage(-1)"
        >
          이전
        </button>
        <span>{{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
        <button
          data-testid="report-next"
          type="button"
          class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-40"
          :disabled="page + 1 >= totalPages"
          @click="handleMovePage(1)"
        >
          다음
        </button>
      </div>
    </section>

    <section class="ui-panel p-5">
      <div class="bg-surface-soft flex items-center justify-between gap-3 border border-b border-line pb-3 dark:border-line">
        <div>
          <p class="ui-eyebrow">Detail</p>
          <h2 class="bbs-row-title mt-1 text-lg">신고 상세</h2>
        </div>
        <div v-if="selectedReport" :class="resolveModerationStatusBadgeClass(selectedReport.status)">
          {{ formatModerationStatusLabel(selectedReport.status) }}
        </div>
      </div>

      <div v-if="detailError" class="ui-state ui-state-danger mt-4">
        {{ detailError }}
      </div>

      <div v-if="isLoadingDetail" class="mt-6 text-sm text-muted">상세 정보를 불러오는 중...</div>

      <div v-else-if="selectedReport" class="mt-6 space-y-6">
        <div v-if="detailCards.length > 0" class="grid gap-3 md:grid-cols-2">
          <div v-for="card in detailCards" :key="card.eyebrow" class="ui-data-panel p-4">
            <p class="ui-eyebrow">
              {{ card.eyebrow }}
            </p>
            <p class="bbs-row-title mt-2 text-sm">
              {{ card.title }}
            </p>
            <p v-if="card.description" class="mt-2 text-xs text-muted">{{ card.description }}</p>
          </div>
        </div>

        <div
          v-if="detailRows.length > 0"
          class="bg-surface-soft bg-surface-soft/80 grid gap-4 rounded-2xl border border-line p-4 text-sm text-muted dark:border-line dark:text-subtle"
        >
          <div v-for="row in detailRows" :key="row.label" class="flex flex-wrap justify-between gap-3">
            <span>{{ row.label }}</span>
            <span class="font-semibold text-ink">{{ row.value ?? '-' }}</span>
          </div>
        </div>

        <div>
          <h3 class="bbs-row-title text-sm">신고 상세</h3>
          <p
            class="bg-surface-soft mt-2 rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm leading-6 text-muted dark:border-line dark:text-subtle"
          >
            {{ selectedReport.reasonDetail || '상세 사유가 없습니다.' }}
          </p>
        </div>

        <div v-if="selectedReportSnapshot">
          <h3 class="bbs-row-title text-sm">대상 스냅샷</h3>
          <pre
            class="ui-scrollbar bg-surface-soft bg-surface-strong mt-2 max-h-64 overflow-auto rounded-2xl border border-line px-4 py-3 text-xs text-[color:var(--surface-0)] dark:border-line"
            >{{ selectedReportSnapshot }}</pre
          >
        </div>

        <div class="bg-surface-soft grid gap-4 rounded-2xl border border-line bg-white/80 p-4 dark:border-line">
          <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
            <span>접수 {{ formatKoreanDateTime(selectedReport.createdAt, selectedReport.createdAt) }}</span>
            <span>처리 {{ formatKoreanDateTime(selectedReport.processedAt) }}</span>
          </div>
          <label class="text-xs font-semibold tracking-[0.2em] text-subtle uppercase">처리 상태</label>
          <select v-model="processStatusModel" class="ui-select">
            <option v-for="option in MODERATION_STATUS_OPTIONS.filter((item) => item !== 'ALL')" :key="option" :value="option">
              {{ formatModerationStatusLabel(option) }}
            </option>
          </select>
          <label class="text-xs font-semibold tracking-[0.2em] text-subtle uppercase">처리 메모</label>
          <textarea v-model="processNoteModel" rows="4" class="ui-textarea" placeholder="처리 결과와 사유를 간단히 기록하세요."></textarea>
          <button
            data-testid="report-process"
            type="button"
            class="ui-button-accent mt-2 h-11 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isProcessing"
            @click="handleProcess"
          >
            {{ isProcessing ? '처리 중...' : '처리 저장' }}
          </button>
        </div>
      </div>

      <div v-else class="ui-state ui-state-empty mt-10 px-6 py-10">{{ detailEmptyMessage }}</div>
    </section>
  </div>
</template>
