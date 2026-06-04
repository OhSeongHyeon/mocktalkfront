<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import BaseModal from '../shared/ui/BaseModal.vue';
import { logout } from '../features/auth';
import { useMyPageActivity } from '../features/user/lib/useMyPageActivity';
import { resolveBoardRoleLabel, resolveBoardVisibilityLabel } from '../entities/board';
import { deleteMyAccount, getMyProfile, updateMyProfile } from '../entities/user';
import type { UserProfileResponse } from '../entities/user';
import { ApiError } from '../shared/lib/http/api';
import { formatKoreanDate } from '../shared/lib/date';
import { resolveImageUrl } from '../shared/lib/files';
import { formatNotificationMessage } from '../shared/lib/notifications';
import { applyProfileSummary } from '../shared/lib/profile';
import { useAuthStore } from '../stores/auth';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const router = useRouter();
const authStore = useAuthStore();

const {
  activeTab,
  listLoading,
  listError,
  boards,
  articles,
  comments,
  notifications,
  loadActiveTab,
  setTab,
  setPage,
  currentList,
  isListEmpty,
  currentTotalPages,
  currentPage,
  showActivityPagination,
  showActivityPageNumbers,
  activityPageNumbers,
  hasPreviousActivityPageWindow,
  hasNextActivityPageWindow,
  activityEmptyMessage,
  boardTotalCount,
  articleTotalCount,
  commentTotalCount,
  notificationTotalCount,
  handlePreviousActivityPageWindow,
  handleNextActivityPageWindow,
  handleBoardClick,
  handleArticleClick,
  handleCommentClick,
  handleNotificationClick,
  handleDeleteNotification,
  handleDeleteAllNotifications,
} = useMyPageActivity(router);

const formatActivityDate = (value?: string | null) => {
  if (!value) {
    return '-';
  }
  return formatKoreanDate(value);
};

const profile = ref<UserProfileResponse | null>(null);
const isProfileLoading = ref(false);
const isProfileSaving = ref(false);
const profileError = ref('');
const saveMessage = ref('');

const form = reactive({
  userName: '',
  email: '',
  displayName: '',
  handle: '',
  password: '',
  passwordConfirm: '',
  profileImage: null as File | null,
});

const previewUrl = ref<string | null>(null);

const mainTab = ref<'activity' | 'profile'>('activity');

const isDeleteModalOpen = ref(false);
const deleteConfirmText = ref('');
const deleteError = ref('');
const isDeleting = ref(false);

const setMainTab = (tab: 'activity' | 'profile') => {
  mainTab.value = tab;
};

const resolvedProfileImage = computed(() => {
  if (previewUrl.value) {
    return previewUrl.value;
  }
  return resolveImageUrl(profile.value?.profileImage ?? null, 'medium');
});

const loadProfile = async () => {
  profileError.value = '';
  saveMessage.value = '';
  isProfileLoading.value = true;
  try {
    const data = await getMyProfile();
    profile.value = data;
    form.userName = data.userName ?? '';
    form.email = data.email ?? '';
    form.displayName = data.displayName ?? '';
    form.handle = data.handle ?? '';
    form.password = '';
    form.passwordConfirm = '';
    applyProfileSummary(data);
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await router.push('/login');
      return false;
    }
    profileError.value = error instanceof ApiError ? error.message : '프로필 조회에 실패했습니다.';
    return false;
  } finally {
    isProfileLoading.value = false;
  }
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0] ?? null;
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = file ? URL.createObjectURL(file) : null;
  form.profileImage = file;
};

const clearSelectedImage = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = null;
  form.profileImage = null;
};

