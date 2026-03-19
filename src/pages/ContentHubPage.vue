<script setup lang="ts">
import AppShell from '../widgets/layout/AppShell.vue';
import PageContainer from '../shared/ui/PageContainer.vue';
import SectionHeader from '../shared/ui/SectionHeader.vue';
import ContentHubCard from '../widgets/content/ContentHubCard.vue';
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <section class="space-y-8">
        <div class="rounded-[32px] border border-slate-200/80 bg-white px-6 py-8 shadow-sm sm:px-8 dark:border-slate-800/80 dark:bg-slate-950">
          <SectionHeader eyebrow="Contents" title="콘텐츠" description="커뮤니티 바깥에서도 가볍게 둘러볼 수 있는 정보형 화면을 한곳에 모았습니다." />
        </div>

        <div class="grid gap-5 lg:grid-cols-2">
          <ContentHubCard
            title="이미지 갤러리"
            description="사진과 이미지를 주제별로 모아보는 화면은 준비 중입니다. 공개 방식과 탐색 구조를 확정한 뒤 별도 공개합니다."
            badge="준비중"
            accent="amber"
          />
          <ContentHubCard
            title="환율/금 시세"
            description="대표 환율과 금 시세의 최근 흐름을 한 화면에서 확인할 수 있습니다. 현재값과 일별 추세를 함께 제공합니다."
            to="/contents/market"
            accent="cyan"
          />
        </div>
      </section>
    </PageContainer>
  </AppShell>
</template>
