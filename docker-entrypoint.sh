#!/bin/sh
#
# 이 스크립트는 Nginx를 시작하기 전에 'backend' 서비스가
# DNS를 통해 정상적으로 확인될 때까지 기다립니다.

set -e

# backend 호스트와 포트 설정
host="backend"
port="8082"

# nc (netcat) 명령어를 사용하여 host와 port가 열릴 때까지 대기
# -z: 포트가 열려있는지만 스캔 (데이터 전송 X)
# -w1: 1초 타임아웃
until nc -z -w1 "$host" "$port"; do
  echo "Waiting for backend to be ready..."
  sleep 1
done

echo "Backend is ready. Starting Nginx."

# 원래의 Nginx 시작 명령어를 실행합니다.
exec "$@"