const handleSubmit = async () => {
  profileError.value = '';
  saveMessage.value = '';
  if (!form.userName.trim() || !form.email.trim() || !form.handle.trim()) {
    profileError.value = '이름, 이메일, 핸들은 필수입니다.';
    return;
  }
  if (form.password.trim() && form.password.trim() !== form.passwordConfirm.trim()) {
    profileError.value = '비밀번호 확인이 일치하지 않습니다.';
    return;
  }
  isProfileSaving.value = true;
  try {
    const data = await updateMyProfile({
      userName: form.userName.trim(),
      email: form.email.trim(),
      displayName: form.displayName.trim(),
      handle: form.handle.trim(),
      password: form.password.trim() || null,
      profileImage: form.profileImage,
    });
    profile.value = data;
    form.userName = data.userName ?? '';
    form.email = data.email ?? '';
    form.displayName = data.displayName ?? '';
    form.handle = data.handle ?? '';
    form.password = '';
    form.passwordConfirm = '';
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = null;
    }
    form.profileImage = null;
    applyProfileSummary(data);
    saveMessage.value = '프로필이 저장되었습니다.';
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await router.push('/login');
      return;
    }
    profileError.value = error instanceof ApiError ? error.message : '프로필 저장에 실패했습니다.';
  } finally {
    isProfileSaving.value = false;
  }
};

const openDeleteModal = () => {
  deleteConfirmText.value = '';
  deleteError.value = '';
  isDeleteModalOpen.value = true;
};

const closeDeleteModal = () => {
  isDeleteModalOpen.value = false;
  deleteConfirmText.value = '';
  deleteError.value = '';
};

const confirmDelete = async () => {
  deleteError.value = '';
  if (deleteConfirmText.value.trim() !== '탈퇴') {
    deleteError.value = '재확인 문구를 정확히 입력해주세요.';
    return;
  }
  isDeleting.value = true;
  try {
    await deleteMyAccount(deleteConfirmText.value.trim());
    try {
      await logout();
    } catch {}
    authStore.clearAccessToken();
    closeDeleteModal();
    await router.push('/');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await router.push('/login');
      return;
    }
    deleteError.value = error instanceof ApiError ? error.message : '계정 삭제에 실패했습니다.';
  } finally {
    isDeleting.value = false;
  }
};

onMounted(async () => {
  const ok = await loadProfile();
  if (ok) {
    await loadActiveTab();
  }
});

onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});
</script>

