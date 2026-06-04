<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';

import BaseModal from '../shared/ui/BaseModal.vue';
import { ApiError } from '../shared/lib/http/api';
import { getAdminUsers, lockAdminUser, unlockAdminUser, updateAdminUserRole } from '../features/admin/system';
import type { AdminUserListItemResponse, AdminUserStatus } from '../features/admin/system';
import PageContainer from '../shared/ui/PageContainer.vue';
import AppShell from '../widgets/layout/AppShell.vue';

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
  <AppShell>
    <PageContainer width="wide">
      <div>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="ui-heading-page text-2xl">사용자 관리</h1>
            <p class="text-sm text-muted">회원 상태 및 권한을 관리합니다.</p>
          </div>
        </div>

        <div class="ui-panel mt-6 p-4">
          <div class="flex flex-wrap items-center gap-3">
            <select
              v-model="statusFilter"
              class="h-10 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink shadow-sm transition focus:border-[color:var(--accent-strong)] focus:outline-none"
            >
              <option v-for="option in statusOptions" :key="option" :value="option">
                {{ option === 'ALL' ? '전체' : option === 'ACTIVE' ? '활성' : option === 'LOCKED' ? '잠금' : '비활성' }}
              </option>
            </select>
            <input
              v-model="keyword"
              type="search"
              class="h-10 min-w-[200px] flex-1 rounded-full border border-line bg-surface px-4 text-sm text-ink shadow-sm focus:border-[color:var(--accent-strong)] focus:outline-none"
              placeholder="로그인 ID, 닉네임, 핸들, 이메일 검색"
            />
            <button
              type="button"
              class="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:text-subtle"
              @click="applyFilters"
            >
              적용
            </button>
          </div>
          <p class="mt-3 text-xs text-subtle">{{ filterSummary }}</p>
        </div>

        <div v-if="listError" class="ui-state ui-state-danger mt-6">
          {{ listError }}
        </div>

        <section class="ui-panel mt-6 p-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-ink">사용자 목록</h2>
            <span class="text-xs text-subtle">총 {{ users.length }}건</span>
          </div>

          <div v-if="isLoading" class="mt-4 flex items-center gap-2 text-sm text-muted">
            <span class="dark:bg-surface-soft0 h-2 w-2 animate-pulse rounded-full bg-[var(--line-strong)]"></span>
            불러오는 중...
          </div>

          <div v-else class="mt-4 flex flex-col gap-3">
            <div v-for="user in users" :key="user.id" class="rounded-2xl border border-line px-4 py-3 text-left transition dark:border-line">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span>#{{ user.id }}</span>
                    <span class="text-xs text-subtle">{{ user.loginId }}</span>
                  </div>
                  <p class="mt-1 text-xs text-muted">{{ user.displayName }} · {{ user.handle }} · {{ user.email }}</p>
                  <p class="mt-1 text-xs text-subtle">권한 {{ user.roleName }} · 생성 {{ formatDate(user.createdAt) }}</p>
                </div>
                <span :class="statusBadgeClass(user)">{{ statusLabel(user) }}</span>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted transition hover:border-line hover:text-ink disabled:opacity-40 dark:text-subtle"
                  :disabled="isSubmitting"
                  @click="toggleLock(user)"
                >
                  {{ user.locked ? '해제' : '잠금' }}
                </button>
                <button
                  type="button"
                  class="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted transition hover:border-line hover:text-ink disabled:opacity-40 dark:text-subtle"
                  :disabled="isSubmitting"
                  @click="openRoleModal(user)"
                >
                  권한 변경
                </button>
              </div>
            </div>

            <div v-if="users.length === 0" class="ui-state ui-state-empty px-4 py-10">조건에 해당하는 사용자가 없습니다.</div>
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
      </div>
    </PageContainer>

    <BaseModal :open="Boolean(roleTarget)" overlay-class="bg-[var(--surface-overlay)]" aria-label="권한 변경" @close="closeRoleModal">
      <h3 class="text-lg font-semibold text-ink">권한 변경</h3>
      <p class="mt-2 text-sm text-muted">{{ roleTarget?.displayName ?? '' }}(#{{ roleTarget?.id ?? '' }})의 권한을 변경합니다.</p>
      <select
        v-model="nextRole"
        class="ui-panel mt-4 h-11 w-full px-3 text-sm font-semibold text-ink focus:border-[color:var(--accent-strong)] focus:outline-none"
      >
        <option v-for="role in roleOptions" :key="role" :value="role">
          {{ role }}
        </option>
      </select>
      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition hover:border-line hover:text-ink dark:text-subtle"
          @click="closeRoleModal"
        >
          취소
        </button>
        <button
          type="button"
          class="dark:bg-surface-soft rounded-full bg-[color:var(--accent-strong)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:text-ink"
          :disabled="isSubmitting"
          @click="submitRoleChange"
        >
          변경
        </button>
      </div>
    </BaseModal>
  </AppShell>
</template>
