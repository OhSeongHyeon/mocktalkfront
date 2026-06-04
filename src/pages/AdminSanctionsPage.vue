<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import BaseModal from '../shared/ui/BaseModal.vue';
import { ApiError } from '../shared/lib/http/api';
import { createAdminSanction, getAdminSanctions, revokeAdminSanction } from '../features/admin/system';
import type { SanctionResponse, SanctionScopeType, SanctionType } from '../features/admin/system';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const page = ref(0);
const size = ref(10);
const totalPages = ref(0);
const sanctions = ref<SanctionResponse[]>([]);
const listError = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);
const revokeTarget = ref<SanctionResponse | null>(null);
const revokeReason = ref('');

const scopeFilter = ref<SanctionScopeType | 'ALL'>('ALL');
const scopeOptions: Array<SanctionScopeType | 'ALL'> = ['ALL', 'GLOBAL', 'BOARD'];

const form = ref({
  userId: '',
  scopeType: 'GLOBAL' as SanctionScopeType,
  boardId: '',
  sanctionType: 'SUSPEND' as SanctionType,
  reason: '',
  endsAt: '',
  reportId: '',
});

const formatDate = (value: string | null) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

const resolveStatusLabel = (sanction: SanctionResponse) => {
  if (sanction.revokedAt) {
    return '해제';
  }
  if (sanction.endsAt && new Date(sanction.endsAt).getTime() < Date.now()) {
    return '종료';
  }
  return '활성';
};

const statusBadgeClass = (sanction: SanctionResponse) => {
  if (sanction.revokedAt) {
    return 'ui-badge ui-badge-muted';
  }
  if (sanction.endsAt && new Date(sanction.endsAt).getTime() < Date.now()) {
    return 'ui-badge ui-badge-warning';
  }
  return 'ui-badge ui-badge-success';
};

const loadSanctions = async () => {
  listError.value = '';
  isLoading.value = true;
  try {
    const response = await getAdminSanctions({
      scopeType: scopeFilter.value === 'ALL' ? undefined : scopeFilter.value,
      page: page.value,
      size: size.value,
    });
    sanctions.value = response.items;
    totalPages.value = response.totalPages;
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '제재 목록을 불러오지 못했습니다.';
  } finally {
    isLoading.value = false;
  }
};

