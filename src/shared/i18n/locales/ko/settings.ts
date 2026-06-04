const settings = {
  page: {
    eyebrow: '설정',
    title: '사이트 레이아웃과 테마',
    description: '테마 모드와 데스크톱 공통 레이아웃 동작을 브라우저 단위 개인 설정으로 저장합니다. 모바일에서는 화면 전체 폭을 그대로 사용합니다.',
  },
  language: {
    title: '표시 언어',
    description: '메뉴와 화면 안내 문구의 표시 언어를 선택합니다. 브라우저에 저장됩니다.',
    ko: '한국어',
    koDescription: '기본 언어입니다.',
    en: 'English',
    enDescription: 'Menus and UI labels are shown in English.',
    current: '현재 언어',
  },
  theme: {
    title: '테마 모드',
    description: '시스템 설정을 따르거나 화이트, 다크 테마로 직접 고정할 수 있습니다.',
    system: {
      label: '시스템',
      description: '운영체제 또는 브라우저의 컬러 스킴 설정을 그대로 따라갑니다.',
    },
    light: {
      label: '화이트',
      description: '항상 밝은 테마로 고정합니다.',
    },
    dark: {
      label: '다크',
      description: '항상 어두운 테마로 고정합니다.',
    },
    resolvedLight: '화이트',
    resolvedDark: '다크',
    currentApplied: '현재 적용 테마: {theme}',
    summaryTitle: '테마 모드',
  },
  layout: {
    title: '사이트 레이아웃 사이즈',
    description: '공통 레이아웃을 사용하는 화면 전반에 바로 반영됩니다.',
    default: {
      label: '좁게',
      description: '데스크톱에서 1152px 폭으로 콘텐츠 영역을 집중감 있게 표시합니다.',
    },
    comfortable: {
      label: '중간',
      description: '기본보다 조금 더 넓은 1280px 폭으로 콘텐츠 영역을 표시합니다.',
    },
    wide: {
      label: '넓게',
      description: '신규 기본값입니다. 데스크톱에서 1536px 폭으로 콘텐츠 영역을 넉넉하게 표시합니다.',
    },
    full: {
      label: '최대 넓게',
      description: '데스크톱에서 메인 콘텐츠 폭 제한을 거의 두지 않습니다.',
    },
  },
  sideMenu: {
    title: '사이드메뉴 펼치기 방식',
    description: '데스크톱에서 메뉴 버튼을 눌렀을 때 사이드메뉴가 어떻게 동작할지 정합니다.',
    collapse: {
      label: '축소-펼치기',
      description: '사이드메뉴를 아이콘만 남기는 축소 상태와 전체 펼침 상태로 전환합니다.',
    },
    hidden: {
      label: '숨기기-펼치기',
      description: '사이드메뉴를 완전히 숨겼다가 필요할 때 전체 메뉴를 다시 펼칩니다.',
    },
    summaryTitle: '사이드메뉴 동작',
  },
  topMenuPosition: {
    title: '상단메뉴바 위치 방식',
    description: '상단메뉴바는 항상 표시로 유지하고, 화면 상단에 고정할지 본문과 함께 스크롤할지만 정합니다.',
    fixed: {
      label: '화면 상단 고정',
      description: '상단메뉴바를 화면 상단에 항상 보이도록 고정하고, 본문만 그 아래에서 스크롤합니다.',
    },
    static: {
      label: '본문과 함께 스크롤',
      description: '상단메뉴바를 본문 흐름 안에 두어 페이지를 내리면 함께 위로 사라지게 합니다.',
    },
    summaryTitle: '상단메뉴바 위치',
  },
  summary: {
    currentSettings: '현재 설정',
    topMenuVisibility: '상단메뉴바 노출',
    alwaysVisible: '항상 표시',
    alwaysVisibleDescription: '상단메뉴바는 자동 숨김 없이 계속 표시합니다.',
    scope: '적용 범위',
    scopeTheme: '시스템, 화이트, 다크 테마 모드',
    scopeLayout: '홈, 커뮤니티, 게시글 상세와 작성 화면 같은 공통 레이아웃 페이지',
    scopeTopMenu: '상단메뉴바 위치 방식과 항상 표시 동작',
    scopeSideMenu: '데스크톱 사이드메뉴 펼치기 방식',
    scopePersonal: '브라우저에만 저장되는 개인 설정',
    scopeMobile: '모바일 화면에서는 전체 폭 사용',
    upcoming: '예정 항목',
    upcomingDescription: '이후에는 카드 밀도, 목록 표시 방식 같은 화면 관련 설정도 이 화면에 순차적으로 추가할 수 있습니다.',
  },
} as const;

export default settings;
