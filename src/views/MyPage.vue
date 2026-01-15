<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { ApiError } from '../lib/api';
import { resolveFileUrl } from '../lib/files';
import { applyProfileSummary } from '../lib/profile';
import { logout } from '../services/auth';
import {
  deleteMyAccount,
  getMyArticles,
  getMyComments,
  getMyProfile,
  updateMyProfile,
} from '../services/mypage';
import type {
  ArticleResponse,
  CommentResponse,
  PageResponse,
  UserProfileResponse,
} from '../services/mypage';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';
import { clearAccessToken } from '../stores/auth';

const router = useRouter();
const isMobileMenuOpen = ref(false);

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
const activeTab = ref<'articles' | 'comments'>('articles');
const listLoading = ref(false);
const listError = ref('');
const articles = ref<PageResponse<ArticleResponse> | null>(null);
const comments = ref<PageResponse<CommentResponse> | null>(null);
const articlePage = ref(0);
const commentPage = ref(0);
const pageSize = 10;

const isDeleteModalOpen = ref(false);
const deleteConfirmText = ref('');
const deleteError = ref('');
const isDeleting = ref(false);

const toggleMenu = () => {
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
    return;
  }
  setMenuCollapsed(!menuCollapsed.value);
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

const setMainTab = (tab: 'activity' | 'profile') => {
  mainTab.value = tab;
};

const resolvedProfileImage = computed(() => {
  if (previewUrl.value) {
    return previewUrl.value;
  }
  return resolveFileUrl(profile.value?.profileImage?.storageKey ?? null);
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

const loadArticles = async (page = 0) => {
  listError.value = '';
  listLoading.value = true;
  try {
    const data = await getMyArticles(page, pageSize);
    articles.value = data;
    articlePage.value = data.page;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await router.push('/login');
      return;
    }
    listError.value = error instanceof ApiError ? error.message : '게시글 조회에 실패했습니다.';
  } finally {
    listLoading.value = false;
  }
};

const loadComments = async (page = 0) => {
  listError.value = '';
  listLoading.value = true;
  try {
    const data = await getMyComments(page, pageSize);
    comments.value = data;
    commentPage.value = data.page;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await router.push('/login');
      return;
    }
    listError.value = error instanceof ApiError ? error.message : '댓글 조회에 실패했습니다.';
  } finally {
    listLoading.value = false;
  }
};

const loadActiveTab = async () => {
  if (activeTab.value === 'articles') {
    await loadArticles(articlePage.value);
    return;
  }
  await loadComments(commentPage.value);
};

const setTab = async (tab: 'articles' | 'comments') => {
  activeTab.value = tab;
  await loadActiveTab();
};

