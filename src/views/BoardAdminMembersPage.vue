<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import BoardAdminNav from '../components/BoardAdminNav.vue';
import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { getBoardBySlug } from '../services/boards';
import type { BoardDetailResponse, BoardMemberStatus } from '../services/boards';
import { approveBoardMember, getBoardMembers, rejectBoardMember, updateBoardMemberRole, updateBoardMemberStatus } from '../services/boardMembers';
import type { BoardMemberListItemResponse } from '../services/boardMembers';
import { isAdmin } from '../stores/auth';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

type StatusFilter = BoardMemberStatus | 'ALL';

const route = useRoute();
const isMobileMenuOpen = ref(false);
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

const isMobileView = () => (typeof window !== 'undefined' ? window.innerWidth < 768 : false);

const toggleMenu = () => {
  if (isMobileView()) {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
    return;
  }
  setMenuCollapsed(!menuCollapsed.value);
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

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
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  if (status === 'PENDING') {
    return `${base} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200`;
  }
  if (status === 'BANNED') {
    return `${base} bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200`;
  }
  if (status === 'OWNER') {
    return `${base} bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200`;
  }
  if (status === 'MODERATOR') {
    return `${base} bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200`;
  }
  return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200`;
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
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-6xl space-y-6">
          <BoardAdminNav v-if="board && hasPermission" :slug="board.slug" :board-name="boardName" active="members" />

          <div
            v-if="boardError"
            class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ boardError }}
          </div>

          <div v-if="board && hasPermission" class="space-y-6">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">멤버 관리</h1>
                <p class="text-sm text-slate-500 dark:text-slate-400">게시판 멤버 승인과 권한을 관리합니다.</p>
              </div>
              <div class="flex items-center gap-3">
                <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">상태</label>
                <select
                  v-model="statusFilter"
                  class="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option v-for="option in statusOptions" :key="option" :value="option">
                    {{ option === 'ALL' ? '전체' : statusLabel(option) }}
                  </option>
                </select>
              </div>
            </div>

            <div
              v-if="listError"
              class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {{ listError }}
            </div>

            <section class="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">멤버 목록</h2>
                <span class="text-xs text-slate-400">총 {{ members.length }}건</span>
              </div>

              <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
                불러오는 중...
              </div>

              <div v-else class="mt-4 flex flex-col gap-3">
                <div
                  v-for="member in members"
                  :key="member.id"
                  class="rounded-2xl border border-slate-200 px-4 py-3 text-left transition dark:border-slate-800"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <span>#{{ member.userId }}</span>
                        <span class="text-xs text-slate-400">{{ member.loginId }}</span>
                      </div>
                      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ member.displayName }} · {{ member.handle }}</p>
                      <p class="mt-1 text-xs text-slate-400">{{ actionLabel(member.boardRole) }} · 신청 {{ formatDate(member.createdAt) }}</p>
                    </div>
                    <span :class="statusBadgeClass(member.boardRole)">{{ statusLabel(member.boardRole) }}</span>
                  </div>

                  <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>승인자 {{ member.grantedByName ?? '-' }}</span>
                    <span v-if="member.updatedAt">변경 {{ formatDate(member.updatedAt) }}</span>
                  </div>

                  <div class="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      v-if="member.boardRole === 'PENDING'"
                      type="button"
                      class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
                      :disabled="isSubmitting"
                      @click="handleApprove(member)"
                    >
                      승인
                    </button>
                    <button
                      v-if="member.boardRole === 'PENDING'"
                      type="button"
                      class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:opacity-40 dark:border-rose-700 dark:text-rose-300"
                      :disabled="isSubmitting"
                      @click="handleReject(member)"
                    >
                      거절
                    </button>

                    <button
                      v-if="member.boardRole === 'MEMBER'"
                      type="button"
                      class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                      :disabled="isSubmitting"
                      @click="handleRoleChange(member, 'MODERATOR')"
                    >
                      관리자 승격
                    </button>
                    <button
                      v-if="member.boardRole === 'MODERATOR'"
                      type="button"
                      class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                      :disabled="isSubmitting"
                      @click="handleRoleChange(member, 'MEMBER')"
                    >
                      멤버로 변경
                    </button>

                    <button
                      v-if="member.boardRole === 'MEMBER' || member.boardRole === 'MODERATOR'"
                      type="button"
                      class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:opacity-40 dark:border-rose-700 dark:text-rose-300"
                      :disabled="isSubmitting"
                      @click="handleStatusChange(member, 'BANNED')"
                    >
                      차단
                    </button>

                    <button
                      v-if="member.boardRole === 'BANNED'"
                      type="button"
                      class="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 dark:border-emerald-700 dark:text-emerald-300"
                      :disabled="isSubmitting"
                      @click="handleStatusChange(member, 'MEMBER')"
                    >
                      차단 해제
                    </button>

                    <span v-if="member.boardRole === 'OWNER'" class="text-xs font-semibold text-slate-400"> 소유자 변경은 ADMIN만 가능합니다. </span>
                  </div>
                </div>

                <div
                  v-if="members.length === 0"
                  class="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
                >
                  조건에 해당하는 멤버가 없습니다.
                </div>
              </div>

              <div class="mt-4 flex items-center justify-between text-sm text-slate-500">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300"
                  :disabled="page === 0"
                  @click="movePage(-1)"
                >
                  이전
                </button>
                <span>{{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300"
                  :disabled="page + 1 >= totalPages"
                  @click="movePage(1)"
                >
                  다음
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
