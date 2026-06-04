const content = {
  hub: {
    eyebrow: 'Contents',
    title: '콘텐츠',
    gallery: {
      title: '이미지 갤러리',
      description: '사진과 이미지를 주제별로 모아보는 화면은 준비 중입니다. 공개 방식과 탐색 구조를 확정한 뒤 별도 공개합니다.',
      badge: '준비중',
    },
    market: {
      title: '환율/금 시세',
      description: '대표 환율과 금 시세의 최근 흐름을 한 화면에서 확인할 수 있습니다. 현재값과 일별 추세를 함께 제공합니다.',
    },
  },
  card: {
    viewNow: '지금 확인하기',
    comingSoon: '곧 공개됩니다',
  },
  market: {
    page: {
      eyebrow: 'Market',
      title: '환율 / 금 시세',
      description: '무료 데이터 소스를 기준으로 하루 1회 수집한 스냅샷을 보여줍니다. 금 시세는 1트로이온스 원본값을 1g 기준으로 환산해 표시합니다.',
      refresh: '새로고침',
      lastUpdated: '마지막 갱신 {label}',
      accumulating: '데이터를 축적하는 중입니다.',
    },
    period: {
      tenYear: '10년',
      fiveYear: '5년',
      threeYear: '3년',
      year: '1년',
      halfYear: '6개월',
      quarter: '3개월',
      month: '30일',
      week: '7일',
      custom: '직접 선택',
      customRange: '{start} ~ {end}',
    },
    overview: {
      label: 'Overview',
      title: '통합 그래프',
      description:
        '전체 종목 흐름을 한 번에 보고, 아래 탭에서 원하는 종목만 따로 자세히 확인할 수 있습니다. 통합 그래프는 기준일을 100으로 맞춘 상대 비교 그래프이고, 금 시세는 화면에서 1g 기준으로 보여줍니다.',
      selectedRange: '선택 범위 {label}',
      periodTabsAria: '시세 기간 전환',
      startDate: '시작일',
      endDate: '종료일',
      applyCustom: '직접 선택 적용',
      combinedChartTitle: '전체 시세 흐름 (기준일=100)',
      combinedChartLoading: '{label} 통합 그래프를 불러오는 중입니다.',
      yAxisGuideTitle: '통합그래프 y축 안내',
      yAxisGuideBody:
        'y축 숫자는 실제 환율/금액이 아니라 기준일 값을 100으로 둔 상대지수입니다. 예를 들어 110은 기준일 대비 약 10% 상승, 95는 약 5% 하락을 뜻합니다.',
      yAxisGuideHighlight: '기준일 값을 100으로 둔 상대지수',
      insufficientSeries: '표시할 수 있는 시계열 데이터가 아직 충분히 쌓이지 않았습니다.',
      loadingOverview: '시세 요약 정보를 불러오는 중입니다.',
      noData: '아직 집계된 시세 데이터가 없습니다. 배포 후 첫 수집이 완료되면 그래프를 확인할 수 있습니다.',
    },
    selector: {
      label: 'Selector',
      title: '종목 선택',
      ariaLabel: '시세 종목 선택',
    },
    detail: {
      label: 'Detail',
      fxSubtitle: '선택한 환율 종목 상세',
      metalSubtitle: '선택한 금 시세 종목 상세 (1g 기준)',
      currentValue: '현재 값',
      change: '변동',
      avg: '기간 평균값',
      median: '기간 중위값',
      min: '기간 최저값',
      max: '기간 최고값',
      insufficientDetail: '선택한 기간의 시세 데이터가 아직 충분히 쌓이지 않았습니다.',
    },
    group: {
      fx: '환율',
      metal: '금 시세',
    },
    goldDisplayName: '금 시세 ({currency}/g)',
    noChangeData: '변화 데이터 없음',
    errors: {
      overview: '시세 요약 정보를 불러오지 못했습니다.',
      series: '시계열 데이터를 불러오지 못했습니다.',
      seriesPartial: '일부 종목의 시계열 데이터를 불러오지 못했습니다.',
      customRangeRequired: '직접 선택 기간은 시작일과 종료일을 함께 입력해야 합니다.',
      startAfterEnd: '시작일은 종료일보다 늦을 수 없습니다.',
    },
  },
} as const;

export default content;
