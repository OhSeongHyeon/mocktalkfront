# Mocktalk Frontend

Mocktalk 커뮤니티 서비스의 프론트엔드 애플리케이션입니다.  
Vue + TypeScript + Tailwind CSS 기반으로 게시판, 댓글/대댓글, 알림, 이미지 업로드 UI를 제공합니다.

## 한눈에 보기

- 역할: 사용자 화면 렌더링, API 연동, 인증 상태 처리
- API 연동 기준: 기본 상대경로 `/api` (리버스 프록시 기준)
- 인증 정책: Access Token(Bearer) + Refresh Token(HttpOnly Cookie)

## 기술 스택

- Vue 3
- TypeScript
- Vite 7
- Vue Router
- Pinia
- Tailwind CSS v4 (`@tailwindcss/vite`, `tailwind.config.js` 없음)
- Node.js >= 24 (`.nvmrc` 참고)

## 로컬 실행

Node.js 24 이상을 사용합니다. WSL과 Windows에서 같은 `node_modules`를 번갈아 쓰면 Rollup 네이티브 바이너리 오류가 날 수 있으므로, 한 환경에서만 `npm ci`를 실행하는 것을 권장합니다.

### 1) 환경 변수 준비

`mocktalkfront/.env.example`을 참고해 `mocktalkfront/.env.development` 값을 채웁니다.

```env
VITE_API_BASE_URL=
VITE_FILE_BASE_URL=
```

### 2) 개발 서버 실행

```bash
npm install
npm run dev
```

### 3) 프로덕션 빌드/미리보기

```bash
npm run build
npm run preview
```

## 주요 스크립트

```bash
npm run dev
npm run test
npm run test:watch
npm run test:coverage
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

## 테스트

- 테스트 실행: `npm run test`
- 커버리지: `npm run test:coverage`
- 테스트 작성 규칙: `src/test/TESTING_GUIDE.md`

## 환경 변수

| 이름                 | 기본/예시             | 설명                          |
| -------------------- | --------------------- | ----------------------------- |
| `VITE_API_BASE_URL`  | 비움                  | 백엔드 API 기본 주소          |
| `VITE_FILE_BASE_URL` | 비움                  | 업로드 파일 표시용 기본 주소  |
| `PORT`               | `80`                  | 컨테이너 실행 시 내부 포트    |
| `BACKEND_BASE_URL`   | `http://backend:8082` | 컨테이너 템플릿용 백엔드 주소 |
| `OBJECT_STORAGE_BASE_URL` | `http://minio:9000` | Presigned 업로드 프록시 대상 스토리지 주소 |

## 디렉터리 구조

```text
src/
├── app/       # 앱 엔트리/라우터/전역 설정
├── pages/     # 라우트 단위 페이지
├── widgets/   # 페이지 조합 UI 블록
├── features/  # 사용자 액션 중심 기능 모듈
├── entities/  # 도메인 모델/API/타입
├── shared/    # 전역 공용 모듈(ui/lib)
├── stores/    # 전역 상태
├── styles/    # 전역 스타일 partial (토큰, ui-*, bbs-*)
├── style.css  # Tailwind 엔트리 (@import styles/*)
├── test/      # 테스트 setup/유틸/가이드
└── assets/    # 정적 리소스
```

## UI · 디자인 시스템

MockTalk 커뮤니티/BBS 톤의 플랫 UI를 목표로, 레거시 `slate-*` 대신 CSS 변수 토큰과 컴포넌트 클래스를 사용합니다.

### 스타일 엔트리

- [`src/style.css`](src/style.css): Pretendard import, `tailwindcss`, [`src/styles/`](src/styles/) partial
- 토큰: `--surface-*`, `--ink-*`, `--line-*`, `--link` (`:root` / `html.dark` in `theme.css`)
- 유틸: `text-ink`, `text-muted`, `bg-app`, `border-line` 등 (`utilities.css`)
- 컴포넌트: `.ui-*` (폼·버튼·패널), `.bbs-*` (목록·탭·댓글), `.app-*` (셸·사이드바)

신규 화면은 가능한 한 위 토큰·클래스를 우선하고, 일회성 장식용 Tailwind만 보조로 씁니다.

### 폰트

- [`@fontsource/pretendard`](https://fontsource.org/fonts/pretendard) (400/500/600/700)
- [`src/styles/fonts.css`](src/styles/fonts.css)에서 import, CDN 미사용

### 아이콘

- UI: [`@lucide/vue`](https://lucide.dev) + [`src/shared/ui/AppIcon.vue`](src/shared/ui/AppIcon.vue)
- 사이드 메뉴: [`src/shared/lib/sideMenuIcons.ts`](src/shared/lib/sideMenuIcons.ts) 키 → Lucide 매핑
- OAuth 브랜드만 SVG: [`src/assets/icons/`](src/assets/icons/) (Google, GitHub)
