<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import ConfirmModal from '../components/ConfirmModal.vue';
import SideMenuBar from '../components/SideMenuBar.vue';
import TopMenuBar from '../components/TopMenuBar.vue';
import { clearHistoryItems, getHistoryItems, removeHistoryItem } from '../lib/history';
import type { HistoryItem } from '../lib/history';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

const router = useRouter();
const isMobileMenuOpen = ref(false);
const items = ref<HistoryItem[]>([]);
const searchKeyword = ref('');
const isClearModalOpen = ref(false);

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

const loadHistory = () => {
  items.value = getHistoryItems();
};

const filteredItems = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return items.value;
  }
  return items.value.filter((item) => {
    const title = item.title.toLowerCase();
    const boardName = (item.boardName ?? '').toLowerCase();
    const boardSlug = item.boardSlug.toLowerCase();
    return title.includes(keyword) || boardName.includes(keyword) || boardSlug.includes(keyword);
  });
});

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
};

const goArticle = async (item: HistoryItem) => {
  await router.push(`/b/${item.boardSlug}/articles/${item.articleId}`);
};

const handleRemove = (item: HistoryItem) => {
  removeHistoryItem(item.articleId);
  items.value = items.value.filter((value) => value.articleId !== item.articleId);
};

const handleClear = () => {
  if (!items.value.length) {
    return;
  }
  clearHistoryItems();
  items.value = [];
  isClearModalOpen.value = false;
};

const openClearModal = () => {
  if (!items.value.length) {
    return;
  }
  isClearModalOpen.value = true;
};

const closeClearModal = () => {
  isClearModalOpen.value = false;
};

onMounted(async () => {
  await nextTick();
  loadHistory();
});
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-5xl">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">기록</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">최근 열람한 게시글을 확인할 수 있습니다. 이 기록은 브라우저에만 저장됩니다.</p>
            </div>
            <button
              type="button"
              class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
              @click="openClearModal"
            >
              전체 삭제
            </button>
          </div>

          <div class="mt-6 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
            <div class="flex flex-wrap items-center gap-3">
              <input
                v-model="searchKeyword"
                type="search"
                class="h-10 min-w-[200px] flex-1 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                placeholder="제목, 게시판명, 슬러그 검색"
              />
              <span class="text-xs font-semibold text-slate-400">총 {{ filteredItems.length }}건</span>
            </div>
          </div>

          <div v-if="filteredItems.length > 0" class="mt-6 flex flex-col gap-3">
            <div
              v-for="item in filteredItems"
              :key="item.articleId"
              class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950"
            >
              <button type="button" class="flex min-w-0 flex-1 flex-col gap-1 text-left" @click="goArticle(item)">
                <p class="text-xs font-semibold text-slate-400">
                  {{ item.boardName ?? item.boardSlug }}
                  <span class="ml-2 text-[11px] text-slate-300">{{ item.boardSlug }}</span>
                </p>
                <p class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {{ item.title }}
                </p>
                <p class="text-xs text-slate-400">방문 {{ formatDate(item.visitedAt) }}</p>
              </button>
              <button
                type="button"
                class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 dark:border-rose-800 dark:text-rose-300"
                @click="handleRemove(item)"
              >
                삭제
              </button>
            </div>
          </div>

          <div
            v-else
            class="mt-10 rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
          >
            기록이 없습니다.
          </div>
        </div>
      </main>
    </div>

    <ConfirmModal
      :open="isClearModalOpen"
      title="기록 전체 삭제"
      description="기록을 모두 삭제할까요? 삭제한 기록은 복구할 수 없습니다."
      confirm-label="삭제"
      confirm-variant="danger"
      @close="closeClearModal"
      @confirm="handleClear"
    />
  </div>
</template>
