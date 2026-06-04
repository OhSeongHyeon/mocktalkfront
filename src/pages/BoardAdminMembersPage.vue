<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import BoardAdminNav from '../widgets/layout/BoardAdminNav.vue';
import { ApiError } from '../shared/lib/http/api';
import { getBoardBySlug } from '../entities/board';
import type { BoardDetailResponse, BoardMemberStatus } from '../entities/board';
import { approveBoardMember, getBoardMembers, rejectBoardMember, updateBoardMemberRole, updateBoardMemberStatus } from '../features/admin/board';
import type { BoardMemberListItemResponse } from '../features/admin/board';
import { useAuthStore } from '../stores/auth';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import AppShell from '../widgets/layout/AppShell.vue';

type StatusFilter = BoardMemberStatus | 'ALL';

const route = useRoute();
const { t } = useI18n();
const authStore = useAuthStore();
const { isAdmin } = storeToRefs(authStore);
const board = ref<BoardDetailResponse | null>(null);
const boardError = ref('');

const members = ref<BoardMemberListItemResponse[]>([]);
const listError = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);
const page = ref(0);
const size = ref(10);
const totalPages = ref(0);

const statusFilter = ref<StatusFilter>('ALL');
const statusOptions: StatusFilter[] = ['ALL', 'PENDING', 'MEMBER', 'MODERATOR', 'OWNER', 'BANNED'];

const isAllowedMember = (memberStatus: BoardMemberStatus | null) => memberStatus === 'OWNER' || memberStatus === 'MODERATOR';

const hasPermission = computed(() => isAdmin.value || (board.value ? isAllowedMember(board.value.memberStatus) : false));

const boardSlug = computed(() => String(route.params.slug ?? ''));
const boardName = computed(() => board.value?.boardName ?? t('admin.common.defaultBoardName'));

const statusLabel = (status: BoardMemberStatus | 'ALL') => {
  if (status === 'ALL') {
    return t('admin.common.all');
  }
  const labels: Record<BoardMemberStatus, string> = {
    OWNER: t('admin.boardAdmin.members.roleOwner'),
    MODERATOR: t('admin.boardAdmin.members.roleModerator'),
    MEMBER: t('admin.boardAdmin.members.roleMember'),
    PENDING: t('admin.boardAdmin.members.rolePending'),
    BANNED: t('admin.boardAdmin.members.roleBanned'),
  };
  return labels[status] ?? status;
};

