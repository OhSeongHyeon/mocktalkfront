<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  MODERATION_STATUS_OPTIONS,
  formatModerationStatusLabel,
  parseModerationTargetSnapshot,
  resolveModerationStatusBadgeClass,
  type ModerationReportStatus,
} from '../../features/admin/lib/reportModeration';
import { formatKoreanDateTime } from '../../shared/lib/date';

const { t } = useI18n();

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
    listEmptyMessage: '',
    detailEmptyMessage: '',
  },
);

const resolvedListEmptyMessage = computed(() => props.listEmptyMessage || t('admin.moderation.listEmpty'));
const resolvedDetailEmptyMessage = computed(() => props.detailEmptyMessage || t('admin.moderation.detailEmpty'));

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
      <div class="flex items-center justify-between gap-3 border border-b border-line bg-surface-soft pb-3 dark:border-line">
        <div>
          <h2 class="bbs-row-title text-lg">{{ t('admin.moderation.listTitle') }}</h2>
          <p class="mt-1 text-sm text-muted">{{ listDescription }}</p>
        </div>
        <span class="ui-badge ui-badge-muted">{{ t('admin.common.totalCount', { count: reports.length }) }}</span>
      </div>

      <div v-if="listError" class="ui-state ui-state-danger mt-4">
        {{ listError }}
      </div>

      <div v-if="isLoadingList" class="mt-4 flex items-center gap-2 text-sm text-muted">
        <span class="h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)] dark:bg-surface-2"></span>
        {{ t('common.loading') }}
      </div>

      <div v-else class="mt-4 flex flex-col gap-3">
        <button
          v-for="item in reports"
          :key="item.id"
          :data-testid="`report-row-${item.id}`"
          type="button"
          class="ui-list-row text-left"
          :class="[item.id === selectedId ? 'border-[color:var(--line-strong)] bg-surface shadow-sm' : '']"
          @click="handleSelectReport(item.id)"
        >
          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span :class="resolveModerationStatusBadgeClass(item.status)">{{ formatModerationStatusLabel(item.status) }}</span>
                <span class="ui-badge ui-badge-muted">{{ item.targetType }}</span>
                <span>{{ t('admin.common.target') }} {{ item.targetId }}</span>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span class="bbs-row-title text-sm">#{{ item.id }}</span>
                <span class="truncate text-sm text-muted">{{ t('admin.common.reason') }} {{ item.reasonCode }}</span>
              </div>
              <p class="mt-2 text-xs text-muted">
                {{
                  t('admin.moderation.reporterLine', {
                    reporterId: item.reporterUserId,
                    receivedAt: formatKoreanDateTime(item.createdAt, item.createdAt),
                  })
                }}
              </p>
            </div>

            <div class="text-xs text-subtle md:text-right">
              <p>{{ t('admin.common.processed') }} {{ formatKoreanDateTime(item.processedAt) }}</p>
            </div>
          </div>
        </button>

        <div v-if="reports.length === 0" class="ui-state ui-state-empty px-4 py-10">{{ resolvedListEmptyMessage }}</div>
      </div>

      <div class="ui-toolbar mt-4 justify-between text-sm text-muted">
        <button
          data-testid="report-previous"
          type="button"
          class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-40"
          :disabled="page === 0"
          @click="handleMovePage(-1)"
        >
          {{ t('common.previous') }}
        </button>
        <span>{{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
        <button
          data-testid="report-next"
          type="button"
          class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-40"
          :disabled="page + 1 >= totalPages"
          @click="handleMovePage(1)"
        >
          {{ t('common.next') }}
        </button>
      </div>
    </section>

    <section class="ui-panel p-5">
      <div class="flex items-center justify-between gap-3 border border-b border-line bg-surface-soft pb-3 dark:border-line">
        <div>
          <p class="ui-eyebrow">Detail</p>
          <h2 class="bbs-row-title mt-1 text-lg">{{ t('admin.moderation.detailTitle') }}</h2>
        </div>
        <div v-if="selectedReport" :class="resolveModerationStatusBadgeClass(selectedReport.status)">
          {{ formatModerationStatusLabel(selectedReport.status) }}
        </div>
      </div>

      <div v-if="detailError" class="ui-state ui-state-danger mt-4">
        {{ detailError }}
      </div>

      <div v-if="isLoadingDetail" class="mt-6 text-sm text-muted">{{ t('admin.common.loadingDetail') }}</div>

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

        <div v-if="detailRows.length > 0" class="ui-card grid gap-4 p-4 text-sm text-muted dark:border-line dark:text-subtle">
          <div v-for="row in detailRows" :key="row.label" class="flex flex-wrap justify-between gap-3">
            <span>{{ row.label }}</span>
            <span class="font-semibold text-ink">{{ row.value ?? '-' }}</span>
          </div>
        </div>

        <div>
          <h3 class="bbs-row-title text-sm">{{ t('admin.moderation.detailSection') }}</h3>
          <p class="ui-card mt-2 text-sm leading-6 text-muted">
            {{ selectedReport.reasonDetail || t('admin.moderation.noReasonDetail') }}
          </p>
        </div>

        <div v-if="selectedReportSnapshot">
          <h3 class="bbs-row-title text-sm">{{ t('admin.moderation.snapshotTitle') }}</h3>
          <pre class="ui-code-block ui-scrollbar mt-2 max-h-64 rounded-ui">{{ selectedReportSnapshot }}</pre>
        </div>

        <div class="ui-card grid gap-4">
          <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
            <span>{{ t('admin.common.received') }} {{ formatKoreanDateTime(selectedReport.createdAt, selectedReport.createdAt) }}</span>
            <span>{{ t('admin.common.processed') }} {{ formatKoreanDateTime(selectedReport.processedAt) }}</span>
          </div>
          <label class="text-xs font-semibold tracking-[0.2em] text-subtle uppercase">{{ t('admin.moderation.processStatus') }}</label>
          <select v-model="processStatusModel" class="ui-select">
            <option v-for="option in MODERATION_STATUS_OPTIONS.filter((item) => item !== 'ALL')" :key="option" :value="option">
              {{ formatModerationStatusLabel(option) }}
            </option>
          </select>
          <label class="text-xs font-semibold tracking-[0.2em] text-subtle uppercase">{{ t('admin.moderation.processNote') }}</label>
          <textarea v-model="processNoteModel" rows="4" class="ui-textarea" :placeholder="t('admin.common.processNotePlaceholder')"></textarea>
          <button
            data-testid="report-process"
            type="button"
            class="ui-button-accent mt-2 h-11 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isProcessing"
            @click="handleProcess"
          >
            {{ isProcessing ? t('admin.common.processing') : t('admin.common.saveProcess') }}
          </button>
        </div>
      </div>

      <div v-else class="ui-state ui-state-empty mt-10 px-6 py-10">{{ resolvedDetailEmptyMessage }}</div>
    </section>
  </div>
</template>
