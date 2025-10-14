# 1. 의존성 설치 단계
FROM node:20-alpine AS deps

WORKDIR /app

# package.json과 lock 파일을 복사하여 의존성만 설치
COPY package.json package-lock.json* ./
RUN npm install

# 2. 빌드 단계
FROM node:20-alpine AS builder
WORKDIR /app

# 의존성 단계에서 설치된 node_modules를 복사
COPY --from=deps /app/node_modules ./node_modules
# 소스 코드 전체를 복사
COPY . .

# 환경 변수 설정 (빌드 시점에 필요한 경우)
# 예: ENV NEXT_PUBLIC_API_URL=https://my-api.com

# 애플리케이션 빌드
RUN npm run build

# 3. 프로덕션 실행 단계
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 빌드 단계에서 생성된 standalone 결과물을 복사
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 서버 실행 포트 설정
EXPOSE 3000
ENV PORT 3000

# 서버 실행
# CMD ["node", "server.js"] 는 standalone 모드의 기본 실행 명령어입니다.
CMD ["node", "server.js"]
