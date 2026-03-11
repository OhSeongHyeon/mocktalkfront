<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { executeArticleImport, previewArticleImport } from '../features/admin/system';
import type { ArticleImportExecuteResponse, ArticleImportPreviewResponse } from '../features/admin/system';
import { ApiError } from '../shared/lib/http/api';
import SideMenuBar from '../widgets/layout/SideMenuBar.vue';
import TopMenuBar from '../widgets/layout/TopMenuBar.vue';
import { menuCollapsed, setMenuCollapsed } from '../stores/layout';

const isMobileMenuOpen = ref(false);
const selectedZipFile = ref<File | null>(null);
const fileInputKey = ref(0);
const isPreviewLoading = ref(false);
const isExecuteLoading = ref(false);
const actionErrorMessage = ref('');
const actionSuccessMessage = ref('');
const previewResult = ref<ArticleImportPreviewResponse | null>(null);
const executeResult = ref<ArticleImportExecuteResponse | null>(null);
const autoCreateMissingCategories = ref(true);

const importSteps = [
  '1. zip 안에는 여러 .md/.markdown 파일을 넣고, 필요하면 manifest.yml 또는 manifest.yaml을 같이 넣습니다.',
  '2. manifest가 없으면 zip 안의 Markdown 파일을 자동 스캔해 미리보기 후보를 만듭니다.',
  '3. 상대경로 이미지 Markdown 문법과 HTML video/source 태그는 현재 Markdown 파일 위치 기준으로 해석합니다.',
  '4. !youtube[...] 문법은 미리보기에서 검사하고, 해석에 성공하면 렌더 시 임베드로 표시됩니다.',
  '5. 카테고리 자동 생성이 켜져 있으면 없는 카테고리는 미리보기에서 생성 예정으로 표시됩니다.',
  '6. 미리보기에서 실행 가능한 항목이 있을 때만 일괄 생성을 실행합니다.',
  '7. 실행 결과에서 생성 성공/실패와 업로드된 본문 assets 수를 다시 확인합니다.',
];

const metadataRules = [
  'title: manifest 항목 > Markdown frontmatter > 파일명 순서로 결정됩니다.',
  'boardSlug: manifest 항목 > Markdown frontmatter > defaults 순서로 결정됩니다.',
  'categoryName: manifest 항목 > Markdown frontmatter > defaults 순서로 결정됩니다.',
  'visibility: manifest 항목 > Markdown frontmatter > defaults > PUBLIC 순서로 결정됩니다.',
  '저장 시 title, boardSlug, categoryName, visibility는 최종 적용값 기준으로 frontmatter에 다시 정리됩니다.',
  'tags, summary, 미지원 사용자 정의 frontmatter 키는 지우지 않고 content_source 원본에 그대로 보존합니다.',
];

const unsupportedNotes = [
  'frontmatter의 tags, summary, 미지원 필드는 content_source 원본에 보존되며 별도 UI에는 아직 자동 반영되지 않습니다.',
  '첨부파일은 기존처럼 별도 업로드 대상이며, 대량 임포트에서 자동 업로드하지 않습니다.',
  '일반 iframe/embed 외부 임베드는 허용하지 않고, Markdown 유튜브는 !youtube[...] 문법만 지원합니다.',
  '로컬 이미지/동영상 assets는 파일당 최대 50MB까지 허용합니다.',
  '상대경로는 현재 Markdown 파일 위치 기준으로 계산하므로 ./assets 경로가 항상 맞는 것은 아닙니다.',
];

const sampleZipStructure = `batch-import.zip
├─ manifest.yml                # 선택
├─ posts/
│  ├─ post-1.md
│  └─ post-2.md
└─ assets/
   ├─ cover.png
   └─ demo.mp4`;

const sampleManifest = `defaults:
  boardSlug: dev
  categoryName: "백엔드"
  visibility: PUBLIC

articles:
  - file: posts/post-1.md
  - file: posts/post-2.md
    title: "manifest 제목 우선"
    boardSlug: notice
    categoryName: "공지"
    visibility: MEMBERS`;

const sampleMarkdown = `---
title: "Mermaid 사용기"
boardSlug: "dev"
categoryName: "백엔드"
visibility: "PUBLIC"
---

# 본문 시작

![대표 이미지](../assets/cover.png)

!youtube[dQw4w9WgXcQ]

<video controls src="../assets/demo.mp4"></video>`;

