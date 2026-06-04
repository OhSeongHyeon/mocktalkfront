<script setup lang="ts">
import AppShell from '../widgets/layout/AppShell.vue';
import PageContainer from '../shared/ui/PageContainer.vue';
import PageHeader from '../shared/ui/PageHeader.vue';
import ContentHubCard from '../widgets/content/ContentHubCard.vue';
</script>

<template>
  <AppShell>
    <PageContainer width="wide">
      <section class="space-y-4">
        <PageHeader eyebrow="Contents" title="콘텐츠" />

        <div class="grid gap-4 lg:grid-cols-2">
          <ContentHubCard
            title="이미지 갤러리"
            description="사진과 이미지를 주제별로 모아보는 화면은 준비 중입니다. 공개 방식과 탐색 구조를 확정한 뒤 별도 공개합니다."
            badge="준비중"
          />
          <ContentHubCard
            title="환율/금 시세"
            description="대표 환율과 금 시세의 최근 흐름을 한 화면에서 확인할 수 있습니다. 현재값과 일별 추세를 함께 제공합니다."
            to="/contents/market"
          />
        </div>
      </section>
    </PageContainer>
  </AppShell>
</template>
