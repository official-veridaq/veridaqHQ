# ── Stage 1: Build ───────────────────────────────────────────
FROM node:22-alpine AS builder

RUN npm install -g pnpm@9.15.0 && \
    apk add --no-cache openssl

WORKDIR /app

# Dependency manifests first (layer caching)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

# Source code
COPY backend ./backend/
COPY circuits/build ./circuits/build/

# Install all dependencies, generate Prisma client, compile
RUN pnpm install --frozen-lockfile && \
    pnpm db:generate && \
    pnpm build:backend

# ── Stage 2: Production ──────────────────────────────────────
FROM node:22-alpine AS runner

RUN npm install -g pnpm@9.15.0 && \
    apk add --no-cache openssl curl

WORKDIR /app

# Dependency manifests only (not source code)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Remove prepare script (husky requires .git), then install production deps only
RUN sed -i '/"prepare"/d' package.json && pnpm install --frozen-lockfile --prod

# Prisma schema and migrations
COPY --from=builder /app/backend/prisma ./backend/prisma

# Regenerate Prisma client for production target
RUN pnpm db:generate

# Compiled JavaScript
COPY --from=builder /app/dist ./dist

# Circuit build files (zkey, wasm, verification key)
COPY --from=builder /app/circuits/build ./circuits/build

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Apply pending migrations, seed database, then start the server
CMD ["sh", "-c", "pnpm exec prisma migrate deploy --schema=backend/prisma/schema.prisma && node dist/backend/prisma/seed.js && node dist/backend/src/server.js"]
