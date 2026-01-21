<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import BaseModal from '../components/BaseModal.vue';
import BoardAdminNav from '../components/BoardAdminNav.vue';
import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { getBoardBySlug } from '../services/boards';
import type { BoardDetailResponse, BoardMemberStatus } from '../services/boards';
import { createBoardSanction, getBoardSanctions, revokeBoardSanction } from '../services/boardModeration';
import type { SanctionResponse, SanctionType } from '../services/boardModeration';
import { isAdmin } from '../stores/auth';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

const route = useRoute();
const isMobileMenuOpen = ref(false);
const board = ref<BoardDetailResponse | null>(null);
const boardError = ref('');

const page = ref(0);
const size = ref(10);
const totalPages = ref(0);
const sanctions = ref<SanctionResponse[]>([]);
const listError = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);
const revokeTarget = ref<SanctionResponse | null>(null);
const revokeReason = ref('');

const form = ref({
  userId: '',
  sanctionType: 'SUSPEND' as SanctionType,
  reason: '',
  endsAt: '',
  reportId: '',
});

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
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  if (sanction.revokedAt) {
    return `${base} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`;
  }
  if (sanction.endsAt && new Date(sanction.endsAt).getTime() < Date.now()) {
    return `${base} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200`;
  }
  return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200`;
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

const loadSanctions = async () => {
  if (!board.value || !hasPermission.value) {
    return;
  }
  listError.value = '';
  isLoading.value = true;
  try {
    const response = await getBoardSanctions(board.value.id, page.value, size.value);
    sanctions.value = response.items;
    totalPages.value = response.totalPages;
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '제재 목록을 불러오지 못했습니다.';
  } finally {
    isLoading.value = false;
  }
};

const submitSanction = async () => {
  if (!board.value) {
    return;
  }
  listError.value = '';
  const userId = Number(form.value.userId);
  if (!userId) {
    listError.value = '대상 회원번호를 입력해주세요.';
    return;
  }
  if (!form.value.reason.trim()) {
    listError.value = '제재 사유를 입력해주세요.';
    return;
  }

  isSubmitting.value = true;
  try {
    await createBoardSanction(board.value.id, {
      userId,
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
  if (!board.value || !revokeTarget.value) {
    return;
  }
  if (!revokeReason.value.trim()) {
    listError.value = '해제 사유를 입력해주세요.';
    return;
  }
  isSubmitting.value = true;
  try {
    await revokeBoardSanction(board.value.id, revokeTarget.value.id, { revokedReason: revokeReason.value.trim() });
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

onMounted(async () => {
  await nextTick();
  await loadBoard();
  await loadSanctions();
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-6xl space-y-6">
          <BoardAdminNav v-if="board && hasPermission" :slug="board.slug" :board-name="boardName" active="sanctions" />

          <div
            v-if="boardError"
            class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ boardError }}
          </div>

          <div v-if="board && hasPermission" class="space-y-6">
            <div>
              <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">게시판 제재 관리</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">해당 게시판의 제재 등록 및 해제를 관리합니다.</p>
            </div>

            <div
              v-if="listError"
              class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {{ listError }}
            </div>

            <div class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <section class="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
                <div class="flex items-center justify-between">
                  <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">제재 목록</h2>
                  <span class="text-xs text-slate-400">총 {{ sanctions.length }}건</span>
                </div>

                <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
                  불러오는 중...
                </div>

                <div v-else class="mt-4 flex flex-col gap-3">
                  <div
                    v-for="sanction in sanctions"
                    :key="sanction.id"
                    class="rounded-2xl border border-slate-200 px-4 py-3 text-left transition dark:border-slate-800"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          <span>#{{ sanction.id }}</span>
                          <span class="text-xs text-slate-400">{{ sanction.sanctionType }} · BOARD</span>
                        </div>
                        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">대상 {{ sanction.userId }} · {{ boardName }}</p>
                      </div>
                      <span :class="statusBadgeClass(sanction)">{{ resolveStatusLabel(sanction) }}</span>
                    </div>
                    <div class="mt-2 text-xs text-slate-400">시작 {{ formatDate(sanction.startsAt) }} · 종료 {{ formatDate(sanction.endsAt) }}</div>
                    <div class="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                        :disabled="!canRevoke(sanction)"
                        @click="openRevokeModal(sanction)"
                      >
                        해제
                      </button>
                    </div>
                  </div>

                  <div
                    v-if="sanctions.length === 0"
                    class="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
                  >
                    현재 제재가 없습니다.
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

              <section class="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Create</p>
                    <h2 class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">제재 등록</h2>
                  </div>
                </div>

                <div class="mt-6 flex flex-col gap-4">
                  <div
                    class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                  >
                    범위: BOARD · {{ boardName }}
                  </div>

                  <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">대상 회원번호</label>
                  <input
                    v-model="form.userId"
                    type="number"
                    class="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    placeholder="예: 7"
                  />

                  <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">제재 유형</label>
                  <select
                    v-model="form.sanctionType"
                    class="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <option value="MUTE">MUTE</option>
                    <option value="SUSPEND">SUSPEND</option>
                    <option value="BAN">BAN</option>
                  </select>

                  <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">제재 사유</label>
                  <textarea
                    v-model="form.reason"
                    rows="4"
                    class="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    placeholder="사유를 입력하세요."
                  ></textarea>

                  <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">종료 일시</label>
                  <input
                    v-model="form.endsAt"
                    type="datetime-local"
                    class="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  />

                  <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">연계 신고 번호</label>
                  <input
                    v-model="form.reportId"
                    type="number"
                    class="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    placeholder="선택"
                  />

                  <button
                    type="button"
                    class="mt-2 inline-flex items-center justify-center rounded-2xl bg-[color:var(--accent-strong)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="isSubmitting"
                    @click="submitSanction"
                  >
                    {{ isSubmitting ? '등록 중...' : '제재 등록' }}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>

    <BaseModal :open="Boolean(revokeTarget)" overlay-class="bg-slate-900/50" aria-label="제재 해제" @close="closeRevokeModal">
        <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">제재 해제</h3>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">제재 #{{ revokeTarget.id }} 해제 사유를 입력하세요.</p>
        <textarea
          v-model="revokeReason"
          rows="4"
          class="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          placeholder="해제 사유"
        ></textarea>
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
            @click="closeRevokeModal"
          >
            취소
          </button>
          <button
            type="button"
            class="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
            :disabled="isSubmitting"
            @click="submitRevoke"
          >
            해제
          </button>
        </div>
    </BaseModal>
  </div>
</template>