const setPage = async (page: number) => {
  if (activeTab.value === 'articles') {
    await loadArticles(page);
    return;
  }
  await loadComments(page);
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

const currentList = computed(() => {
  return activeTab.value === 'articles' ? articles.value : comments.value;
});

const isListEmpty = computed(() => {
  const data = currentList.value;
  return !data || data.items.length === 0;
});

const currentPage = computed(() => {
  return activeTab.value === 'articles' ? articlePage.value : commentPage.value;
});

onMounted(async () => {
  const ok = await loadProfile();
  if (ok) {
    await loadArticles(articlePage.value);
  }
});

onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900 dark:text-slate-100">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar
        :collapsed="menuCollapsed"
        :mobile-open="isMobileMenuOpen"
        @close="closeMobileMenu"
      />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <section
            class="flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">My Page</p>
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">
                  나의 프로필 관리
                </h1>
                <p class="text-sm text-slate-500 dark:text-slate-400">
                  프로필 정보를 수정하고 내 활동을 확인하세요.
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-full px-4 py-2 text-sm font-semibold transition"
                  :class="
                    mainTab === 'activity'
                      ? 'bg-[color:var(--accent-soft)] text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  "
                  @click="setMainTab('activity')"
                >
                  활동기록
                </button>
                <button
                  type="button"
                  class="rounded-full px-4 py-2 text-sm font-semibold transition"
                  :class="
                    mainTab === 'profile'
                      ? 'bg-[color:var(--accent-soft)] text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  "
                  @click="setMainTab('profile')"
                >
                  프로필 수정
                </button>
              </div>
            </div>
          </section>

          <section v-if="mainTab === 'profile'" class="grid gap-6 lg:grid-cols-[1.1fr_1.3fr]">
            <div
              class="flex h-full flex-col gap-5 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80"
            >
              <div class="flex items-center gap-4">
                <div
                  class="h-20 w-20 overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-100 dark:border-slate-800/80 dark:bg-slate-900"
                >
                  <img
                    v-if="resolvedProfileImage"
                    :src="resolvedProfileImage"
                    alt="프로필 이미지"
                    class="h-full w-full object-cover"
                  />
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-400"
                  >
                    없음
                  </div>
                </div>
                <div>
                  <p class="text-lg font-semibold text-slate-900 dark:text-white">
                    {{ profile?.displayName || profile?.userName || '사용자' }}
                  </p>
                  <p class="text-sm text-slate-500 dark:text-slate-400">
                    @{{ profile?.handle || '-' }}
                  </p>
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

              <div
                class="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-400"
              >
                프로필 이미지 업로드는 이미지 파일만 가능합니다.
              </div>
            </div>

            <form
              class="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80"
              @submit.prevent="handleSubmit"
            >
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold text-slate-900 dark:text-white">프로필 수정</h2>
                <span v-if="isProfileLoading" class="text-xs text-slate-400">불러오는 중...</span>
              </div>

              <div class="grid gap-2">
                <label
                  for="mypage-login-id"
                  class="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  아이디
                </label>
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
                <label
                  for="mypage-name"
                  class="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  이름
                </label>
                <input
                  id="mypage-name"
                  v-model="form.userName"
                  type="text"
                  class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                  :disabled="isProfileLoading || isProfileSaving"
                />
              </div>

              <div class="grid gap-2">
                <label
                  for="mypage-email"
                  class="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  이메일
                </label>
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
                <label
                  for="mypage-nickname"
                  class="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  닉네임
                </label>
                <input
                  id="mypage-nickname"
                  v-model="form.displayName"
                  type="text"
                  class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                  :disabled="isProfileLoading || isProfileSaving"
                />
              </div>

              <div class="grid gap-2">
                <label
                  for="mypage-handle"
                  class="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  핸들
                </label>
                <input
                  id="mypage-handle"
                  v-model="form.handle"
                  type="text"
                  class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                  :disabled="isProfileLoading || isProfileSaving"
                />
              </div>

              <div class="grid gap-2">
                <label
                  for="mypage-password"
                  class="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  비밀번호
                </label>
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
                <label
                  for="mypage-password-confirm"
                  class="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  비밀번호 확인
                </label>
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
                <label
                  for="mypage-image"
                  class="text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  프로필 이미지
                </label>
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

              <p
                v-if="profileError"
                class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
                role="alert"
              >
                {{ profileError }}
              </p>
            </form>
          </section>

          <section
            v-else
            class="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex gap-2">
                <button
                  type="button"
                  class="rounded-full px-4 py-2 text-sm font-semibold transition"
                  :class="
                    activeTab === 'articles'
                      ? 'bg-[color:var(--accent-soft)] text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  "
                  @click="setTab('articles')"
                >
                  내 게시글
                </button>
                <button
                  type="button"
                  class="rounded-full px-4 py-2 text-sm font-semibold transition"
                  :class="
                    activeTab === 'comments'
                      ? 'bg-[color:var(--accent-soft)] text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  "
                  @click="setTab('comments')"
                >
                  내 댓글
                </button>
              </div>

              <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  :disabled="!currentList?.hasPrevious || listLoading"
                  @click="setPage(currentPage - 1)"
                >
                  이전
                </button>
                <span>페이지 {{ (currentPage ?? 0) + 1 }}</span>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  :disabled="!currentList?.hasNext || listLoading"
                  @click="setPage(currentPage + 1)"
                >
                  다음
                </button>
              </div>
            </div>

            <div v-if="listLoading" class="text-sm text-slate-500">불러오는 중...</div>
            <p
              v-else-if="listError"
              class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {{ listError }}
            </p>
            <div v-else-if="isListEmpty" class="py-6 text-center text-sm text-slate-400">
              아직 작성한 항목이 없습니다.
            </div>
            <div v-else class="grid gap-3">
              <div
                v-for="item in currentList?.items"
                :key="item.id"
                class="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-200"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="font-semibold text-slate-900 dark:text-white">
                    {{ activeTab === 'articles' ? (item as ArticleResponse).title : '댓글' }}
                  </div>
                  <div class="text-xs text-slate-400">
                    {{ formatDate(item.createdAt) }}
                  </div>
                </div>
                <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {{
                    activeTab === 'articles'
                      ? (item as ArticleResponse).content
                      : (item as CommentResponse).content
                  }}
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>

    <div
      v-if="isDeleteModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="absolute inset-0 bg-slate-900/40" @click="closeDeleteModal"></div>
      <div
        class="relative w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950"
      >
        <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">계정 삭제</h3>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          계정을 삭제하면 복구할 수 없습니다. 계속하려면 아래 입력창에
          <span class="font-semibold text-red-500">탈퇴</span>를 입력하세요.
        </p>
        <div class="mt-4 grid gap-2">
          <label
            for="delete-confirm"
            class="text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            재확인 문구
          </label>
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
      </div>
    </div>
  </div>
</template>
