<script setup lang="ts">
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
const boardName = computed(() => board.value?.boardName ?? '게시판');

const statusLabel = (status: BoardMemberStatus) => {
  const labels: Record<BoardMemberStatus, string> = {
    OWNER: '소유자',
    MODERATOR: '관리자',
    MEMBER: '멤버',
    PENDING: '대기',
    BANNED: '차단',
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
      boardError.value = '게시판 관리자 권한이 없습니다.';
    }
  } catch (error) {
    boardError.value = error instanceof ApiError ? error.message : '게시판 정보를 불러오지 못했습니다.';
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
    listError.value = error instanceof ApiError ? error.message : '멤버 목록을 불러오지 못했습니다.';
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
    listError.value = error instanceof ApiError ? error.message : '승인 처리에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};

const handleReject = async (member: BoardMemberListItemResponse) => {
  if (!board.value) {
    return;
  }
  if (!window.confirm('가입 요청을 거절할까요?')) {
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    await rejectBoardMember(board.value.id, member.id);
    members.value = members.value.filter((item) => item.id !== member.id);
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '거절 처리에 실패했습니다.';
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
    listError.value = error instanceof ApiError ? error.message : '역할 변경에 실패했습니다.';
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
    listError.value = error instanceof ApiError ? error.message : '상태 변경에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};

const actionLabel = (role: BoardMemberStatus) => {
  if (role === 'PENDING') {
    return '승인 대기';
  }
  if (role === 'BANNED') {
    return '차단됨';
  }
  return '활성';
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
            :title="`${boardName} 멤버 관리`"
            description="가입 승인, 역할 변경, 차단 상태를 같은 운영 패턴으로 관리합니다."
          >
            <template #meta>
              <span class="ui-badge ui-badge-muted">현재 페이지 {{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
              <span class="ui-badge ui-badge-accent">표시 {{ members.length }}건</span>
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
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">이 게시판 멤버만 조회합니다.</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Queue</p>
                <p class="mt-2 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">{{ members.length }}건</p>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">필터 조건에 맞는 멤버/신청 목록입니다.</p>
              </div>
              <div class="ui-data-panel p-4">
                <p class="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">Action</p>
                <p class="mt-2 text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">승인, 역할 변경, 차단</p>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">소유자 변경은 시스템 관리자만 수행할 수 있습니다.</p>
              </div>
            </div>
          </PageHeader>

          <div v-if="listError" class="ui-state ui-state-danger">
            {{ listError }}
          </div>

          <section class="ui-panel p-5">
            <div class="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800/80">
              <div>
                <h2 class="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">멤버 목록</h2>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">사용자별 상태와 최근 변경 시점을 한 줄에서 확인합니다.</p>
              </div>
              <span class="ui-badge ui-badge-muted">총 {{ members.length }}건</span>
            </div>

            <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
              불러오는 중...
            </div>

            <div v-else class="mt-4 flex flex-col gap-3">
              <div v-for="member in members" :key="member.id" class="ui-list-row">
                <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span :class="statusBadgeClass(member.boardRole)">{{ statusLabel(member.boardRole) }}</span>
                      <span class="ui-badge ui-badge-muted">{{ actionLabel(member.boardRole) }}</span>
                      <span>승인자 {{ member.grantedByName ?? '-' }}</span>
                    </div>
                    <div class="mt-2 flex flex-wrap items-center gap-2">
                      <span class="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100">#{{ member.userId }}</span>
                      <span class="text-sm text-slate-600 dark:text-slate-300">{{ member.displayName }}</span>
                      <span class="text-xs text-slate-400">{{ member.handle }}</span>
                      <span class="text-xs text-slate-400">{{ member.loginId }}</span>
                    </div>
                    <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      신청 {{ formatDate(member.createdAt) }}<span v-if="member.updatedAt"> · 변경 {{ formatDate(member.updatedAt) }}</span>
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
                      승인
                    </button>
                    <button
                      v-if="member.boardRole === 'PENDING'"
                      type="button"
                      class="ui-button-danger h-9 px-4 text-xs disabled:opacity-40"
                      :disabled="isSubmitting"
                      @click="handleReject(member)"
                    >
                      거절
                    </button>
                    <button
                      v-if="member.boardRole === 'MEMBER'"
                      type="button"
                      class="ui-button-ghost h-9 px-4 text-xs disabled:opacity-40"
                      :disabled="isSubmitting"
                      @click="handleRoleChange(member, 'MODERATOR')"
                    >
                      관리자 승격
                    </button>
                    <button
                      v-if="member.boardRole === 'MODERATOR'"
                      type="button"
                      class="ui-button-ghost h-9 px-4 text-xs disabled:opacity-40"
                      :disabled="isSubmitting"
                      @click="handleRoleChange(member, 'MEMBER')"
                    >
                      멤버로 변경
                    </button>
                    <button
                      v-if="member.boardRole === 'MEMBER' || member.boardRole === 'MODERATOR'"
                      type="button"
                      class="ui-button-danger h-9 px-4 text-xs disabled:opacity-40"
                      :disabled="isSubmitting"
                      @click="handleStatusChange(member, 'BANNED')"
                    >
                      차단
                    </button>
                    <button
                      v-if="member.boardRole === 'BANNED'"
                      type="button"
                      class="ui-button-primary h-9 px-4 text-xs disabled:opacity-40"
                      :disabled="isSubmitting"
                      @click="handleStatusChange(member, 'MEMBER')"
                    >
                      차단 해제
                    </button>
                    <span v-if="member.boardRole === 'OWNER'" class="text-xs font-semibold text-slate-400">소유자 변경은 ADMIN만 가능합니다.</span>
                  </div>
                </div>
              </div>

              <div v-if="members.length === 0" class="ui-state ui-state-empty px-4 py-10">조건에 해당하는 멤버가 없습니다.</div>
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
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>
