# Frontend 테스트 작성 규칙

## 1) 배치 규칙

- 테스트 파일은 대상 코드와 같은 도메인 경로에 인접 배치한다.
- 파일명은 `*.test.ts`를 사용한다.
- 공통 테스트 설정은 `src/test/setup.ts`에서만 관리한다.

## 2) 테스트 구조 규칙

- 테스트 이름은 사용자 행위/결과 중심으로 작성한다.
- 테스트 본문은 `given / when / then` 순서를 유지한다.
- 한 테스트는 한 가지 핵심 결과만 검증한다.

## 3) 네트워크 목킹 표준

- HTTP 응답 목킹은 `src/test/utils/httpMock.ts`를 기본 사용한다.
- 성공/에러/타임아웃 모두 `mockFetchSequence` 기반으로 표현한다.
- JSON 응답은 `createJsonResponse`로 생성한다.
- 타임아웃은 `createTimeoutError`를 사용한다.

## 4) 금지 규칙

- 테스트마다 임의의 전역 상태 정리 코드를 중복 작성하지 않는다.
- 실제 외부 네트워크 호출이 발생하도록 테스트를 작성하지 않는다.
- 레거시 경로(`services`, `components`, `lib`)를 새 테스트에서 재도입하지 않는다.

## 5) 실행 기준

- 단일 확인: `npm run test`
- 커버리지 확인: `npm run test:coverage`
- PR/커밋 전 게이트: `npm run lint && npm run test && npm run build`
