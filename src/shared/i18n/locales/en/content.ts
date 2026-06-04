const content = {
  hub: {
    eyebrow: 'Contents',
    title: 'Contents',
    gallery: {
      title: 'Image gallery',
      description: 'The themed photo gallery is in preparation. It will launch after we finalize visibility and browsing structure.',
      badge: 'Soon',
    },
    market: {
      title: 'FX & gold rates',
      description: 'View recent FX and gold trends on one screen, including current values and daily movement.',
    },
  },
  card: {
    viewNow: 'View now',
    comingSoon: 'Coming soon',
  },
  market: {
    page: {
      eyebrow: 'Market',
      title: 'FX / gold rates',
      description: 'Daily snapshots from free data sources. Gold prices are converted from troy ounce values to per-gram on screen.',
      refresh: 'Refresh',
      lastUpdated: 'Last updated {label}',
      accumulating: 'Accumulating data...',
    },
    period: {
      tenYear: '10 years',
      fiveYear: '5 years',
      threeYear: '3 years',
      year: '1 year',
      halfYear: '6 months',
      quarter: '3 months',
      month: '30 days',
      week: '7 days',
      custom: 'Custom range',
      customRange: '{start} – {end}',
    },
    overview: {
      label: 'Overview',
      title: 'Combined chart',
      description:
        'See all instruments at once, then inspect a single instrument below. The combined chart is indexed to 100 on the base date; gold is shown per gram.',
      selectedRange: 'Range {label}',
      periodTabsAria: 'Market period',
      startDate: 'Start date',
      endDate: 'End date',
      applyCustom: 'Apply custom range',
      combinedChartTitle: 'All instruments (base date = 100)',
      combinedChartLoading: 'Loading combined chart for {label}...',
      yAxisGuideTitle: 'Combined chart Y-axis',
      yAxisGuideBody:
        'Values are relative indices with the base date at 100, not absolute FX/gold prices. For example, 110 means about +10% and 95 about −5% from the base date.',
      yAxisGuideHighlight: 'relative index with base date at 100',
      insufficientSeries: 'Not enough time-series data to display yet.',
      loadingOverview: 'Loading market overview...',
      noData: 'No aggregated market data yet. Charts appear after the first collection completes.',
    },
    selector: {
      label: 'Selector',
      title: 'Choose instrument',
      ariaLabel: 'Market instrument',
    },
    detail: {
      label: 'Detail',
      fxSubtitle: 'Selected FX instrument',
      metalSubtitle: 'Selected gold instrument (per gram)',
      currentValue: 'Current',
      change: 'Change',
      avg: 'Period average',
      median: 'Period median',
      min: 'Period low',
      max: 'Period high',
      insufficientDetail: 'Not enough data for the selected period.',
    },
    group: {
      fx: 'FX',
      metal: 'Gold',
    },
    goldDisplayName: 'Gold ({currency}/g)',
    noChangeData: 'No change data',
    errors: {
      overview: 'Could not load market overview.',
      series: 'Could not load time-series data.',
      seriesPartial: 'Could not load time-series data for some instruments.',
      customRangeRequired: 'Custom range requires both start and end dates.',
      startAfterEnd: 'Start date cannot be after end date.',
    },
  },
} as const;

export default content;
