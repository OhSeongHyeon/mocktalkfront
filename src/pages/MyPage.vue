<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import BaseModal from '../shared/ui/BaseModal.vue';
import { logout } from '../features/auth';
import { deleteAllNotifications, deleteNotification, getNotifications, markNotificationRead } from '../features/notification';
import type { NotificationResponse } from '../features/notification';
import { deleteMyAccount, getMyArticles, getMyComments, getMyProfile, updateMyProfile } from '../entities/user';
import type { ArticleResponse, CommentResponse, PageResponse, UserProfileResponse } from '../entities/user';
import { ApiError } from '../shared/lib/http/api';
import { resolveImageUrl } from '../shared/lib/files';
import { formatNotificationMessage } from '../shared/lib/notifications';
import { applyProfileSummary } from '../shared/lib/profile';
import { clearAccessToken } from '../stores/auth';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import AppShell from '../widgets/layout/AppShell.vue';

const router = useRouter();
type ActivityTab = 'articles' | 'comments' | 'notifications';

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
const activeTab = ref<ActivityTab>('articles');
const listLoading = ref(false);
const listError = ref('');
const articles = ref<PageResponse<ArticleResponse> | null>(null);
const comments = ref<PageResponse<CommentResponse> | null>(null);
const notifications = ref<PageResponse<NotificationResponse> | null>(null);
const articlePage = ref(0);
const commentPage = ref(0);
const notificationPage = ref(0);
const pageSize = 10;
const ACTIVITY_PAGE_WINDOW_SIZE = 10;
const listRequestSequence = ref(0);

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

const beginListRequest = () => {
  listError.value = '';
  listLoading.value = true;
  return ++listRequestSequence.value;
};

const isStaleListRequest = (requestId: number) => requestId !== listRequestSequence.value;

const finishListRequest = (requestId: number) => {
  if (requestId === listRequestSequence.value) {
    listLoading.value = false;
  }
};

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

const loadArticles = async (page = 0) => {
  const requestId = beginListRequest();
  try {
    const data = await getMyArticles(page, pageSize);
    if (isStaleListRequest(requestId)) {
      return;
    }
    articles.value = data;
    articlePage.value = data.page;
  } catch (error) {
    if (isStaleListRequest(requestId)) {
      return;
    }
    if (error instanceof ApiError && error.status === 401) {
      await router.push('/login');
      return;
    }
    listError.value = error instanceof ApiError ? error.message : '게시글 조회에 실패했습니다.';
  } finally {
    finishListRequest(requestId);
  }
};

const loadComments = async (page = 0) => {
  const requestId = beginListRequest();
  try {
    const data = await getMyComments(page, pageSize);
    if (isStaleListRequest(requestId)) {
      return;
    }
    comments.value = data;
    commentPage.value = data.page;
  } catch (error) {
    if (isStaleListRequest(requestId)) {
      return;
    }
    if (error instanceof ApiError && error.status === 401) {
      await router.push('/login');
      return;
    }
    listError.value = error instanceof ApiError ? error.message : '댓글 조회에 실패했습니다.';
  } finally {
    finishListRequest(requestId);
  }
};

const loadNotifications = async (page = 0) => {
  const requestId = beginListRequest();
  try {
    const data = await getNotifications(page, pageSize);
    if (isStaleListRequest(requestId)) {
      return;
    }
    notifications.value = data;
    notificationPage.value = data.page;
  } catch (error) {
    if (isStaleListRequest(requestId)) {
      return;
    }
    if (error instanceof ApiError && error.status === 401) {
      await router.push('/login');
      return;
    }
    listError.value = error instanceof ApiError ? error.message : '알림 조회에 실패했습니다.';
  } finally {
    finishListRequest(requestId);
  }
};

const loadActiveTab = async () => {
  if (activeTab.value === 'articles') {
    await loadArticles(articlePage.value);
    return;
  }
  if (activeTab.value === 'comments') {
    await loadComments(commentPage.value);
    return;
  }
  await loadNotifications(notificationPage.value);
};

const setTab = async (tab: ActivityTab) => {
  if (activeTab.value === tab) {
    return;
  }
  activeTab.value = tab;
  await loadActiveTab();
};

