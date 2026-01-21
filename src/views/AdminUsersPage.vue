<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';

import BaseModal from '../components/BaseModal.vue';
import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { getAdminUsers, lockAdminUser, unlockAdminUser, updateAdminUserRole } from '../services/adminUsers';
import type { AdminUserListItemResponse, AdminUserStatus } from '../services/adminUsers';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

const isMobileMenuOpen = ref(false);
const page = ref(0);
const size = ref(10);
const totalPages = ref(0);
const users = ref<AdminUserListItemResponse[]>([]);
const listError = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);
const keyword = ref('');

const statusFilter = ref<AdminUserStatus | 'ALL'>('ALL');
const statusOptions: Array<AdminUserStatus | 'ALL'> = ['ALL', 'ACTIVE', 'LOCKED', 'DISABLED'];

const roleOptions = ['USER', 'WRITER', 'MANAGER', 'ADMIN'];
const roleTarget = ref<AdminUserListItemResponse | null>(null);
const nextRole = ref('USER');

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

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

const statusLabel = (user: AdminUserListItemResponse) => {
  if (user.locked) {
    return '잠금';
  }
  if (!user.enabled) {
    return '비활성';
  }
  return '활성';
};

const statusBadgeClass = (user: AdminUserListItemResponse) => {
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  if (user.locked) {
    return `${base} bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200`;
  }
  if (!user.enabled) {
    return `${base} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200`;
  }
  return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200`;
};

const filterStatusLabel = (value: AdminUserStatus | 'ALL') => {
  if (value === 'ALL') {
    return '전체';
  }
  if (value === 'ACTIVE') {
    return '활성';
  }
  if (value === 'LOCKED') {
    return '잠금';
  }
  return '비활성';
};

const loadUsers = async () => {
  listError.value = '';
  isLoading.value = true;
  try {
    const response = await getAdminUsers({
      status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
      keyword: keyword.value.trim() || undefined,
      page: page.value,
      size: size.value,
    });
    users.value = response.items;
    totalPages.value = response.totalPages;
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '사용자 목록을 불러오지 못했습니다.';
  } finally {
    isLoading.value = false;
  }
};

const applyFilters = async () => {
  page.value = 0;
  await loadUsers();
};

const movePage = async (delta: number) => {
  const next = page.value + delta;
  if (next < 0 || next >= totalPages.value) {
    return;
  }
  page.value = next;
  await loadUsers();
};

const updateUserItem = (updated: AdminUserListItemResponse) => {
  users.value = users.value.map((item) => (item.id === updated.id ? updated : item));
};

const toggleLock = async (user: AdminUserListItemResponse) => {
  isSubmitting.value = true;
  listError.value = '';
  try {
    const updated = user.locked ? await unlockAdminUser(user.id) : await lockAdminUser(user.id);
    updateUserItem(updated);
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '상태 변경에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};

const openRoleModal = (user: AdminUserListItemResponse) => {
  roleTarget.value = user;
  nextRole.value = user.roleName;
};

const closeRoleModal = () => {
  roleTarget.value = null;
};

const submitRoleChange = async () => {
  if (!roleTarget.value) {
    return;
  }
  isSubmitting.value = true;
  listError.value = '';
  try {
    const updated = await updateAdminUserRole(roleTarget.value.id, { roleName: nextRole.value });
    updateUserItem(updated);
    closeRoleModal();
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '권한 변경에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};

const filterSummary = computed(() => {
  const parts: string[] = [];
  if (statusFilter.value !== 'ALL') {
    parts.push(`상태 ${filterStatusLabel(statusFilter.value)}`);
  }
  if (keyword.value.trim()) {
    parts.push(`검색 ${keyword.value.trim()}`);
  }
  return parts.length ? parts.join(' · ') : '전체 사용자';
});

onMounted(async () => {
  await nextTick();
  await loadUsers();
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-6xl">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">사용자 관리</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">회원 상태 및 권한을 관리합니다.</p>
            </div>
          </div>

          <div class="mt-6 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
            <div class="flex flex-wrap items-center gap-3">
              <select
                v-model="statusFilter"
                class="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option v-for="option in statusOptions" :key="option" :value="option">
                  {{ option === 'ALL' ? '전체' : option === 'ACTIVE' ? '활성' : option === 'LOCKED' ? '잠금' : '비활성' }}
                </option>
              </select>
              <input
                v-model="keyword"
                type="search"
                class="h-10 min-w-[200px] flex-1 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                placeholder="로그인 ID, 닉네임, 핸들, 이메일 검색"
              />
              <button
                type="button"
                class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
                @click="applyFilters"
              >
                적용
              </button>
            </div>
            <p class="mt-3 text-xs text-slate-400">{{ filterSummary }}</p>
          </div>

          <div
            v-if="listError"
            class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ listError }}
          </div>

          <section class="mt-6 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">사용자 목록</h2>
              <span class="text-xs text-slate-400">총 {{ users.length }}건</span>
            </div>

            <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <span class="h-2 w-2 animate-pulse rounded-full bg-slate-400 dark:bg-slate-500"></span>
              불러오는 중...
            </div>

            <div v-else class="mt-4 flex flex-col gap-3">
              <div
                v-for="user in users"
                :key="user.id"
                class="rounded-2xl border border-slate-200 px-4 py-3 text-left transition dark:border-slate-800"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                      <span>#{{ user.id }}</span>
                      <span class="text-xs text-slate-400">{{ user.loginId }}</span>
                    </div>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ user.displayName }} · {{ user.handle }} · {{ user.email }}</p>
                    <p class="mt-1 text-xs text-slate-400">권한 {{ user.roleName }} · 생성 {{ formatDate(user.createdAt) }}</p>
                  </div>
                  <span :class="statusBadgeClass(user)">{{ statusLabel(user) }}</span>
                </div>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                    :disabled="isSubmitting"
                    @click="toggleLock(user)"
                  >
                    {{ user.locked ? '해제' : '잠금' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                    :disabled="isSubmitting"
                    @click="openRoleModal(user)"
                  >
                    권한 변경
                  </button>
                </div>
              </div>

              <div
                v-if="users.length === 0"
                class="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
              >
                조건에 해당하는 사용자가 없습니다.
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
      </main>
    </div>

    <BaseModal :open="Boolean(roleTarget)" overlay-class="bg-slate-900/50" aria-label="권한 변경" @close="closeRoleModal">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">권한 변경</h3>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {{ roleTarget?.displayName ?? '' }}(#{{ roleTarget?.id ?? '' }})의 권한을 변경합니다.
      </p>
      <select
        v-model="nextRole"
        class="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
      >
        <option v-for="role in roleOptions" :key="role" :value="role">
          {{ role }}
        </option>
      </select>
      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
          @click="closeRoleModal"
        >
          취소
        </button>
        <button
          type="button"
          class="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
          :disabled="isSubmitting"
          @click="submitRoleChange"
        >
          변경
        </button>
      </div>
    </BaseModal>
  </div>
</template>
