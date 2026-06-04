<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
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

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

const deleteConfirmWord = computed(() => t('myPage.deleteAccount.confirmWord'));

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
    profileError.value = error instanceof ApiError ? error.message : t('myPage.profile.errors.loadFailed');
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
    profileError.value = t('myPage.profile.errors.requiredFields');
    return;
  }
  if (form.password.trim() && form.password.trim() !== form.passwordConfirm.trim()) {
    profileError.value = t('myPage.profile.errors.passwordMismatch');
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
    saveMessage.value = t('myPage.profile.saved');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await router.push('/login');
      return;
    }
    profileError.value = error instanceof ApiError ? error.message : t('myPage.profile.errors.saveFailed');
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
  if (deleteConfirmText.value.trim() !== deleteConfirmWord.value) {
    deleteError.value = t('myPage.deleteAccount.confirmMismatch');
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
    deleteError.value = error instanceof ApiError ? error.message : t('myPage.deleteAccount.failed');
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
        <PageHeader :eyebrow="t('myPage.header.eyebrow')" :title="t('myPage.header.title')" :description="t('myPage.header.description')">
          <template #actions>
            <div class="ui-tab-list">
              <button
                type="button"
                class="ui-tab-button"
                :class="mainTab === 'activity' ? 'ui-tab-button-active' : ''"
                @click="setMainTab('activity')"
              >
                {{ t('myPage.tabs.activity') }}
              </button>
              <button type="button" class="ui-tab-button" :class="mainTab === 'profile' ? 'ui-tab-button-active' : ''" @click="setMainTab('profile')">
                {{ t('myPage.tabs.profile') }}
              </button>
            </div>
          </template>
        </PageHeader>

        <section v-if="mainTab === 'profile'" class="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
          <div class="ui-panel flex h-full flex-col gap-4 p-5">
            <div class="flex items-center gap-4">
              <div class="h-18 w-18 overflow-hidden rounded-[0.75rem] border border-line bg-surface-soft">
                <img v-if="resolvedProfileImage" :src="resolvedProfileImage" :alt="t('myPage.profile.imageAlt')" class="h-full w-full object-cover" />
                <div v-else class="flex h-full w-full items-center justify-center text-sm font-semibold text-subtle">{{ t('common.none') }}</div>
              </div>
              <div>
                <p class="text-lg font-semibold text-ink">
                  {{ profile?.displayName || profile?.userName || t('myPage.profile.defaultName') }}
                </p>
                <p class="text-sm text-muted">@{{ profile?.handle || '-' }}</p>
              </div>
            </div>

            <div class="grid gap-3 text-sm text-muted">
              <div class="flex items-center justify-between">
                <span>{{ t('myPage.profile.fields.loginId') }}</span>
                <span class="font-semibold text-ink">
                  {{ profile?.loginId || '-' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>{{ t('myPage.profile.fields.userName') }}</span>
                <span class="font-semibold text-ink">
                  {{ profile?.userName || '-' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>{{ t('myPage.profile.fields.email') }}</span>
                <span class="font-semibold text-ink">
                  {{ profile?.email || '-' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>{{ t('myPage.profile.fields.displayName') }}</span>
                <span class="font-semibold text-ink">
                  {{ profile?.displayName || '-' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span>{{ t('myPage.profile.fields.handle') }}</span>
                <span class="font-semibold text-ink">
                  {{ profile?.handle || '-' }}
                </span>
              </div>
            </div>

            <div class="ui-sub-panel px-4 py-3 text-xs text-muted">{{ t('myPage.profile.imageHint') }}</div>
          </div>

          <form class="ui-panel flex flex-col gap-4 p-5" @submit.prevent="handleSubmit">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-black tracking-tight text-ink">{{ t('myPage.profile.editTitle') }}</h2>
              <span v-if="isProfileLoading" class="text-xs text-subtle">{{ t('common.loading') }}</span>
            </div>

            <div class="grid gap-2">
              <label for="mypage-login-id" class="text-sm font-semibold text-ink"> {{ t('myPage.profile.fields.loginId') }} </label>
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
              <label for="mypage-name" class="text-sm font-semibold text-ink"> {{ t('myPage.profile.fields.userName') }} </label>
              <input id="mypage-name" v-model="form.userName" type="text" class="ui-input" :disabled="isProfileLoading || isProfileSaving" />
            </div>

            <div class="grid gap-2">
              <label for="mypage-email" class="text-sm font-semibold text-ink"> {{ t('myPage.profile.fields.email') }} </label>
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
              <label for="mypage-nickname" class="text-sm font-semibold text-ink"> {{ t('myPage.profile.fields.displayName') }} </label>
              <input id="mypage-nickname" v-model="form.displayName" type="text" class="ui-input" :disabled="isProfileLoading || isProfileSaving" />
            </div>

            <div class="grid gap-2">
              <label for="mypage-handle" class="text-sm font-semibold text-ink"> {{ t('myPage.profile.fields.handle') }} </label>
              <input id="mypage-handle" v-model="form.handle" type="text" class="ui-input" :disabled="isProfileLoading || isProfileSaving" />
            </div>

            <div class="grid gap-2">
              <label for="mypage-password" class="text-sm font-semibold text-ink"> {{ t('myPage.profile.fields.password') }} </label>
              <input
                id="mypage-password"
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                :placeholder="t('myPage.profile.passwordPlaceholder')"
                class="ui-input"
                :disabled="isProfileLoading || isProfileSaving"
              />
            </div>

            <div class="grid gap-2">
              <label for="mypage-password-confirm" class="text-sm font-semibold text-ink"> {{ t('myPage.profile.fields.passwordConfirm') }} </label>
              <input
                id="mypage-password-confirm"
                v-model="form.passwordConfirm"
                type="password"
                autocomplete="new-password"
                :placeholder="t('myPage.profile.passwordConfirmPlaceholder')"
                class="ui-input"
                :disabled="isProfileLoading || isProfileSaving"
              />
            </div>
            <div class="grid gap-2">
              <label for="mypage-image" class="text-sm font-semibold text-ink"> {{ t('myPage.profile.fields.profileImage') }} </label>
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
                  {{ t('myPage.profile.clearImage') }}
                </button>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                class="ui-button-accent h-11 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                :disabled="isProfileLoading || isProfileSaving"
              >
                {{ t('common.save') }}
              </button>
              <span v-if="saveMessage" class="text-sm font-semibold text-success">
                {{ saveMessage }}
              </span>
            </div>

            <div
              class="flex flex-wrap items-center justify-between gap-3 rounded-[0.55rem] border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
            >
              <div>{{ t('myPage.profile.deleteWarning') }}</div>
              <button
                type="button"
                class="ui-button-danger h-10 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-70"
                :disabled="isProfileSaving"
                @click="openDeleteModal"
              >
                {{ t('myPage.profile.deleteButton') }}
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
                {{ t('myPage.activity.tabs.boards') }}
                <span v-if="boardTotalCount !== null" class="ml-1 text-xs text-muted">
                  {{ boardTotalCount }}
                </span>
              </button>
              <button type="button" class="ui-tab-button" :class="activeTab === 'articles' ? 'ui-tab-button-active' : ''" @click="setTab('articles')">
                {{ t('myPage.activity.tabs.articles') }}
                <span v-if="articleTotalCount !== null" class="ml-1 text-xs text-muted">
                  {{ articleTotalCount }}
                </span>
              </button>
              <button type="button" class="ui-tab-button" :class="activeTab === 'comments' ? 'ui-tab-button-active' : ''" @click="setTab('comments')">
                {{ t('myPage.activity.tabs.comments') }}
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
                {{ t('myPage.activity.tabs.notifications') }}
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
                {{ t('myPage.activity.deleteAllNotifications') }}
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
                {{ t('common.previous') }}
              </button>
              <div v-if="showActivityPageNumbers" class="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  class="ui-button-ghost h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="!hasPreviousActivityPageWindow || listLoading"
                  :aria-label="t('myPage.activity.pagination.previousWindow')"
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
                  :aria-label="t('myPage.activity.pagination.nextWindow')"
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
                {{ t('common.next') }}
              </button>
            </div>
            <span class="justify-self-center sm:justify-self-end">
              {{ t('common.page') }} {{ currentPage + 1 }}<span v-if="currentTotalPages > 0"> / {{ currentTotalPages }}</span>
            </span>
          </div>

          <div v-if="listLoading" class="text-sm text-muted">{{ t('common.loading') }}</div>
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
                  <span v-if="item.notice" class="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">{{
                    t('article.list.notice')
                  }}</span>
                </div>
                <div class="font-semibold text-ink">{{ item.title }}</div>
                <div class="flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span>{{ t('myPage.activity.stats.views', { count: item.hit }) }}</span>
                  <span>{{ t('myPage.activity.stats.comments', { count: item.commentCount }) }}</span>
                  <span>{{ t('myPage.activity.stats.likes', { count: item.likeCount }) }}</span>
                  <span>{{ t('myPage.activity.stats.dislikes', { count: item.dislikeCount }) }}</span>
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
                  <p>{{ t('myPage.activity.notificationHint') }}</p>
                  <button type="button" class="ui-button-ghost h-8 px-3 text-[11px]" @click.stop="handleDeleteNotification(item)">
                    {{ t('common.delete') }}
                  </button>
                </div>
              </button>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>

    <BaseModal :open="isDeleteModalOpen" :aria-label="t('myPage.deleteAccount.ariaLabel')" @close="closeDeleteModal">
      <h3 class="bbs-row-title text-lg">{{ t('myPage.deleteAccount.title') }}</h3>
      <p class="mt-2 text-sm text-muted">
        {{ t('myPage.deleteAccount.description') }}
        <span class="font-semibold text-red-500">{{ deleteConfirmWord }}</span
        >{{ t('myPage.deleteAccount.descriptionSuffix') }}
      </p>
      <div class="mt-4 grid gap-2">
        <label for="delete-confirm" class="text-sm font-semibold text-ink"> {{ t('myPage.deleteAccount.confirmLabel') }} </label>
        <input id="delete-confirm" v-model="deleteConfirmText" type="text" :placeholder="deleteConfirmWord" class="ui-input" :disabled="isDeleting" />
      </div>
      <p
        v-if="deleteError"
        class="mt-3 rounded-ui border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
        role="alert"
      >
        {{ deleteError }}
      </p>
      <div class="mt-5 flex items-center justify-end gap-2">
        <button type="button" class="ui-button-ghost h-10 px-4 text-sm" :disabled="isDeleting" @click="closeDeleteModal">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="ui-button-danger h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-70"
          :disabled="isDeleting"
          @click="confirmDelete"
        >
          {{ t('common.delete') }}
        </button>
      </div>
    </BaseModal>
  </AppShell>
</template>