const setPage = async (page: number) => {
  if (page < 0) {
    return;
  }
  const data = currentList.value;
  if (data && data.totalPages > 0 && page >= data.totalPages) {
    return;
  }
  if (activeTab.value === 'articles') {
    await loadArticles(page);
    return;
  }
  if (activeTab.value === 'comments') {
    await loadComments(page);
    return;
  }
  await loadNotifications(page);
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
    clearAccessToken();
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

const formatDate = (value?: string | null) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const handleActivityClick = async (item: ArticleResponse | CommentResponse) => {
  if (listLoading.value) {
    return;
  }
  if (activeTab.value === 'articles') {
    const articleItem = item as ArticleResponse;
    await router.push(`/b/${articleItem.boardSlug}/articles/${articleItem.id}`);
    return;
  }
  if (activeTab.value === 'comments') {
    const commentItem = item as CommentResponse;
    await router.push({
      path: `/b/${commentItem.boardSlug}/articles/${commentItem.articleId}`,
      query: { commentId: String(commentItem.id) },
    });
  }
};

const currentList = computed(() => {
  if (activeTab.value === 'articles') {
    return articles.value;
  }
  if (activeTab.value === 'comments') {
    return comments.value;
  }
  return notifications.value;
});

const isListEmpty = computed(() => {
  const data = currentList.value;
  return !data || data.items.length === 0;
});

const currentTotalPages = computed(() => currentList.value?.totalPages ?? 0);

const currentPage = computed(() => {
  if (activeTab.value === 'articles') {
    return articlePage.value;
  }
  if (activeTab.value === 'comments') {
    return commentPage.value;
  }
  return notificationPage.value;
});

const showActivityPagination = computed(() => {
  const data = currentList.value;
  if (!data) {
    return false;
  }
  if (data.totalPages > 1) {
    return true;
  }
  return data.hasNext || data.hasPrevious;
});

const showActivityPageNumbers = computed(() => currentTotalPages.value > 1);

const activityPageWindowStart = computed(() => Math.floor(currentPage.value / ACTIVITY_PAGE_WINDOW_SIZE) * ACTIVITY_PAGE_WINDOW_SIZE);
const activityPageWindowEnd = computed(() => Math.min(activityPageWindowStart.value + ACTIVITY_PAGE_WINDOW_SIZE, currentTotalPages.value));
const activityPageNumbers = computed(() =>
  Array.from(
    { length: Math.max(activityPageWindowEnd.value - activityPageWindowStart.value, 0) },
    (_, index) => activityPageWindowStart.value + index,
  ),
);
const hasPreviousActivityPageWindow = computed(() => activityPageWindowStart.value > 0);
const hasNextActivityPageWindow = computed(() => activityPageWindowEnd.value < currentTotalPages.value);

const activityEmptyMessage = computed(() => {
  if (activeTab.value === 'articles') {
    return '작성한 게시글이 없습니다.';
  }
  if (activeTab.value === 'comments') {
    return '작성한 댓글이 없습니다.';
  }
  return '알림이 없습니다.';
});

const articleTotalCount = computed(() => articles.value?.totalElements ?? null);
const commentTotalCount = computed(() => comments.value?.totalElements ?? null);
const notificationTotalCount = computed(() => notifications.value?.totalElements ?? null);

const handlePreviousActivityPageWindow = async () => {
  if (!hasPreviousActivityPageWindow.value) {
    return;
  }
  await setPage(Math.max(activityPageWindowStart.value - 1, 0));
};

const handleNextActivityPageWindow = async () => {
  if (!hasNextActivityPageWindow.value) {
    return;
  }
  await setPage(activityPageWindowEnd.value);
};

const handleNotificationClick = async (notification: NotificationResponse) => {
  if (!notification.read) {
    try {
      const updated = await markNotificationRead(notification.id);
      notification.read = updated.read;
    } catch (error) {
      listError.value = error instanceof ApiError ? error.message : '알림 읽음 처리에 실패했습니다.';
    }
  }
  if (notification.redirectUrl) {
    await router.push(notification.redirectUrl);
  }
};

const handleDeleteNotification = async (notification: NotificationResponse) => {
  listError.value = '';
  try {
    await deleteNotification(notification.id);
    const currentItems = notifications.value?.items.length ?? 0;
    const nextPage = currentItems <= 1 && notificationPage.value > 0 ? notificationPage.value - 1 : notificationPage.value;
    await loadNotifications(nextPage);
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '알림 삭제에 실패했습니다.';
  }
};

const handleDeleteAllNotifications = async () => {
  listError.value = '';
  try {
    await deleteAllNotifications();
    await loadNotifications(0);
  } catch (error) {
    listError.value = error instanceof ApiError ? error.message : '알림 삭제에 실패했습니다.';
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
      <div class="flex flex-col gap-6">
        <PageHeader eyebrow="마이페이지" title="나의 프로필 관리" description="프로필 정보를 수정하고 내 활동을 확인하세요.">
          <template #actions>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-full border px-4 py-2 text-sm font-semibold transition"
                :class="
                  mainTab === 'activity'
                    ? 'border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                    : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800'
                "
                @click="setMainTab('activity')"
              >
                활동기록
              </button>
              <button
                type="button"
                class="rounded-full border px-4 py-2 text-sm font-semibold transition"
                :class="
                  mainTab === 'profile'
                    ? 'border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                    : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800'
                "
                @click="setMainTab('profile')"
              >
                프로필 수정
              </button>
            </div>
          </template>
        </PageHeader>

        <section v-if="mainTab === 'profile'" class="grid gap-6 lg:grid-cols-[1.1fr_1.3fr]">
          <div class="ui-panel flex h-full flex-col gap-5 p-6">
            <div class="flex items-center gap-4">
              <div class="h-20 w-20 overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-100 dark:border-slate-800/80 dark:bg-slate-900">
                <img v-if="resolvedProfileImage" :src="resolvedProfileImage" alt="프로필 이미지" class="h-full w-full object-cover" />
                <div v-else class="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-400">없음</div>
              </div>
              <div>
                <p class="text-lg font-semibold text-slate-900 dark:text-white">
                  {{ profile?.displayName || profile?.userName || '사용자' }}
                </p>
                <p class="text-sm text-slate-500 dark:text-slate-400">@{{ profile?.handle || '-' }}</p>
              </div>
            </div>

            <div class="grid gap-3 text-sm text-slate-600 dark:text-slate-300">
              <div class="flex items-center justify-between">
                <span>아이디</span>
                <span class="font-semibold text-slate-900 dark:text-slate-100">
                  {{ profile?.loginId || '-' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>이름</span>
                <span class="font-semibold text-slate-900 dark:text-slate-100">
                  {{ profile?.userName || '-' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>이메일</span>
                <span class="font-semibold text-slate-900 dark:text-slate-100">
                  {{ profile?.email || '-' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>닉네임</span>
                <span class="font-semibold text-slate-900 dark:text-slate-100">
                  {{ profile?.displayName || '-' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>핸들</span>
                <span class="font-semibold text-slate-900 dark:text-slate-100">
                  {{ profile?.handle || '-' }}
                </span>
              </div>
            </div>

            <div class="ui-sub-panel px-4 py-3 text-xs text-slate-500 dark:text-slate-400">프로필 이미지 업로드는 이미지 파일만 가능합니다.</div>
          </div>

          <form class="ui-panel flex flex-col gap-4 p-6" @submit.prevent="handleSubmit">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">프로필 수정</h2>
              <span v-if="isProfileLoading" class="text-xs text-slate-400">불러오는 중...</span>
            </div>

            <div class="grid gap-2">
              <label for="mypage-login-id" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 아이디 </label>
              <input
                id="mypage-login-id"
                :value="profile?.loginId ?? ''"
                type="text"
                class="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300"
                readonly
                disabled
              />
            </div>

            <div class="grid gap-2">
              <label for="mypage-name" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 이름 </label>
              <input
                id="mypage-name"
                v-model="form.userName"
                type="text"
                class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                :disabled="isProfileLoading || isProfileSaving"
              />
            </div>

            <div class="grid gap-2">
              <label for="mypage-email" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 이메일 </label>
              <input
                id="mypage-email"
                v-model="form.email"
                type="email"
                autocomplete="email"
                class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                :disabled="isProfileLoading || isProfileSaving"
              />
            </div>

            <div class="grid gap-2">
              <label for="mypage-nickname" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 닉네임 </label>
              <input
                id="mypage-nickname"
                v-model="form.displayName"
                type="text"
                class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                :disabled="isProfileLoading || isProfileSaving"
              />
            </div>

            <div class="grid gap-2">
              <label for="mypage-handle" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 핸들 </label>
              <input
                id="mypage-handle"
                v-model="form.handle"
                type="text"
                class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                :disabled="isProfileLoading || isProfileSaving"
              />
            </div>

            <div class="grid gap-2">
              <label for="mypage-password" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 비밀번호 </label>
              <input
                id="mypage-password"
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                placeholder="변경할 때만 입력"
                class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                :disabled="isProfileLoading || isProfileSaving"
              />
            </div>

            <div class="grid gap-2">
              <label for="mypage-password-confirm" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 비밀번호 확인 </label>
              <input
                id="mypage-password-confirm"
                v-model="form.passwordConfirm"
                type="password"
                autocomplete="new-password"
                placeholder="비밀번호를 다시 입력"
                class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                :disabled="isProfileLoading || isProfileSaving"
              />
            </div>
            <div class="grid gap-2">
              <label for="mypage-image" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 프로필 이미지 </label>
              <div class="flex flex-wrap items-center gap-3">
                <input
                  id="mypage-image"
                  type="file"
                  accept="image/*"
                  class="text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-100 dark:hover:file:bg-slate-700"
                  :disabled="isProfileLoading || isProfileSaving"
                  @change="handleFileChange"
                />
                <button
                  v-if="form.profileImage"
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
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
                class="h-11 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                :disabled="isProfileLoading || isProfileSaving"
              >
                저장
              </button>
              <span v-if="saveMessage" class="text-sm font-semibold text-emerald-600">
                {{ saveMessage }}
              </span>
            </div>

            <div
              class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200/70 bg-red-50/60 px-4 py-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
            >
              <div>계정 삭제는 되돌릴 수 없습니다. 신중히 진행해주세요.</div>
              <button
                type="button"
                class="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/40"
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

        <section v-else class="ui-panel flex flex-col gap-4 p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-full border px-4 py-2 text-sm font-semibold transition"
                :class="
                  activeTab === 'articles'
                    ? 'border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                    : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800'
                "
                @click="setTab('articles')"
              >
                내 게시글
                <span v-if="articleTotalCount !== null" class="ml-1 text-xs text-slate-500 dark:text-slate-400">
                  {{ articleTotalCount }}
                </span>
              </button>
              <button
                type="button"
                class="rounded-full border px-4 py-2 text-sm font-semibold transition"
                :class="
                  activeTab === 'comments'
                    ? 'border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                    : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800'
                "
                @click="setTab('comments')"
              >
                내 댓글
                <span v-if="commentTotalCount !== null" class="ml-1 text-xs text-slate-500 dark:text-slate-400">
                  {{ commentTotalCount }}
                </span>
              </button>
              <button
                type="button"
                class="rounded-full border px-4 py-2 text-sm font-semibold transition"
                :class="
                  activeTab === 'notifications'
                    ? 'border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                    : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800'
                "
                @click="setTab('notifications')"
              >
                알림목록
                <span v-if="notificationTotalCount !== null" class="ml-1 text-xs text-slate-500 dark:text-slate-400">
                  {{ notificationTotalCount }}
                </span>
              </button>
            </div>

            <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <button
                v-if="activeTab === 'notifications' && currentList?.items.length"
                type="button"
                class="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
                :disabled="listLoading"
                @click="handleDeleteAllNotifications"
              >
                전체 삭제
              </button>
            </div>
          </div>

          <div v-if="showActivityPagination" class="grid items-center gap-3 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-[1fr_auto_1fr]">
            <div></div>
            <div class="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                class="ui-chip-button ui-chip-button-muted px-3 py-1 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!currentList?.hasPrevious || listLoading"
                @click="setPage(currentPage - 1)"
              >
                이전
              </button>
              <div v-if="showActivityPageNumbers" class="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  class="ui-chip-button ui-chip-button-muted px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60"
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
                  class="ui-chip-button px-3 py-1"
                  :class="
                    pageNumber === currentPage
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900'
                  "
                  :disabled="listLoading"
                  @click="setPage(pageNumber)"
                >
                  {{ pageNumber + 1 }}
                </button>
                <button
                  type="button"
                  class="ui-chip-button ui-chip-button-muted px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="!hasNextActivityPageWindow || listLoading"
                  aria-label="다음 페이지 묶음"
                  @click="handleNextActivityPageWindow"
                >
                  &raquo;
                </button>
              </div>
              <button
                type="button"
                class="ui-chip-button ui-chip-button-muted px-3 py-1 disabled:cursor-not-allowed disabled:opacity-60"
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

          <div v-if="listLoading" class="text-sm text-slate-500">불러오는 중...</div>
          <p v-else-if="listError" class="ui-state ui-state-danger text-sm font-semibold" role="alert">
            {{ listError }}
          </p>
          <div v-else-if="isListEmpty" class="py-6 text-center text-sm text-slate-400">{{ activityEmptyMessage }}</div>
          <div v-else class="grid gap-3">
            <div v-for="item in currentList?.items" :key="item.id" class="ui-sub-panel px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
              <button
                v-if="activeTab === 'notifications'"
                type="button"
                class="flex w-full flex-col gap-2 text-left"
                @click="handleNotificationClick(item as NotificationResponse)"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span v-if="!(item as NotificationResponse).read" class="inline-flex h-2 w-2 rounded-full bg-rose-400" aria-hidden="true"></span>
                    <div
                      class="font-semibold"
                      :class="(item as NotificationResponse).read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'"
                    >
                      {{ formatNotificationMessage(item as NotificationResponse) }}
                    </div>
                  </div>
                  <div class="text-xs text-slate-400">
                    {{ formatDate((item as NotificationResponse).createdAt) }}
                  </div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <p>알림을 눌러 상세 화면으로 이동하세요.</p>
                  <button
                    type="button"
                    class="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    @click.stop="handleDeleteNotification(item as NotificationResponse)"
                  >
                    삭제
                  </button>
                </div>
              </button>
              <button
                v-else-if="activeTab === 'articles'"
                type="button"
                class="flex w-full flex-col gap-2 text-left"
                @click="handleActivityClick(item as ArticleResponse)"
              >
                <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{{ (item as ArticleResponse).boardName }}</span>
                  <span>{{ (item as ArticleResponse).authorName }}</span>
                  <span>{{ formatDate((item as ArticleResponse).createdAt) }}</span>
                  <span v-if="(item as ArticleResponse).notice" class="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                    공지
                  </span>
                </div>
                <div class="font-semibold text-slate-900 dark:text-slate-100">
                  {{ (item as ArticleResponse).title }}
                </div>
                <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>조회 {{ (item as ArticleResponse).hit }}</span>
                  <span>댓글 {{ (item as ArticleResponse).commentCount }}</span>
                  <span>좋아요 {{ (item as ArticleResponse).likeCount }}</span>
                  <span>싫어요 {{ (item as ArticleResponse).dislikeCount }}</span>
                </div>
              </button>
              <button v-else type="button" class="flex w-full flex-col gap-2 text-left" @click="handleActivityClick(item as CommentResponse)">
                <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{{ (item as CommentResponse).boardName }}</span>
                  <span>{{ (item as CommentResponse).articleTitle }}</span>
                  <span>{{ (item as CommentResponse).authorName }}</span>
                  <span>{{ formatDate((item as CommentResponse).createdAt) }}</span>
                </div>
                <p class="line-clamp-2 text-sm text-slate-700 dark:text-slate-200">
                  {{ (item as CommentResponse).content }}
                </p>
              </button>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>

    <BaseModal :open="isDeleteModalOpen" aria-label="계정 삭제" @close="closeDeleteModal">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">계정 삭제</h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
        계정을 삭제하면 복구할 수 없습니다. 계속하려면 아래 입력창에
        <span class="font-semibold text-red-500">탈퇴</span>를 입력하세요.
      </p>
      <div class="mt-4 grid gap-2">
        <label for="delete-confirm" class="text-sm font-semibold text-slate-700 dark:text-slate-200"> 재확인 문구 </label>
        <input
          id="delete-confirm"
          v-model="deleteConfirmText"
          type="text"
          placeholder="탈퇴"
          class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
          :disabled="isDeleting"
        />
      </div>
      <p
        v-if="deleteError"
        class="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
        role="alert"
      >
        {{ deleteError }}
      </p>
      <div class="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          :disabled="isDeleting"
          @click="closeDeleteModal"
        >
          취소
        </button>
        <button
          type="button"
          class="rounded-full border border-red-300 bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-800"
          :disabled="isDeleting"
          @click="confirmDelete"
        >
          삭제
        </button>
      </div>
    </BaseModal>
  </AppShell>
</template>
