import { translate } from '../../../shared/i18n/translate';

const getFontFamilyOptions = () =>
  [
    { value: 'inherit', label: translate('editor.toolbar.fontFamily.default') },
    { value: "'Pretendard', sans-serif", label: 'Pretendard' },
    { value: "'Noto Sans KR', sans-serif", label: 'Noto Sans KR' },
    { value: "'Nanum Gothic', sans-serif", label: translate('editor.toolbar.fontFamily.nanumGothic') },
    { value: "'Nanum Myeongjo', serif", label: translate('editor.toolbar.fontFamily.nanumMyeongjo') },
    { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono' },
  ] as const;

const getFontSizeOptions = () =>
  [
    { value: 'default', label: translate('editor.toolbar.fontSize.default') },
    { value: '12px', label: '12px' },
    { value: '14px', label: '14px' },
    { value: '16px', label: '16px' },
    { value: '18px', label: '18px' },
    { value: '20px', label: '20px' },
    { value: '24px', label: '24px' },
    { value: '28px', label: '28px' },
    { value: '32px', label: '32px' },
  ] as const;

const getCodeLanguageOptions = () =>
  [
    { value: 'plaintext', label: translate('editor.toolbar.codeLanguage.plaintext') },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'java', label: 'Java' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'python', label: 'Python' },
    { value: 'sql', label: 'SQL' },
    { value: 'xml', label: 'XML' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
    { value: 'bash', label: 'Bash' },
    { value: 'markdown', label: 'Markdown' },
  ] as const;

const getYoutubeSizeOptions = () =>
  [
    { value: 'sm', label: translate('editor.toolbar.youtubeSize.sm'), width: 480, height: 270 },
    { value: 'md', label: translate('editor.toolbar.youtubeSize.md'), width: 640, height: 360 },
    { value: 'lg', label: translate('editor.toolbar.youtubeSize.lg'), width: 800, height: 450 },
    { value: 'xl', label: translate('editor.toolbar.youtubeSize.xl'), width: 960, height: 540 },
  ] as const;

type YoutubeSizeValue = ReturnType<typeof getYoutubeSizeOptions>[number]['value'];

export { getCodeLanguageOptions, getFontFamilyOptions, getFontSizeOptions, getYoutubeSizeOptions };
export type { YoutubeSizeValue };