const statusBadgeClass = (status: BoardMemberStatus) => {
  if (status === 'PENDING') {
    return 'ui-badge ui-badge-warning';
  }
  if (status === 'BANNED') {
    return 'ui-badge ui-badge-danger';
  }
  if (status === 'OWNER') {
    return 'ui-badge ui-badge-accent';
  }
  if (status === 'MODERATOR') {
    return 'ui-badge ui-badge-muted';
  }
  return 'ui-badge ui-badge-success';
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

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

const loadMembers = async () => {
  if (!board.value || !hasPermission.value) {
    return;
  }
  listError.value = '';
  isLoading.value = true;
  try {
    const response = await getBoardMembers(board.value.id, {
      status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
      page: page.value,
      size: size.value,
    });
    members.value = response.items;
    totalPages.value = response.totalPages;
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : t('admin.boardAdmin.members.errors.loadList');
  } finally {
    isLoading.value = false;
  }
};

const movePage = async (delta: number) => {
  const next = page.value + delta;
  if (next < 0 || next >= totalPages.value) {
    return;
  }
  page.value = next;
  await loadMembers();
};

const updateMember = (updated: BoardMemberListItemResponse) => {
  members.value = members.value.map((item) => (item.id === updated.id ? updated : item));
};

const handleApprove = async (member: BoardMemberListItemResponse) => {
  if (!board.value) {
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    const updated = await approveBoardMember(board.value.id, member.id);
    updateMember(updated);
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : t('admin.boardAdmin.members.errors.approveFailed');
  } finally {
    isSubmitting.value = false;
  }
};

const handleReject = async (member: BoardMemberListItemResponse) => {
  if (!board.value) {
    return;
  }
  if (!window.confirm(t('admin.boardAdmin.members.confirmReject'))) {
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    await rejectBoardMember(board.value.id, member.id);
    members.value = members.value.filter((item) => item.id !== member.id);
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : t('admin.boardAdmin.members.errors.rejectFailed');
  } finally {
    isSubmitting.value = false;
  }
};

const handleRoleChange = async (member: BoardMemberListItemResponse, targetRole: BoardMemberStatus) => {
  if (!board.value) {
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    const updated = await updateBoardMemberRole(board.value.id, member.id, { boardRole: targetRole });
    updateMember(updated);
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : t('admin.boardAdmin.members.errors.roleFailed');
  } finally {
    isSubmitting.value = false;
  }
};

const handleStatusChange = async (member: BoardMemberListItemResponse, targetRole: BoardMemberStatus) => {
  if (!board.value) {
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    const updated = await updateBoardMemberStatus(board.value.id, member.id, { boardRole: targetRole });
    updateMember(updated);
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : t('admin.boardAdmin.members.errors.statusFailed');
  } finally {
    isSubmitting.value = false;
  }
};

const actionLabel = (role: BoardMemberStatus) => {
  if (role === 'PENDING') {
    return t('admin.boardAdmin.members.statusPending');
  }
  if (role === 'BANNED') {
    return t('admin.boardAdmin.members.statusBanned');
  }
  return t('admin.common.active');
};

watch(statusFilter, async () => {
  page.value = 0;
  await loadMembers();
});

onMounted(async () => {
  await nextTick();
  await loadBoard();
  await loadMembers();
});
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <div class="space-y-6">
        <BoardAdminNav v-if="board && hasPermission" :slug="board.slug" :board-name="boardName" active="members" />

        <div v-if="boardError" class="ui-state ui-state-danger">
          {{ boardError }}
        </div>

        <div v-if="board && hasPermission" class="space-y-6">
          <PageHeader
            eyebrow="Board Members"
            :title="t('admin.boardAdmin.members.title', { boardName })"
            :description="t('admin.boardAdmin.members.description')"
          >
            <template #meta>
              <span class="ui-badge ui-badge-muted">{{ t('admin.common.currentPage', { current: page + 1, total: Math.max(totalPages, 1) }) }}</span>
              <span class="ui-badge ui-badge-accent">{{ t('admin.common.displayCount', { count: members.length }) }}</span>
              <span class="text-xs text-muted">{{
                statusFilter === 'ALL' ? t('admin.common.statusAll') : t('admin.common.statusFilter', { status: statusLabel(statusFilter) })
              }}</span>
            </template>
            <template #actions>
              <label class="text-xs font-semibold tracking-[0.18em] text-subtle uppercase dark:text-muted">{{ t('admin.common.statusLabel') }}</label>
              <select v-model="statusFilter" class="ui-select min-w-[9rem]">
                <option v-for="option in statusOptions" :key="option" :value="option">
                  {{ statusLabel(option) }}
                </option>
              </select>
            </template>
            <div class="grid gap-3 md:grid-cols-3">
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Board</p>
                <p class="bbs-row-title mt-2 text-sm">{{ boardName }}</p>
                <p class="mt-1 text-xs text-muted">{{ t('admin.boardAdmin.members.queueHint') }}</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Queue</p>
                <p class="bbs-row-title mt-2 text-sm">{{ t('admin.common.displayCount', { count: members.length }) }}</p>
                <p class="mt-1 text-xs text-muted">{{ t('admin.boardAdmin.members.filterCountHint') }}</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="ui-eyebrow">Action</p>
                <p class="bbs-row-title mt-2 text-sm">{{ t('admin.boardAdmin.members.actionsHint') }}</p>
                <p class="mt-1 text-xs text-muted">{{ t('admin.boardAdmin.members.ownerChangeHint') }}</p>
              </div>
            </div>
          </PageHeader>

          <div v-if="listError" class="ui-state ui-state-danger">
            {{ listError }}
          </div>

          <section class="ui-panel p-5">
            <div class="dark:border-line/80 flex items-center justify-between gap-3 border border-b border-line bg-surface-soft pb-3">
              <div>
                <h2 class="bbs-row-title text-lg">{{ t('admin.boardAdmin.members.listTitle') }}</h2>
                <p class="mt-1 text-sm text-muted">{{ t('admin.boardAdmin.members.listDescription') }}</p>
              </div>
              <span class="ui-badge ui-badge-muted">{{ t('admin.common.totalCount', { count: members.length }) }}</span>
            </div>

            <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-muted">
              <span class="h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)] dark:bg-surface-2"></span>
              {{ t('common.loading') }}
            </div>

            <div v-else class="mt-4 flex flex-col gap-3">
              <div v-for="member in members" :key="member.id" class="ui-list-row">
                <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span :class="statusBadgeClass(member.boardRole)">{{ statusLabel(member.boardRole) }}</span>
                      <span class="ui-badge ui-badge-muted">{{ actionLabel(member.boardRole) }}</span>
                      <span>{{ t('admin.boardAdmin.members.approver', { name: member.grantedByName ?? '-' }) }}</span>
                    </div>
                    <div class="mt-2 flex flex-wrap items-center gap-2">
                      <span class="bbs-row-title text-sm">#{{ member.userId }}</span>
                      <span class="text-sm text-muted">{{ member.displayName }}</span>
                      <span class="text-xs text-subtle">{{ member.handle }}</span>
                      <span class="text-xs text-subtle">{{ member.loginId }}</span>
                    </div>
                    <p class="mt-2 text-xs text-muted">
                      {{ t('admin.boardAdmin.members.appliedAt', { date: formatDate(member.createdAt) })
                      }}<span v-if="member.updatedAt">{{ t('admin.boardAdmin.members.changedAt', { date: formatDate(member.updatedAt) }) }}</span>
                    </p>
                  </div>

                  <div class="flex flex-wrap items-center gap-2 lg:max-w-[20rem] lg:justify-end">
                    <button
                      v-if="member.boardRole === 'PENDING'"
                      type="button"
                      class="ui-button-accent h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      :disabled="isSubmitting"
                      @click="handleApprove(member)"
                    >
                      {{ t('admin.boardAdmin.members.approve') }}
                    </button>
                    <button
                      v-if="member.boardRole === 'PENDING'"
                      type="button"
                      class="ui-button-danger h-9 px-4 text-xs disabled:opacity-40"
                      :disabled="isSubmitting"
                      @click="handleReject(member)"
                    >
                      {{ t('admin.boardAdmin.members.reject') }}
                    </button>
                    <button
                      v-if="member.boardRole === 'MEMBER'"
                      type="button"
                      class="ui-button-ghost h-9 px-4 text-xs disabled:opacity-40"
                      :disabled="isSubmitting"
                      @click="handleRoleChange(member, 'MODERATOR')"
                    >
                      {{ t('admin.boardAdmin.members.promoteModerator') }}
                    </button>
                    <button
                      v-if="member.boardRole === 'MODERATOR'"
                      type="button"
                      class="ui-button-ghost h-9 px-4 text-xs disabled:opacity-40"
                      :disabled="isSubmitting"
                      @click="handleRoleChange(member, 'MEMBER')"
                    >
                      {{ t('admin.boardAdmin.members.demoteMember') }}
                    </button>
                    <button
                      v-if="member.boardRole === 'MEMBER' || member.boardRole === 'MODERATOR'"
                      type="button"
                      class="ui-button-danger h-9 px-4 text-xs disabled:opacity-40"
                      :disabled="isSubmitting"
                      @click="handleStatusChange(member, 'BANNED')"
                    >
                      {{ t('admin.boardAdmin.members.ban') }}
                    </button>
                    <button
                      v-if="member.boardRole === 'BANNED'"
                      type="button"
                      class="ui-button-primary h-9 px-4 text-xs disabled:opacity-40"
                      :disabled="isSubmitting"
                      @click="handleStatusChange(member, 'MEMBER')"
                    >
                      {{ t('admin.boardAdmin.members.unban') }}
                    </button>
                    <span v-if="member.boardRole === 'OWNER'" class="text-xs font-semibold text-subtle">{{
                      t('admin.boardAdmin.members.ownerChangeAdminOnly')
                    }}</span>
                  </div>
                </div>
              </div>

              <div v-if="members.length === 0" class="ui-state ui-state-empty px-4 py-10">{{ t('admin.boardAdmin.members.empty') }}</div>
            </div>

            <div class="ui-toolbar mt-4 justify-between text-sm text-muted">
              <button type="button" class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-40" :disabled="page === 0" @click="movePage(-1)">
                {{ t('common.previous') }}
              </button>
              <span>{{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
              <button
                type="button"
                class="ui-button-ghost h-10 px-4 text-xs disabled:opacity-40"
                :disabled="page + 1 >= totalPages"
                @click="movePage(1)"
              >
                {{ t('common.next') }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>
