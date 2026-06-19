# ── Stage 1: Build ───────────────────────────────────────────
FROM node:22-alpine AS builder

RUN npm install -g pnpm@9.15.0 && \
    apk add --no-cache openssl

WORKDIR /app

# Dependency manifests first (layer caching)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY backend/package.json ./backend/

# Source code
COPY backend ./backend/
COPY circuits/build ./circuits/build/

# Install all dependencies, generate Prisma client, compile
RUN pnpm install --frozen-lockfile && \
    pnpm --filter veridaq-backend db:generate && \
    pnpm build:backend

# ── Stage 2: Production ──────────────────────────────────────
FROM node:22-alpine AS runner

RUN npm install -g pnpm@9.15.0 && \
    apk add --no-cache openssl curl

WORKDIR /app

# Package manifests — required for pnpm workspace resolution
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Install all deps, no scripts (prepare needs .git)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Regenerate prisma client
COPY --from=builder /app/backend/prisma ./backend/prisma
RUN pnpm --filter veridaq-backend db:generate

# Compiled JavaScript (now output to backend/dist/)
COPY --from=builder /app/backend/dist ./backend/dist

# Circuit build files (zkey, wasm, verification key)
COPY --from=builder /app/circuits/build ./circuits/build

# Prune dev dependencies to reduce image size
RUN pnpm prune --prod

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Apply migrations, seed, then start the server
CMD ["sh", "-c", "./backend/node_modules/.bin/prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/prisma/seed.js && node backend/dist/src/server.js"]