const formatPreviewAssetSummary = (item: ArticleImportPreviewResponse['items'][number]) => {
  const parts = [`이미지 ${item.relativeImageCount}`, `동영상 ${item.relativeVideoCount}`, `유튜브 ${item.youtubeEmbedCount}`];
  const issues: string[] = [];
  if (item.missingAssetCount > 0) {
    issues.push(`누락 ${item.missingAssetCount}`);
  }
  if (item.oversizedAssetCount > 0) {
    issues.push(`용량초과 ${item.oversizedAssetCount}`);
  }
  if (item.unsupportedAssetCount > 0) {
    issues.push(`미지원 ${item.unsupportedAssetCount}`);
  }
  return issues.length > 0 ? `${parts.join(' · ')} / ${issues.join(' · ')}` : parts.join(' · ');
};

const formatExecuteAssetSummary = (item: ArticleImportExecuteResponse['items'][number]) => {
  return `이미지 ${item.uploadedImageCount} · 동영상 ${item.uploadedVideoCount} · 유튜브 ${item.youtubeEmbedCount}`;
};

const resolveCreatedArticlePath = (item: ArticleImportExecuteResponse['items'][number]) => {
  if (!item.created || !item.articleId || !item.boardSlug) {
    return null;
  }
  return `/b/${item.boardSlug}/articles/${item.articleId}`;
};

const resolveExecuteCardClass = (item: ArticleImportExecuteResponse['items'][number]) => {
  if (item.created && item.articleId && item.boardSlug) {
    return 'border-emerald-200 bg-emerald-50/60 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/10 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20';
  }
  return 'border-rose-200 bg-rose-50/40 dark:border-rose-900/60 dark:bg-rose-950/10';
};

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

const selectedFileName = computed(() => selectedZipFile.value?.name ?? '선택된 zip 파일이 없습니다.');

const canExecute = computed(() => {
  return Boolean(selectedZipFile.value && previewResult.value?.canExecute && !isPreviewLoading.value && !isExecuteLoading.value);
});

const resolveErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  return fallback;
};

const resetSelection = () => {
  selectedZipFile.value = null;
  previewResult.value = null;
  executeResult.value = null;
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  fileInputKey.value += 1;
};

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0] ?? null;
  selectedZipFile.value = file;
  previewResult.value = null;
  executeResult.value = null;
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  if (target) {
    target.value = '';
  }
};

const runPreview = async () => {
  if (!selectedZipFile.value) {
    actionErrorMessage.value = '미리볼 zip 파일을 먼저 선택해 주세요.';
    return;
  }
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  previewResult.value = null;
  executeResult.value = null;
  isPreviewLoading.value = true;
  try {
    previewResult.value = await previewArticleImport(selectedZipFile.value, autoCreateMissingCategories.value);
  } catch (error) {
    actionErrorMessage.value = resolveErrorMessage(error, '임포트 미리보기에 실패했습니다.');
  } finally {
    isPreviewLoading.value = false;
  }
};

const runExecute = async () => {
  if (!selectedZipFile.value) {
    actionErrorMessage.value = '실행할 zip 파일을 먼저 선택해 주세요.';
    return;
  }
  if (!previewResult.value?.canExecute) {
    actionErrorMessage.value = '먼저 미리보기 결과에서 실행 가능한 항목이 있는지 확인해 주세요.';
    return;
  }
  actionErrorMessage.value = '';
  actionSuccessMessage.value = '';
  isExecuteLoading.value = true;
  try {
    const response = await executeArticleImport(selectedZipFile.value, autoCreateMissingCategories.value);
    executeResult.value = response;
    actionSuccessMessage.value = `총 ${response.successCount}건 생성, ${response.failedCount}건 실패했습니다.`;
  } catch (error) {
    actionErrorMessage.value = resolveErrorMessage(error, '대량 임포트 실행에 실패했습니다.');
  } finally {
    isExecuteLoading.value = false;
  }
};

