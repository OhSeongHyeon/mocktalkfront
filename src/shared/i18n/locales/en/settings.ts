const settings = {
  page: {
    eyebrow: 'Settings',
    title: 'Site layout and theme',
    description: 'Save theme mode and desktop layout behavior as personal settings in this browser. Mobile uses the full screen width.',
  },
  language: {
    title: 'Display language',
    description: 'Choose the language for menus and UI labels. Saved in this browser.',
    ko: '한국어',
    koDescription: 'Default language.',
    en: 'English',
    enDescription: 'Menus and UI labels are shown in English.',
    current: 'Current language',
  },
  theme: {
    title: 'Theme mode',
    description: 'Follow system settings or lock light or dark theme.',
    system: {
      label: 'System',
      description: 'Follow the OS or browser color scheme.',
    },
    light: {
      label: 'Light',
      description: 'Always use the light theme.',
    },
    dark: {
      label: 'Dark',
      description: 'Always use the dark theme.',
    },
    resolvedLight: 'Light',
    resolvedDark: 'Dark',
    currentApplied: 'Applied theme: {theme}',
    summaryTitle: 'Theme mode',
  },
  layout: {
    title: 'Site layout width',
    description: 'Applies across screens that use the shared layout.',
    default: {
      label: 'Narrow',
      description: 'Desktop content width 1152px for a focused layout.',
    },
    comfortable: {
      label: 'Medium',
      description: 'Desktop content width 1280px, slightly wider than narrow.',
    },
    wide: {
      label: 'Wide',
      description: 'Default. Desktop content width 1536px.',
    },
    full: {
      label: 'Full width',
      description: 'Minimal max-width on desktop main content.',
    },
  },
  sideMenu: {
    title: 'Side menu expand mode',
    description: 'How the side menu behaves when you press the menu button on desktop.',
    collapse: {
      label: 'Collapse / expand',
      description: 'Switch between icon-only collapsed and full expanded side menu.',
    },
    hidden: {
      label: 'Hide / expand',
      description: 'Hide the side menu completely and expand when needed.',
    },
    summaryTitle: 'Side menu behavior',
  },
  topMenuPosition: {
    title: 'Top menu bar position',
    description: 'The top bar stays visible; choose fixed to viewport or scroll with content.',
    fixed: {
      label: 'Fixed to top',
      description: 'Keep the top menu fixed; only the main content scrolls below.',
    },
    static: {
      label: 'Scroll with content',
      description: 'Place the top menu in the page flow so it scrolls away with content.',
    },
    summaryTitle: 'Top menu position',
  },
  summary: {
    currentSettings: 'Current settings',
    topMenuVisibility: 'Top menu visibility',
    alwaysVisible: 'Always visible',
    alwaysVisibleDescription: 'The top menu stays visible with no auto-hide.',
    scope: 'Applies to',
    scopeTheme: 'System, light, and dark theme modes',
    scopeLayout: 'Shared layout pages such as home, communities, and article views',
    scopeTopMenu: 'Top menu position and always-visible behavior',
    scopeSideMenu: 'Desktop side menu expand mode',
    scopePersonal: 'Personal settings stored in this browser only',
    scopeMobile: 'Full width on mobile screens',
    upcoming: 'Coming soon',
    upcomingDescription: 'Card density and list display options may be added here later.',
  },
} as const;

export default settings;
