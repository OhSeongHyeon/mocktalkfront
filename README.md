# Mocktalk Frontend

Mocktalk 커뮤니티/갤러리 서비스의 프론트엔드 애플리케이션입니다.  
Vue + TypeScript + Tailwind CSS 기반으로 게시판, 댓글/대댓글, 알림, 이미지 업로드 UI를 제공합니다.

## 한눈에 보기

- 역할: 사용자 화면 렌더링, API 연동, 인증 상태 처리
- API 연동 기준: 기본 상대경로 `/api` (리버스 프록시 기준)
- 인증 정책: Access Token(Bearer) + Refresh Token(HttpOnly Cookie)

## 기술 스택

- Vue 3
- TypeScript
- Vite
- Vue Router
- Tailwind CSS v3

## 로컬 실행

### 1) 환경 변수 준비

`mocktalkfront/.env.example`을 참고해 `mocktalkfront/.env.development` 값을 채웁니다.

```env
VITE_API_BASE_URL=/api
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
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

## 환경 변수

| 이름                 | 기본/예시               | 설명                          |
| -------------------- | ----------------------- | ----------------------------- |
| `VITE_API_BASE_URL`  | `/api`                  | 백엔드 API 기본 주소          |
| `VITE_FILE_BASE_URL` | 비움 또는 파일 서버 URL | 업로드 파일 표시용 기본 주소  |
| `PORT`               | `80`                    | 컨테이너 실행 시 내부 포트    |
| `BACKEND_BASE_URL`   | `http://backend:8082`   | 컨테이너 템플릿용 백엔드 주소 |

## 디렉터리 구조

```text
src/
├── assets/      # 정적 리소스
├── components/  # 재사용 UI 컴포넌트
├── lib/         # 공통 유틸/설정/HTTP 래퍼
├── router/      # 라우팅 및 가드
├── services/    # 비즈니스 단위 API 호출
├── stores/      # 전역 상태
└── views/       # 라우트 단위 페이지
```