const resolveStatusBadgeClass = (executable: boolean) => {
  return executable
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
    : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300';
};
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden text-slate-900 dark:text-slate-100">
    <TopMenuBar @toggle-menu="toggleMenu" />
    <div class="flex min-h-0 w-full flex-1 overflow-hidden">
      <SideMenuBar :collapsed="menuCollapsed" :mobile-open="isMobileMenuOpen" @close="closeMobileMenu" />
      <main class="min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-6xl">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">게시글 대량 임포트</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                <code class="font-mono text-[0.95em]">여러 .md/.markdown + 선택적 manifest + 본문 assets + zip</code>
                구조를 미리 검증하고 일괄 생성합니다.
              </p>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Markdown 원본과 frontmatter는 <code class="font-mono text-[0.95em]">content_source</code>에 함께 보존됩니다.
              </p>
            </div>
          </div>

          <section class="ui-panel mt-6 p-5">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">사용 가이드</h2>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  이 화면은 <code class="font-mono text-[0.95em]">ADMIN</code>, <code class="font-mono text-[0.95em]">MANAGER</code> 전용입니다.
                  <span class="mt-1 block">기본값은 <code class="font-mono text-[0.95em]">카테고리 자동 생성 켜짐</code>입니다.</span>
                </p>
              </div>
              <span
                class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              >
                preview → execute
              </span>
            </div>

            <div class="mt-5 grid gap-4 xl:grid-cols-2">
              <div class="rounded-3xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">권장 zip 구조</h3>
                <pre
                  class="ui-scrollbar mt-3 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100"
                ><code>{{ sampleZipStructure }}</code></pre>
                <p class="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">
                  <code class="font-mono text-[0.95em]">manifest.yml</code>은 선택입니다. 없으면 zip 안의 Markdown 파일을 자동 스캔합니다.
                </p>
              </div>

              <div class="rounded-3xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">실행 순서</h3>
                <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  <li v-for="step in importSteps" :key="step">{{ step }}</li>
                </ul>
              </div>

              <div class="rounded-3xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">메타데이터 우선순위</h3>
                <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  <li v-for="rule in metadataRules" :key="rule">{{ rule }}</li>
                </ul>
              </div>

              <div class="rounded-3xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">manifest 예시</h3>
                <pre
                  class="ui-scrollbar mt-3 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100"
                ><code>{{ sampleManifest }}</code></pre>
              </div>

              <div class="rounded-3xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Markdown 예시</h3>
                <pre
                  class="ui-scrollbar mt-3 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100"
                ><code>{{ sampleMarkdown }}</code></pre>
                <p class="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">
                  저장 시 <code class="font-mono text-[0.95em]">title</code>, <code class="font-mono text-[0.95em]">boardSlug</code>,
                  <code class="font-mono text-[0.95em]">categoryName</code>, <code class="font-mono text-[0.95em]">visibility</code>는 현재 적용값으로
                  다시 정리되고, 나머지 frontmatter는 원본 그대로 보존됩니다.
                </p>
              </div>
            </div>

            <div class="mt-4 rounded-3xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <h3 class="text-sm font-semibold text-amber-900 dark:text-amber-100">현재 제한 사항</h3>
              <ul class="mt-3 space-y-2 text-sm leading-6 text-amber-800 dark:text-amber-200">
                <li v-for="note in unsupportedNotes" :key="note">{{ note }}</li>
                <li>카테고리 자동 생성이 켜져 있으면 없는 카테고리는 오류 대신 생성 예정으로 처리하고, 실행 시 실제로 생성합니다.</li>
              </ul>
            </div>
          </section>

          <section class="ui-panel mt-6 p-5">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div class="space-y-2">
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">업로드 파일</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ selectedFileName }}</p>
                <p class="text-xs text-slate-400">
                  <code class="font-mono text-[0.95em]">manifest.yml</code>은 선택입니다. 없으면 zip 안의
                  <code class="font-mono text-[0.95em]">.md</code>/<code class="font-mono text-[0.95em]">.markdown</code>
                  파일을 자동 스캔합니다.
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <label
                  class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <input
                    v-model="autoCreateMissingCategories"
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-900"
                  />
                  <span>카테고리 자동 생성</span>
                </label>
                <label
                  class="inline-flex cursor-pointer items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  zip 선택
                  <input
                    :key="fileInputKey"
                    type="file"
                    class="hidden"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    @change="onFileChange"
                  />
                </label>
                <button
                  type="button"
                  class="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                  :disabled="!selectedZipFile || isPreviewLoading || isExecuteLoading"
                  @click="runPreview"
                >
                  {{ isPreviewLoading ? '분석 중...' : '미리보기' }}
                </button>
                <button
                  type="button"
                  class="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="!canExecute"
                  @click="runExecute"
                >
                  {{ isExecuteLoading ? '생성 중...' : '일괄 생성' }}
                </button>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                  :disabled="isPreviewLoading || isExecuteLoading"
                  @click="resetSelection"
                >
                  초기화
                </button>
              </div>
            </div>
          </section>

          <div v-if="actionErrorMessage" class="ui-state ui-state-danger mt-6">
            {{ actionErrorMessage }}
          </div>
          <div v-if="actionSuccessMessage" class="ui-state ui-state-success mt-6">
            {{ actionSuccessMessage }}
          </div>

          <section v-if="previewResult" class="ui-panel mt-6 p-5">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">미리보기 결과</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">
                  총 {{ previewResult.totalCount }}건 중 {{ previewResult.executableCount }}건 실행 가능, {{ previewResult.invalidCount }}건 검토 필요
                </p>
              </div>
              <span class="rounded-full border px-3 py-1 text-xs font-semibold" :class="resolveStatusBadgeClass(previewResult.canExecute)">
                {{ previewResult.canExecute ? '실행 가능' : '실행 불가' }}
              </span>
            </div>

            <div class="mt-4 overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead>
                  <tr class="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <th class="px-3 py-3">파일</th>
                    <th class="px-3 py-3">제목</th>
                    <th class="px-3 py-3">게시판</th>
                    <th class="px-3 py-3">카테고리</th>
                    <th class="px-3 py-3">공개 범위</th>
                    <th class="px-3 py-3">본문 assets</th>
                    <th class="px-3 py-3">상태</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-900">
                  <tr v-for="item in previewResult.items" :key="item.filePath">
                    <td class="px-3 py-4 align-top text-slate-600 dark:text-slate-300">{{ item.filePath }}</td>
                    <td class="px-3 py-4 align-top font-medium text-slate-900 dark:text-slate-100">{{ item.title ?? '-' }}</td>
                    <td class="px-3 py-4 align-top text-slate-600 dark:text-slate-300">{{ item.boardSlug ?? '-' }}</td>
                    <td class="px-3 py-4 align-top text-slate-600 dark:text-slate-300">{{ item.categoryName ?? '-' }}</td>
                    <td class="px-3 py-4 align-top text-slate-600 dark:text-slate-300">{{ item.visibility ?? '-' }}</td>
                    <td class="px-3 py-4 align-top text-xs text-slate-500 dark:text-slate-400">
                      {{ formatPreviewAssetSummary(item) }}
                    </td>
                    <td class="px-3 py-4 align-top">
                      <span class="rounded-full border px-2.5 py-1 text-xs font-semibold" :class="resolveStatusBadgeClass(item.executable)">
                        {{ item.executable ? '실행 가능' : '확인 필요' }}
                      </span>
                      <ul v-if="item.warnings.length > 0" class="mt-2 space-y-1 text-xs text-amber-600 dark:text-amber-300">
                        <li v-for="warning in item.warnings" :key="`${item.filePath}-${warning}`">{{ warning }}</li>
                      </ul>
                      <ul v-if="item.errors.length > 0" class="mt-2 space-y-1 text-xs text-rose-600 dark:text-rose-300">
                        <li v-for="error in item.errors" :key="`${item.filePath}-${error}`">{{ error }}</li>
                      </ul>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-if="executeResult" class="ui-panel mt-6 p-5">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">실행 결과</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">
                  총 {{ executeResult.totalCount }}건 중 {{ executeResult.successCount }}건 생성, {{ executeResult.failedCount }}건 실패
                </p>
              </div>
            </div>

            <div class="mt-4 space-y-3">
              <component
                :is="resolveCreatedArticlePath(item) ? RouterLink : 'div'"
                v-for="item in executeResult.items"
                :key="`${item.filePath}-${item.articleId ?? 'failed'}`"
                :to="resolveCreatedArticlePath(item) ?? undefined"
                class="block rounded-2xl border p-4"
                :class="resolveExecuteCardClass(item)"
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ item.title ?? item.filePath }}</p>
                      <span
                        v-if="resolveCreatedArticlePath(item)"
                        class="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-300"
                      >
                        클릭해서 글 보기
                      </span>
                    </div>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {{ item.filePath }} · {{ item.boardSlug ?? '-' }} · {{ item.categoryName ?? '-' }} · {{ item.visibility ?? '-' }}
                    </p>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {{ formatExecuteAssetSummary(item) }}
                    </p>
                  </div>
                  <span class="rounded-full border px-2.5 py-1 text-xs font-semibold" :class="resolveStatusBadgeClass(item.created)">
                    {{ item.created ? `생성 완료 #${item.articleId}` : '생성 실패' }}
                  </span>
                </div>
                <ul v-if="item.warnings.length > 0" class="mt-3 space-y-1 text-xs text-amber-600 dark:text-amber-300">
                  <li v-for="warning in item.warnings" :key="`${item.filePath}-warn-${warning}`">{{ warning }}</li>
                </ul>
                <ul v-if="item.errors.length > 0" class="mt-3 space-y-1 text-xs text-rose-600 dark:text-rose-300">
                  <li v-for="error in item.errors" :key="`${item.filePath}-err-${error}`">{{ error }}</li>
                </ul>
              </component>
            </div>
          </section>
        </div>
      </main>
    </div>
  </div>
</template>
