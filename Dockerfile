# ================= STAGE 1: 빌드 환경 (Node.js) =================
FROM node:22-alpine AS builder

# 작업 디렉토리를 설정합니다.
WORKDIR /app

# package.json과 package-lock.json을 먼저 복사하여 의존성 캐시를 활용합니다.
COPY package*.json ./

# 의존성을 설치합니다.
RUN npm install

# 프로젝트의 나머지 소스 코드를 복사합니다.
COPY . .

RUN npm run format:check

# Vue.js 앱을 빌드합니다. (빌드 결과물은 /app/dist에 생성됩니다.)
RUN npm run build

# ================= STAGE 2: 실행 환경 (Nginx) =================
FROM nginx:stable-alpine

# envsubst 도구를 포함하는 gettext 패키지 설치
RUN apk add --no-cache gettext

# 빌드된 정적 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 설정 '템플릿' 파일을 복사합니다.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# 포트 80 노출 (실제 리스닝 포트는 $PORT 환경변수에 의해 결정됨)
EXPOSE 80

# 컨테이너 시작 시 실행될 명령어
CMD ["/bin/sh", "-c", "envsubst '$PORT $BACKEND_BASE_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]