const submitSanction = async () => {
  listError.value = '';
  const userId = Number(form.value.userId);
  if (!userId) {
    listError.value = '대상 회원번호를 입력해주세요.';
    return;
  }
  if (form.value.scopeType === 'BOARD' && !Number(form.value.boardId)) {
    listError.value = 'BOARD 범위는 게시판 번호가 필요합니다.';
    return;
  }
  if (!form.value.reason.trim()) {
    listError.value = '제재 사유를 입력해주세요.';
    return;
  }

  isSubmitting.value = true;
  try {
    await createAdminSanction({
      userId,
      scopeType: form.value.scopeType,
      boardId: form.value.scopeType === 'BOARD' ? Number(form.value.boardId) : undefined,
      sanctionType: form.value.sanctionType,
      reason: form.value.reason.trim(),
      endsAt: form.value.endsAt ? new Date(form.value.endsAt).toISOString() : undefined,
      reportId: form.value.reportId ? Number(form.value.reportId) : undefined,
    });
    form.value.reason = '';
    form.value.endsAt = '';
    form.value.reportId = '';
    await loadSanctions();
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '제재 등록에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};

const openRevokeModal = (sanction: SanctionResponse) => {
  revokeTarget.value = sanction;
  revokeReason.value = '';
};

const closeRevokeModal = () => {
  revokeTarget.value = null;
  revokeReason.value = '';
};

const submitRevoke = async () => {
  if (!revokeTarget.value) {
    return;
  }
  if (!revokeReason.value.trim()) {
    listError.value = '해제 사유를 입력해주세요.';
    return;
  }
  isSubmitting.value = true;
  try {
    await revokeAdminSanction(revokeTarget.value.id, { revokedReason: revokeReason.value.trim() });
    closeRevokeModal();
    await loadSanctions();
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '제재 해제에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};

const movePage = async (delta: number) => {
  const next = page.value + delta;
  if (next < 0 || next >= totalPages.value) {
    return;
  }
  page.value = next;
  await loadSanctions();
};

const canRevoke = (sanction: SanctionResponse) => !sanction.revokedAt;

const formBoardDisabled = computed(() => form.value.scopeType !== 'BOARD');

onMounted(async () => {
  await nextTick();
  await loadSanctions();
});

watch(scopeFilter, async () => {
  page.value = 0;
  await loadSanctions();
});
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <div class="space-y-6">
        <PageHeader eyebrow="Admin Sanctions" title="제재 관리" description="제재 등록과 해제 흐름을 한 화면에서 처리합니다.">
          <template #meta>
            <span class="ui-badge ui-badge-muted">현재 페이지 {{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
            <span class="ui-badge ui-badge-accent">표시 {{ sanctions.length }}건</span>
            <span class="text-xs text-muted">{{ scopeFilter === 'ALL' ? '전체 범위' : `${scopeFilter} 범위` }}</span>
          </template>
          <template #actions>
            <label class="text-xs font-semibold tracking-[0.18em] text-subtle uppercase dark:text-muted">범위</label>
            <select v-model="scopeFilter" class="ui-select min-w-[9rem]">
              <option v-for="option in scopeOptions" :key="option" :value="option">
                {{ option === 'ALL' ? '전체' : option }}
              </option>
            </select>
          </template>
          <div class="grid gap-3 md:grid-cols-3">
            <div class="ui-data-panel p-4">
              <p class="ui-eyebrow">Scope</p>
              <p class="bbs-row-title mt-2 text-sm">
                {{ scopeFilter === 'ALL' ? 'GLOBAL + BOARD' : scopeFilter }}
              </p>
              <p class="mt-1 text-xs text-muted">필터된 범위에 맞는 제재만 목록에 표시합니다.</p>
            </div>
            <div class="ui-data-panel p-4">
              <p class="ui-eyebrow">Register</p>
              <p class="bbs-row-title mt-2 text-sm">회원번호 + 제재 사유</p>
              <p class="mt-1 text-xs text-muted">BOARD 범위일 때만 게시판 번호를 함께 입력합니다.</p>
            </div>
            <div class="ui-data-panel p-4">
              <p class="ui-eyebrow">Revoke</p>
              <p class="bbs-row-title mt-2 text-sm">해제 사유 필수</p>
              <p class="mt-1 text-xs text-muted">활성 제재만 해제할 수 있으며, 이력은 유지됩니다.</p>
            </div>
          </div>
        </PageHeader>

        <div v-if="listError" class="ui-state ui-state-danger">
          {{ listError }}
        </div>

        <div class="grid gap-6 xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)]">
          <section class="ui-panel p-5">
            <div class="dark:border-line/80 flex items-center justify-between gap-3 border border-b border-line bg-surface-soft pb-3">
              <div>
                <h2 class="bbs-row-title text-lg">제재 목록</h2>
                <p class="mt-1 text-sm text-muted">활성, 종료, 해제 상태를 같은 규칙으로 확인합니다.</p>
              </div>
              <span class="ui-badge ui-badge-muted">총 {{ sanctions.length }}건</span>
            </div>

            <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-muted">
              <span class="h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)] dark:bg-surface-2"></span>
              불러오는 중...
            </div>

            <div v-else class="mt-4 flex flex-col gap-3">
              <div v-for="sanction in sanctions" :key="sanction.id" class="ui-list-row">
                <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span :class="statusBadgeClass(sanction)">{{ resolveStatusLabel(sanction) }}</span>
                      <span class="ui-badge ui-badge-muted">{{ sanction.sanctionType }}</span>
                      <span>{{ sanction.scopeType }}</span>
                    </div>
                    <div class="mt-2 flex flex-wrap items-center gap-2">
                      <span class="bbs-row-title text-sm">#{{ sanction.id }}</span>
                      <span class="text-sm text-muted">대상 {{ sanction.userId }}</span>
                      <span class="text-xs text-subtle">게시판 {{ sanction.boardId ?? '-' }}</span>
                    </div>
                    <p class="mt-2 text-xs text-muted">시작 {{ formatDate(sanction.startsAt) }} · 종료 {{ formatDate(sanction.endsAt) }}</p>
                  </div>

                  <div class="flex items-center justify-start md:justify-end">
                    <button
                      type="button"
                      class="ui-button-danger h-9 px-4 text-xs disabled:opacity-40"
                      :disabled="!canRevoke(sanction)"
                      @click="openRevokeModal(sanction)"
                    >
                      해제
                    </button>
                  </div>
                </div>
                <div class="text-xs text-subtle">해제 시각 {{ formatDate(sanction.revokedAt) }}</div>
              </div>

              <div v-if="sanctions.length === 0" class="ui-state ui-state-empty px-4 py-10">현재 조건에 해당하는 제재가 없습니다.</div>
            </div>

            <div class="ui-toolbar mt-4 justify-between text-sm text-muted">
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
            <div class="dark:border-line/80 flex items-center justify-between gap-3 border border-b border-line bg-surface-soft pb-3">
              <div>
                <p class="ui-eyebrow">Create</p>
                <h2 class="bbs-row-title mt-1 text-lg">제재 등록</h2>
              </div>
            </div>

            <div class="mt-6 grid gap-4 md:grid-cols-2">
              <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                대상 회원번호
                <input v-model="form.userId" type="number" class="ui-input" placeholder="예: 7" />
              </label>

              <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                제재 범위
                <select v-model="form.scopeType" class="ui-select">
                  <option value="GLOBAL">GLOBAL</option>
                  <option value="BOARD">BOARD</option>
                </select>
              </label>

              <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                게시판 번호
                <input
                  v-model="form.boardId"
                  type="number"
                  :disabled="formBoardDisabled"
                  class="ui-input disabled:cursor-not-allowed disabled:bg-surface-soft/80 dark:disabled:opacity-60"
                  placeholder="BOARD 범위일 때"
                />
              </label>

              <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                제재 유형
                <select v-model="form.sanctionType" class="ui-select">
                  <option value="MUTE">MUTE</option>
                  <option value="SUSPEND">SUSPEND</option>
                  <option value="BAN">BAN</option>
                </select>
              </label>

              <label class="flex flex-col gap-2 text-sm font-medium text-ink md:col-span-2">
                제재 사유
                <textarea v-model="form.reason" rows="4" class="ui-textarea" placeholder="사유를 입력하세요."></textarea>
              </label>

              <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                종료 일시
                <input v-model="form.endsAt" type="datetime-local" class="ui-input" />
              </label>

              <label class="flex flex-col gap-2 text-sm font-medium text-ink">
                연계 신고 번호
                <input v-model="form.reportId" type="number" class="ui-input" placeholder="선택" />
              </label>
            </div>

            <div class="ui-toolbar mt-5 justify-between text-xs text-muted">
              <span>등록 즉시 목록을 다시 조회합니다.</span>
              <button
                type="button"
                class="ui-button-accent h-11 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isSubmitting"
                @click="submitSanction"
              >
                {{ isSubmitting ? '등록 중...' : '제재 등록' }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </PageContainer>

    <BaseModal :open="Boolean(revokeTarget)" overlay-class="bg-[var(--surface-overlay)]" aria-label="제재 해제" @close="closeRevokeModal">
      <h3 class="bbs-row-title text-lg">제재 해제</h3>
      <p class="mt-2 text-sm text-muted">제재 #{{ revokeTarget?.id ?? '' }} 해제 사유를 입력하세요.</p>
      <textarea v-model="revokeReason" rows="4" class="ui-textarea mt-4" placeholder="해제 사유"></textarea>
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="ui-button-ghost h-10 px-4 text-xs" @click="closeRevokeModal">취소</button>
        <button
          type="button"
          class="ui-button-danger h-10 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isSubmitting"
          @click="submitRevoke"
        >
          해제
        </button>
      </div>
    </BaseModal>
  </AppShell>
</template>
