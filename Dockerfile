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
# 가벼운 Nginx 이미지를 실행 베이스 이미지로 사용합니다.
FROM nginx:stable-alpine

# 빌드 단계에서 생성된 정적 파일들을 Nginx의 기본 웹 루트 디렉토리로 복사합니다.
COPY --from=builder /app/dist /usr/share/nginx/html

# 컨테이너 내부의 Nginx 설정을 우리가 만든 커스텀 설정으로 교체합니다.
# 아래에서 생성할 nginx.conf 파일을 의미합니다.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx 컨테이너는 지정 포트를 사용합니다.
EXPOSE 80