<template>
  <AppShell>
    <PageContainer width="auto">
      <div class="flex flex-col gap-4">
        <PageHeader eyebrow="마이페이지" title="나의 프로필 관리" description="프로필 정보를 수정하고 내가 남긴 활동을 같은 화면에서 확인합니다.">
          <template #actions>
            <div class="ui-tab-list">
              <button
                type="button"
                class="ui-tab-button"
                :class="mainTab === 'activity' ? 'ui-tab-button-active' : ''"
                @click="setMainTab('activity')"
              >
                활동기록
              </button>
              <button type="button" class="ui-tab-button" :class="mainTab === 'profile' ? 'ui-tab-button-active' : ''" @click="setMainTab('profile')">
                프로필 수정
              </button>
            </div>
          </template>
        </PageHeader>

        <section v-if="mainTab === 'profile'" class="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
          <div class="ui-panel flex h-full flex-col gap-4 p-5">
            <div class="flex items-center gap-4">
              <div class="h-18 w-18 overflow-hidden rounded-[0.75rem] border border-line bg-surface-soft">
                <img v-if="resolvedProfileImage" :src="resolvedProfileImage" alt="프로필 이미지" class="h-full w-full object-cover" />
                <div v-else class="flex h-full w-full items-center justify-center text-sm font-semibold text-subtle">없음</div>
              </div>
              <div>
                <p class="text-lg font-semibold text-ink">
                  {{ profile?.displayName || profile?.userName || '사용자' }}
                </p>
                <p class="text-sm text-muted">@{{ profile?.handle || '-' }}</p>
              </div>
            </div>

            <div class="grid gap-3 text-sm text-muted">
              <div class="flex items-center justify-between">
                <span>아이디</span>
                <span class="font-semibold text-ink">
                  {{ profile?.loginId || '-' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>이름</span>
                <span class="font-semibold text-ink">
                  {{ profile?.userName || '-' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>이메일</span>
                <span class="font-semibold text-ink">
                  {{ profile?.email || '-' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>닉네임</span>
                <span class="font-semibold text-ink">
                  {{ profile?.displayName || '-' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>핸들</span>
                <span class="font-semibold text-ink">
                  {{ profile?.handle || '-' }}
                </span>
              </div>
            </div>

            <div class="ui-sub-panel px-4 py-3 text-xs text-muted">프로필 이미지는 이미지 파일만 업로드할 수 있습니다.</div>
          </div>

          <form class="ui-panel flex flex-col gap-4 p-5" @submit.prevent="handleSubmit">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-black tracking-tight text-ink">프로필 수정</h2>
              <span v-if="isProfileLoading" class="text-xs text-subtle">불러오는 중...</span>
            </div>

            <div class="grid gap-2">
              <label for="mypage-login-id" class="text-sm font-semibold text-ink"> 아이디 </label>
              <input
                id="mypage-login-id"
                :value="profile?.loginId ?? ''"
                type="text"
                class="ui-input bg-surface-soft text-muted dark:text-subtle"
                readonly
                disabled
              />
            </div>

            <div class="grid gap-2">
              <label for="mypage-name" class="text-sm font-semibold text-ink"> 이름 </label>
              <input id="mypage-name" v-model="form.userName" type="text" class="ui-input" :disabled="isProfileLoading || isProfileSaving" />
            </div>

            <div class="grid gap-2">
              <label for="mypage-email" class="text-sm font-semibold text-ink"> 이메일 </label>
              <input
                id="mypage-email"
                v-model="form.email"
                type="email"
                autocomplete="email"
                class="ui-input"
                :disabled="isProfileLoading || isProfileSaving"
              />
            </div>

            <div class="grid gap-2">
              <label for="mypage-nickname" class="text-sm font-semibold text-ink"> 닉네임 </label>
              <input id="mypage-nickname" v-model="form.displayName" type="text" class="ui-input" :disabled="isProfileLoading || isProfileSaving" />
            </div>

            <div class="grid gap-2">
              <label for="mypage-handle" class="text-sm font-semibold text-ink"> 핸들 </label>
              <input id="mypage-handle" v-model="form.handle" type="text" class="ui-input" :disabled="isProfileLoading || isProfileSaving" />
            </div>

            <div class="grid gap-2">
              <label for="mypage-password" class="text-sm font-semibold text-ink"> 비밀번호 </label>
              <input
                id="mypage-password"
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                placeholder="변경할 때만 입력"
                class="ui-input"
                :disabled="isProfileLoading || isProfileSaving"
              />
            </div>

            <div class="grid gap-2">
              <label for="mypage-password-confirm" class="text-sm font-semibold text-ink"> 비밀번호 확인 </label>
              <input
                id="mypage-password-confirm"
                v-model="form.passwordConfirm"
                type="password"
                autocomplete="new-password"
                placeholder="비밀번호를 다시 입력"
                class="ui-input"
                :disabled="isProfileLoading || isProfileSaving"
              />
            </div>
            <div class="grid gap-2">
              <label for="mypage-image" class="text-sm font-semibold text-ink"> 프로필 이미지 </label>
              <div class="flex flex-wrap items-center gap-3">
                <input
                  id="mypage-image"
                  type="file"
                  accept="image/*"
                  class="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:bg-surface-2 dark:text-subtle dark:file:bg-surface-2 dark:file:text-ink dark:hover:file:bg-surface-3"
                  :disabled="isProfileLoading || isProfileSaving"
                  @change="handleFileChange"
                />
                <button
                  v-if="form.profileImage"
                  type="button"
                  class="ui-button-ghost h-10 px-4 text-xs"
                  :disabled="isProfileSaving"
                  @click="clearSelectedImage"
                >
                  선택 해제
                </button>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                class="ui-button-accent h-11 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                :disabled="isProfileLoading || isProfileSaving"
              >
                저장
              </button>
              <span v-if="saveMessage" class="text-sm font-semibold text-success">
                {{ saveMessage }}
              </span>
            </div>

            <div
              class="flex flex-wrap items-center justify-between gap-3 rounded-[0.55rem] border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
            >
              <div>계정 삭제는 되돌릴 수 없습니다. 신중히 진행해주세요.</div>
              <button
                type="button"
                class="ui-button-danger h-10 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-70"
                :disabled="isProfileSaving"
                @click="openDeleteModal"
              >
                계정 삭제
              </button>
            </div>

            <p v-if="profileError" class="ui-state ui-state-danger text-sm font-semibold" role="alert">
              {{ profileError }}
            </p>
          </form>
        </section>

        <section v-else class="ui-panel flex flex-col gap-4 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="ui-tab-list">
              <button type="button" class="ui-tab-button" :class="activeTab === 'boards' ? 'ui-tab-button-active' : ''" @click="setTab('boards')">
                내 게시판
                <span v-if="boardTotalCount !== null" class="ml-1 text-xs text-muted">
                  {{ boardTotalCount }}
                </span>
              </button>
              <button type="button" class="ui-tab-button" :class="activeTab === 'articles' ? 'ui-tab-button-active' : ''" @click="setTab('articles')">
                내 게시글
                <span v-if="articleTotalCount !== null" class="ml-1 text-xs text-muted">
                  {{ articleTotalCount }}
                </span>
              </button>
              <button type="button" class="ui-tab-button" :class="activeTab === 'comments' ? 'ui-tab-button-active' : ''" @click="setTab('comments')">
                내 댓글
                <span v-if="commentTotalCount !== null" class="ml-1 text-xs text-muted">
                  {{ commentTotalCount }}
                </span>
              </button>
              <button
                type="button"
                class="ui-tab-button"
                :class="activeTab === 'notifications' ? 'ui-tab-button-active' : ''"
                @click="setTab('notifications')"
              >
                알림목록
                <span v-if="notificationTotalCount !== null" class="ml-1 text-xs text-muted">
                  {{ notificationTotalCount }}
                </span>
              </button>
            </div>

            <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
              <button
                v-if="activeTab === 'notifications' && currentList?.items.length"
                type="button"
                class="ui-button-danger h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="listLoading"
                @click="handleDeleteAllNotifications"
              >
                전체 삭제
              </button>
            </div>
          </div>

          <div v-if="showActivityPagination" class="ui-toolbar justify-between text-xs text-muted">
            <div></div>
            <div class="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!currentList?.hasPrevious || listLoading"
                @click="setPage(currentPage - 1)"
              >
                이전
              </button>
              <div v-if="showActivityPageNumbers" class="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  class="ui-button-ghost h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="!hasPreviousActivityPageWindow || listLoading"
                  aria-label="이전 페이지 묶음"
                  @click="handlePreviousActivityPageWindow"
                >
                  &laquo;
                </button>
                <button
                  v-for="pageNumber in activityPageNumbers"
                  :key="`mypage-page-${pageNumber}`"
                  type="button"
                  class="h-9 px-4 text-xs"
                  :class="pageNumber === currentPage ? 'ui-button-primary' : 'ui-button-ghost'"
                  :disabled="listLoading"
                  @click="setPage(pageNumber)"
                >
                  {{ pageNumber + 1 }}
                </button>
                <button
                  type="button"
                  class="ui-button-ghost h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="!hasNextActivityPageWindow || listLoading"
                  aria-label="다음 페이지 묶음"
                  @click="handleNextActivityPageWindow"
                >
                  &raquo;
                </button>
              </div>
              <button
                type="button"
                class="ui-button-ghost h-9 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!currentList?.hasNext || listLoading"
                @click="setPage(currentPage + 1)"
              >
                다음
              </button>
            </div>
            <span class="justify-self-center sm:justify-self-end">
              페이지 {{ currentPage + 1 }}<span v-if="currentTotalPages > 0"> / {{ currentTotalPages }}</span>
            </span>
          </div>

          <div v-if="listLoading" class="text-sm text-muted">불러오는 중...</div>
          <p v-else-if="listError" class="ui-state ui-state-danger text-sm font-semibold" role="alert">
            {{ listError }}
          </p>
          <div v-else-if="isListEmpty" class="py-6 text-center text-sm text-subtle">{{ activityEmptyMessage }}</div>
          <div v-else-if="activeTab === 'boards'" class="grid gap-2">
            <div v-for="item in boards?.items" :key="item.id" class="ui-list-row text-sm text-ink">
              <button type="button" class="flex w-full flex-col gap-2 text-left" @click="handleBoardClick(item)">
                <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span class="ui-badge ui-badge-accent">{{ resolveBoardRoleLabel(item.boardRole) }}</span>
                  <span class="ui-badge ui-badge-muted">{{ resolveBoardVisibilityLabel(item.visibility) }}</span>
                  <span>/{{ item.slug }}</span>
                  <span>{{ formatActivityDate(item.joinedAt) }}</span>
                </div>
                <div class="font-semibold text-ink">{{ item.boardName }}</div>
                <p v-if="item.description" class="line-clamp-2 text-xs text-muted">{{ item.description }}</p>
              </button>
            </div>
          </div>
          <div v-else-if="activeTab === 'articles'" class="grid gap-2">
            <div v-for="item in articles?.items" :key="item.id" class="ui-list-row text-sm text-ink">
              <button type="button" class="flex w-full flex-col gap-2 text-left" @click="handleArticleClick(item)">
                <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>{{ item.boardName }}</span>
                  <span>{{ item.authorName }}</span>
                  <span>{{ formatActivityDate(item.createdAt) }}</span>
                  <span v-if="item.notice" class="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">공지</span>
                </div>
                <div class="font-semibold text-ink">{{ item.title }}</div>
                <div class="flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span>조회 {{ item.hit }}</span>
                  <span>댓글 {{ item.commentCount }}</span>
                  <span>좋아요 {{ item.likeCount }}</span>
                  <span>싫어요 {{ item.dislikeCount }}</span>
                </div>
              </button>
            </div>
          </div>
          <div v-else-if="activeTab === 'comments'" class="grid gap-2">
            <div v-for="item in comments?.items" :key="item.id" class="ui-list-row text-sm text-ink">
              <button type="button" class="flex w-full flex-col gap-2 text-left" @click="handleCommentClick(item)">
                <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>{{ item.boardName }}</span>
                  <span>{{ item.articleTitle }}</span>
                  <span>{{ item.authorName }}</span>
                  <span>{{ formatActivityDate(item.createdAt) }}</span>
                </div>
                <p class="line-clamp-2 text-sm text-ink">{{ item.content }}</p>
              </button>
            </div>
          </div>
          <div v-else class="grid gap-2">
            <div v-for="item in notifications?.items" :key="item.id" class="ui-list-row text-sm text-ink">
              <button type="button" class="flex w-full flex-col gap-2 text-left" @click="handleNotificationClick(item)">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span v-if="!item.read" class="inline-flex h-2 w-2 rounded-full bg-rose-400" aria-hidden="true"></span>
                    <div class="font-semibold" :class="item.read ? 'text-muted' : 'text-ink'">
                      {{ formatNotificationMessage(item) }}
                    </div>
                  </div>
                  <div class="text-xs text-subtle">{{ formatActivityDate(item.createdAt) }}</div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <p>알림을 눌러 상세 화면으로 이동하세요.</p>
                  <button type="button" class="ui-button-ghost h-8 px-3 text-[11px]" @click.stop="handleDeleteNotification(item)">삭제</button>
                </div>
              </button>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>

    <BaseModal :open="isDeleteModalOpen" aria-label="계정 삭제" @close="closeDeleteModal">
      <h3 class="bbs-row-title text-lg">계정 삭제</h3>
      <p class="mt-2 text-sm text-muted">
        계정을 삭제하면 복구할 수 없습니다. 계속하려면 아래 입력창에
        <span class="font-semibold text-red-500">탈퇴</span>를 입력하세요.
      </p>
      <div class="mt-4 grid gap-2">
        <label for="delete-confirm" class="text-sm font-semibold text-ink"> 재확인 문구 </label>
        <input id="delete-confirm" v-model="deleteConfirmText" type="text" placeholder="탈퇴" class="ui-input" :disabled="isDeleting" />
      </div>
      <p
        v-if="deleteError"
        class="mt-3 rounded-ui border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
        role="alert"
      >
        {{ deleteError }}
      </p>
      <div class="mt-5 flex items-center justify-end gap-2">
        <button type="button" class="ui-button-ghost h-10 px-4 text-sm" :disabled="isDeleting" @click="closeDeleteModal">취소</button>
        <button
          type="button"
          class="ui-button-danger h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-70"
          :disabled="isDeleting"
          @click="confirmDelete"
        >
          삭제
        </button>
      </div>
    </BaseModal>
  </AppShell>
</template>
