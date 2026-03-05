const FONT_FAMILY_OPTIONS = [
  { value: 'inherit', label: '기본' },
  { value: "'Pretendard', sans-serif", label: 'Pretendard' },
  { value: "'Noto Sans KR', sans-serif", label: 'Noto Sans KR' },
  { value: "'Nanum Gothic', sans-serif", label: '나눔고딕' },
  { value: "'Nanum Myeongjo', serif", label: '나눔명조' },
  { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono' },
] as const;

const FONT_SIZE_OPTIONS = [
  { value: 'default', label: '기본' },
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '24px', label: '24px' },
  { value: '28px', label: '28px' },
  { value: '32px', label: '32px' },
] as const;

const CODE_LANGUAGE_OPTIONS = [
  { value: 'plaintext', label: '텍스트' },
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

const YOUTUBE_SIZE_OPTIONS = [
  { value: 'sm', label: '작게 (480x270)', width: 480, height: 270 },
  { value: 'md', label: '기본 (640x360)', width: 640, height: 360 },
  { value: 'lg', label: '크게 (800x450)', width: 800, height: 450 },
  { value: 'xl', label: '와이드 (960x540)', width: 960, height: 540 },
] as const;

type YoutubeSizeValue = (typeof YOUTUBE_SIZE_OPTIONS)[number]['value'];

export { CODE_LANGUAGE_OPTIONS, FONT_FAMILY_OPTIONS, FONT_SIZE_OPTIONS, YOUTUBE_SIZE_OPTIONS };
export type { YoutubeSizeValue };
