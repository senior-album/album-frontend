# album-frontend 레포용 Dockerfile
# 레포 루트에 Dockerfile로 저장

# Stage 1: 빌드
# 베이스 이미지 digest pin (T-053) — tag 이동으로 인한 공급망 리스크 차단
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS builder

WORKDIR /build

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# Stage 2: nginx로 서빙
FROM nginx:alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
