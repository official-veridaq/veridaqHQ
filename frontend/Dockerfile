# ── Stage 1: Install dependencies ──────────────────────────
FROM node:22-alpine AS deps

RUN npm install -g pnpm@9.15.0 && \
    apk add --no-cache openssl

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build Next.js ─────────────────────────────────
FROM node:22-alpine AS builder

RUN npm install -g pnpm@9.15.0 && \
    apk add --no-cache zip

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json /app/tsconfig.base.json ./
COPY frontend ./frontend/
COPY extension ./extension/

ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-http://localhost:4000}
ENV NODE_ENV=production

RUN pnpm build:frontend

# ── Stage 3: Production runner ─────────────────────────────
FROM node:22-alpine AS runner

RUN npm install -g pnpm@9.15.0

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/next.config.ts ./frontend/next.config.ts
COPY --from=builder /app/frontend/tsconfig.json ./frontend/tsconfig.json

EXPOSE 3000

ENV NODE_ENV=production

CMD ["./node_modules/.bin/next", "start", "frontend", "--port", "3000"]
