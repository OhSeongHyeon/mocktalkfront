<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { ApiError } from '../shared/lib/http/api';
import { getAdminAuditLogs } from '../features/admin/system';
import type { AdminActionType, AdminAuditLogResponse, AdminTargetType } from '../features/admin/system';
import PageContainer from '../shared/ui/PageContainer.vue';
import AppShell from '../widgets/layout/AppShell.vue';

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
  <AppShell>
    <PageContainer width="wide">
      <div>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="ui-heading-page text-2xl">운영 로그</h1>
            <p class="text-sm text-muted">관리자 활동 이력을 확인합니다.</p>
          </div>
        </div>

        <div class="ui-panel mt-6 p-4">
          <div class="flex flex-wrap items-center gap-3">
            <select
              v-model="actionFilter"
              class="h-10 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink shadow-sm transition focus:border-[color:var(--accent-strong)] focus:outline-none"
            >
              <option v-for="option in actionOptions" :key="option" :value="option">
                {{ option === 'ALL' ? '모든 액션' : option }}
              </option>
            </select>
            <select
              v-model="targetFilter"
              class="h-10 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink shadow-sm transition focus:border-[color:var(--accent-strong)] focus:outline-none"
            >
              <option v-for="option in targetOptions" :key="option" :value="option">
                {{ option === 'ALL' ? '모든 대상' : option }}
              </option>
            </select>
            <input
              v-model="actorUserId"
              type="number"
              class="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink shadow-sm focus:border-[color:var(--accent-strong)] focus:outline-none"
              placeholder="행위자 ID"
            />
            <input
              v-model="targetId"
              type="number"
              class="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink shadow-sm focus:border-[color:var(--accent-strong)] focus:outline-none"
              placeholder="대상 ID"
            />
            <input
              v-model="fromAt"
              type="datetime-local"
              class="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink shadow-sm focus:border-[color:var(--accent-strong)] focus:outline-none"
            />
            <input
              v-model="toAt"
              type="datetime-local"
              class="h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink shadow-sm focus:border-[color:var(--accent-strong)] focus:outline-none"
            />
            <button
              type="button"
              class="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:text-subtle"
              @click="applyFilters"
            >
              적용
            </button>
            <button
              type="button"
              class="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:text-subtle"
              @click="resetFilters"
            >
              초기화
            </button>
          </div>
          <p class="mt-3 text-xs text-subtle">{{ filterSummary }}</p>
        </div>

        <div v-if="listError" class="ui-state ui-state-danger mt-6">
          {{ listError }}
        </div>

        <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section class="ui-panel p-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-ink">로그 목록</h2>
              <span class="text-xs text-subtle">총 {{ logs.length }}건</span>
            </div>

            <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-muted">
              <span class="h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)] dark:bg-surface-2"></span>
              불러오는 중...
            </div>

            <div v-else class="mt-4 flex flex-col gap-3">
              <button
                v-for="log in logs"
                :key="log.id"
                type="button"
                class="rounded-ui border px-4 py-3 text-left transition"
                :class="[
                  selectedLog?.id === log.id
                    ? 'border-line bg-surface-soft shadow-sm dark:border-line'
                    : 'border-line hover:border-line hover:bg-surface-soft dark:border-line',
                ]"
                @click="selectLog(log)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="flex items-center gap-2 text-sm font-semibold text-ink">
                      <span>#{{ log.id }}</span>
                      <span class="text-xs text-subtle">{{ log.actionType }} · {{ log.targetType }}</span>
                    </div>
                    <p class="mt-1 text-xs text-muted">행위자 {{ log.actorUserId }}</p>
                  </div>
                  <span class="text-xs text-subtle">{{ formatDate(log.createdAt) }}</span>
                </div>
                <p class="mt-2 text-xs text-muted">{{ log.summary }}</p>
              </button>

              <div v-if="logs.length === 0" class="ui-state ui-state-empty px-4 py-10">조건에 해당하는 로그가 없습니다.</div>
            </div>

            <div class="mt-4 flex items-center justify-between text-sm text-muted">
              <button
                type="button"
                class="ui-chip-button ui-chip-button-muted px-4 py-2 disabled:opacity-40"
                :disabled="page === 0"
                @click="movePage(-1)"
              >
                이전
              </button>
              <span>{{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
              <button
                type="button"
                class="ui-chip-button ui-chip-button-muted px-4 py-2 disabled:opacity-40"
                :disabled="page + 1 >= totalPages"
                @click="movePage(1)"
              >
                다음
              </button>
            </div>
          </section>

          <section class="ui-panel p-5">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs tracking-[0.2em] text-subtle uppercase">Detail</p>
                <h2 class="mt-1 text-lg font-semibold text-ink">로그 상세</h2>
              </div>
            </div>

            <div v-if="selectedLog" class="mt-6 space-y-4 text-sm text-muted">
              <div class="flex justify-between">
                <span>로그 번호</span>
                <span class="font-semibold text-ink">#{{ selectedLog.id }}</span>
              </div>
              <div class="flex justify-between">
                <span>행위자</span>
                <span class="font-semibold text-ink">{{ selectedLog.actorUserId }}</span>
              </div>
              <div class="flex justify-between">
                <span>액션</span>
                <span class="font-semibold text-ink">{{ selectedLog.actionType }}</span>
              </div>
              <div class="flex justify-between">
                <span>대상</span>
                <span class="font-semibold text-ink"> {{ selectedLog.targetType }} · {{ selectedLog.targetId ?? '-' }} </span>
              </div>
              <div class="flex justify-between">
                <span>게시판</span>
                <span class="font-semibold text-ink">{{ selectedLog.boardId ?? '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span>시간</span>
                <span class="font-semibold text-ink">{{ formatDate(selectedLog.createdAt) }}</span>
              </div>
              <div class="flex justify-between">
                <span>요청 IP</span>
                <span class="font-semibold text-ink">{{ selectedLog.ipAddress ?? '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span>User-Agent</span>
                <span class="font-semibold text-ink">{{ selectedLog.userAgent ?? '-' }}</span>
              </div>
              <div class="rounded-ui border border-line bg-surface-soft px-4 py-3 text-xs text-muted dark:border-line">
                {{ selectedLog.summary }}
              </div>
              <pre v-if="detailJsonPretty" class="ui-code-block rounded-ui whitespace-pre-wrap">{{ detailJsonPretty }}</pre>
            </div>

            <div v-else class="ui-state ui-state-empty mt-10 px-6 py-10">로그를 선택하세요.</div>
          </section>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>
