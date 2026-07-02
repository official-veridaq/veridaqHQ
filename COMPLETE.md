# VERIDAQ Complete Deployment Guide

This file is the single end to end reference for understanding the repository and deploying it online.

It covers:

- What this codebase does
- What runs where
- The exact environment variables used by the backend, frontend, contracts, and wallet integration
- How to deploy PostgreSQL with Supabase
- How to deploy Redis with Upstash
- How to deploy the Next.js frontend on Vercel
- How to deploy the Fastify backend and worker process
- What to replace in each step

This guide is written for the current repository state and the current Vercel and Supabase documentation patterns as of June 2026.

## 1. What This Repo Is

VERIDAQ is a privacy preserving academic credential system.

The moving parts are:

- `packages/frontend` is the Next.js 15 App Router frontend
- `packages/backend` is the Fastify 5 API server, Prisma app, and BullMQ worker host
- `packages/contracts` is the Foundry smart contract project
- `packages/circuits` is the Circom circuit and trusted setup artifacts

The runtime split matters:

- The frontend can be hosted on Vercel
- The database can be hosted on Supabase
- Redis can be hosted on Upstash
- The backend should run on a long lived Node host, not as a pure Vercel frontend deployment

Why that split exists in this repo:

- The backend starts a real Fastify server in `packages/backend/src/server.ts`
- The backend connects to PostgreSQL through Prisma
- The backend connects to Redis through `ioredis`
- The backend imports a worker from `packages/backend/src/workers/batch.processor.ts`
- The frontend only needs to call the backend API through `NEXT_PUBLIC_BACKEND_URL`

## 2. Current Architecture

The request flow is:

1. Browser loads the Next.js frontend
2. Frontend calls the backend API using `NEXT_PUBLIC_BACKEND_URL`
3. Backend reads and writes PostgreSQL through Prisma
4. Backend queues work and rate limiting data in Redis
5. Backend talks to Stellar Soroban Testnet, contracts, and the circuit artifacts when needed

The key production implication is simple:

- Vercel is the right host for the frontend
- Vercel is not the right host for this backend without a rewrite into serverless route handlers and separate worker infrastructure

If you want the cleanest production setup with the least code change, use this stack:

- Frontend: Vercel
- Backend: Render, Railway, Fly.io, or a similar Node host
- PostgreSQL: Supabase
- Redis: Upstash

## 3. Files That Control Deployment

These are the important files in this repo:

- [package.json](package.json)
- [packages/backend/src/config/index.ts](packages/backend/src/config/index.ts)
- [packages/backend/src/server.ts](packages/backend/src/server.ts)
- [packages/backend/prisma/schema.prisma](packages/backend/prisma/schema.prisma)
- [packages/backend/prisma/seed.ts](packages/backend/prisma/seed.ts)
- [packages/backend/src/plugins/redis.ts](packages/backend/src/plugins/redis.ts)
- [packages/frontend/lib/api.ts](packages/frontend/lib/api.ts)
- [packages/frontend/lib/auth.tsx](packages/frontend/lib/auth.tsx)
- [packages/frontend/lib/wallet-provider.tsx](packages/frontend/lib/wallet-provider.tsx)
- [packages/frontend/next.config.ts](packages/frontend/next.config.ts)
- [docker-compose.yml](docker-compose.yml)

## 4. Exact Environment Variables

The backend validates environment variables in `packages/backend/src/config/index.ts`. If one is missing or malformed, the server exits at startup.

### 4.1 Backend required variables

These are required for the backend to start:

- `NODE_ENV`
- `PORT`
- `FRONTEND_URL`
- `BACKEND_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `REFRESH_SECRET`
- `STELLAR_RPC_URL`
- `CIRCUIT_ZKEY_PATH`
- `CIRCUIT_WASM_PATH`
- `ENCRYPTION_KEY`

These are also used by the backend but are optional in code:

- `JWT_EXPIRES_IN`
- `REFRESH_EXPIRES_IN`
- `EXTENSION_JWT_EXPIRES_IN`
- `INSTITUTION_REGISTRY_ADDRESS`
- `CREDENTIAL_REGISTRY_ADDRESS`
- `REVOCATION_REGISTRY_ADDRESS`
- `PAYMASTER_VAULT_ADDRESS`
- `SUBSCRIPTION_MANAGER_ADDRESS`
- `ZK_VERIFIER_ADDRESS`
- `ENTRY_POINT_ADDRESS`
- `BUNDLER_RPC_URL`
- `AA_SIMPLE_ACCOUNT_FACTORY_ADDRESS`
- `AA_SIMPLE_ACCOUNT_OWNER_PRIVATE_KEY`
- `AA_SIMPLE_ACCOUNT_SALT`
- `PLATFORM_ADMIN_PRIVATE_KEY`
- `PLATFORM_ADMIN_ADDRESS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `BASESCAN_API_KEY`
- `EXTENSION_ORIGINS`
- `CROSSMINT_SERVER_API_KEY`
- `CROSSMINT_WEBHOOK_SECRET`

### 4.2 Frontend public variables

The frontend reads these in browser visible code:

- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- `NEXT_PUBLIC_STELLAR_NETWORK`

The wallet provider also supports the standard WalletConnect and RainbowKit ecosystem variables, but this repo only reads `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` directly.

### 4.3 What the current code actually consumes

From the source code:

- `packages/frontend/lib/api.ts` reads `NEXT_PUBLIC_BACKEND_URL`
- `packages/frontend/lib/wallet-provider.tsx` reads `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- `packages/backend/src/plugins/redis.ts` reads `REDIS_URL`
- `packages/backend/prisma/schema.prisma` reads `DATABASE_URL`
- `packages/backend/src/config/index.ts` reads the full backend env set

## 5. Recommended Production Values

Use this naming pattern in production:

- `FRONTEND_URL=https://your-frontend-domain`
- `BACKEND_URL=https://your-backend-domain`
- `NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain`

If the frontend is on Vercel and the backend is on a separate host, these are different URLs on purpose.

### 5.1 Example production mapping

If your frontend is deployed to Vercel at `https://veridaq-official.vercel.app` and your backend is deployed at `https://api.veridaq.example`, set:

- `FRONTEND_URL=https://veridaq-official.vercel.app`
- `BACKEND_URL=https://api.veridaq.example`
- `NEXT_PUBLIC_BACKEND_URL=https://api.veridaq.example`

Then set `EXTENSION_ORIGINS` only if you actually use the browser extension.

### 5.2 Supabase database URL naming

For Supabase, keep one of these patterns:

- Use the direct connection string for a long lived backend host
- Use the pooler connection string if your host is IPv4 only or you want pooling

Recommended for this repo:

- Backend host on Render, Railway, or Fly.io: use the direct Supabase Postgres URL if your network can reach it
- If that host cannot use direct IPv6, use Supabase Supavisor pooler session mode or transaction mode depending on your runtime

Because this backend is a long lived Node server, the direct connection or session pooler is usually the better fit than transaction mode.

### 5.3 Upstash Redis naming

Set:

- `REDIS_URL=rediss://default:YOUR_UPSTASH_PASSWORD@YOUR-REDIS-HOST:6379`

Do not hardcode the literal secret in documentation or commits.

### 5.4 WalletConnect naming

Set:

- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id`

Without it, the frontend falls back to `YOUR_PROJECT_ID`, which is only a placeholder.

## 6. What To Use For Supabase

Supabase is the correct PostgreSQL provider for this repo if you want managed Postgres.

### 6.1 Which Supabase connection string to use

Supabase provides several database connection styles.

For this repo:

- Use the direct connection string if your backend host supports it and you want the simplest setup
- Use the shared pooler if your backend host is IPv4 only
- Use transaction pooler only if you must use a serverless or edge style runtime

The Supabase guidance currently says:

- Direct connection is best for persistent backend services and migrations
- Pooler session mode is the fallback for persistent services on IPv4 only networks
- Pooler transaction mode is best for serverless or edge functions

### 6.2 Prisma and Supabase

This repo uses a plain Prisma datasource:

- `url = env("DATABASE_URL")`

There is no separate `DIRECT_URL` in the schema right now.

That means you should store the actual Supabase Postgres connection string in `DATABASE_URL`.

If you later add Prisma migrations that require both direct and pooled URLs, you can extend the schema, but that is not required for this codebase today.

### 6.3 Connection string format examples

Use the exact format Supabase gives you from the dashboard, but rename it in your deployment settings like this:

- `DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres`

or, if you are using the shared pooler session mode:

- `DATABASE_URL=postgres://postgres.<project-ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres`

or, if you are using the shared pooler transaction mode:

- `DATABASE_URL=postgres://postgres.<project-ref>:<password>@aws-<region>.pooler.supabase.com:6543/postgres`

Use SSL where possible.

## 7. What To Use For Redis

Upstash Redis is the correct hosted Redis option for this repo.

The backend uses `ioredis` in `packages/backend/src/plugins/redis.ts` and BullMQ in the worker layer, so the Redis URL must be reachable by your backend host.

Set:

- `REDIS_URL=rediss://default:<upstash_password>@<upstash_host>:6379`

The `rediss://` scheme is correct for TLS.

## 8. What To Use For Vercel

Vercel is the right host for the frontend.

### 8.1 What gets deployed to Vercel

Deploy only `packages/frontend` as the Next.js app.

The frontend depends on:

- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- `NEXT_PUBLIC_STELLAR_NETWORK`

### 8.2 What does not belong on Vercel in this repo

Do not expect the current backend to work as a direct Vercel deployment without structural changes.

Reason:

- It is a Fastify server with explicit startup, plugin registration, and a persistent `/health` listener
- It uses Prisma and Redis as live services
- It starts a batch worker import at server bootstrap

That is a normal Node backend shape, not a pure frontend host shape.

If you want the backend on Vercel later, you would need a separate serverless redesign.

## 9. Deployment Order

Deploy in this order:

1. Supabase PostgreSQL
2. Upstash Redis
3. Contracts to Stellar Soroban Testnet, if you are using live chain interactions
4. Backend host
5. Vercel frontend
6. Update frontend and backend env vars with the final public URLs

The order matters because the frontend needs the backend URL, and the backend may need the database and Redis URL before it starts.

## 10. Step By Step Deployment

### Step 1. Create or prepare the Supabase project

1. Log in to Supabase.
2. Open your project dashboard.
3. Confirm the database password.
4. Open the Connect panel and copy the connection string.
5. Decide whether you will use the direct URL or the pooler URL.

For this repo, the direct URL is simplest if your backend host can use it.

### Step 2. Add the Supabase database value

In your production secret store or host environment panel, set:

- `DATABASE_URL=<supabase_connection_string>`

If you are using local development, you can still keep the Docker Postgres URL in your `.env` file.

### Step 3. Create the Upstash Redis database

1. Open Upstash.
2. Create a Redis database.
3. Copy the TLS URL.
4. Store it as `REDIS_URL` in your production backend environment.

### Step 4. Decide where the backend will run

Use one of these hosts:

- Render
- Railway
- Fly.io
- Another persistent Node host

Recommended shape:

- One web service for the API server
- One worker process for BullMQ jobs if the host supports process separation

If your host only gives you one process, make sure the worker code is included in the same Node process only if that is already supported by the app entrypoint.

### Step 5. Prepare the backend environment variables

Set these in the backend host environment:

- `NODE_ENV=production`
- `PORT=4000` or whatever your host requires
- `FRONTEND_URL=https://your-vercel-domain`
- `BACKEND_URL=https://your-backend-domain`
- `DATABASE_URL=<supabase_connection_string>`
- `REDIS_URL=<upstash_rediss_url>`
- `JWT_SECRET=<long_random_secret>`
- `REFRESH_SECRET=<another_long_random_secret>`
- `STELLAR_RPC_URL=https://soroban-testnet.stellar.org`
- `CIRCUIT_ZKEY_PATH=/app/packages/circuits/build/credential_final.zkey` if the backend runs in a container
- `CIRCUIT_WASM_PATH=/app/packages/circuits/build/credential_js/credential.wasm` if the backend runs in a container
- `ENCRYPTION_KEY=<64_hex_char_key>`

Add any of the optional contract or email keys you actually use in production.

### Step 6. Deploy the backend

Run the backend host build or start command that matches your platform.

The important behavior is that the process must:

- Install Node 22 and pnpm 9 or the host equivalent
- Run Prisma generation and migrations if needed
- Start `packages/backend/src/server.ts`

If the host supports a Docker build, that is often the cleanest option for this repository because the backend also expects circuit artifact paths and worker code.

### Step 7. Register the backend URL in the frontend

Once the backend has a public HTTPS URL, set:

- `NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain`

This is the main frontend to backend bridge. It is consumed in `packages/frontend/lib/api.ts`.

### Step 8. Prepare the Vercel project

1. Push the repository to GitHub if it is not already there.
2. Import the repository into Vercel.
3. Set the root directory to the repository root.
4. Confirm that Vercel detects Next.js.
5. Set the build command to `pnpm build:frontend`.
6. Set the output directory to `packages/frontend/.next`.

Do not copy the build output to the repository root. That breaks the relative
trace paths inside `.next` and causes Vercel to look for files under
`/node_modules`.

For this repo, the frontend build uses:

- `next build packages/frontend`

### Step 9. Set Vercel environment variables

In the Vercel project settings, add these values:

- `NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain`
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=<walletconnect_project_id>`
- `NEXT_PUBLIC_STELLAR_NETWORK=testnet`

If the frontend needs any other `NEXT_PUBLIC_...` value later, add it here as well.

### Step 10. Deploy the frontend on Vercel

1. Trigger the first deployment.
2. Wait for the build to complete.
3. Open the Vercel URL.
4. Verify that the frontend can reach the backend.

If login fails, the first thing to check is whether the backend CORS origin matches the final Vercel domain.

## 11. CORS And Cookies

The backend only allows requests from the configured frontend origin.

That logic lives in `packages/backend/src/server.ts`.

You must set:

- `FRONTEND_URL=https://your-vercel-domain`

If `FRONTEND_URL` does not exactly match the deployed frontend origin, the backend will reject the browser request.

The auth flow also uses cookies:

- JWT refresh tokens are stored in httpOnly cookies
- The frontend keeps the access token in memory only

That means the frontend and backend must both use HTTPS in production.

## 12. What To Replace In This Repo

Here is the practical replace list.

### 12.1 In local `.env`

Keep these values for local work:

- `DATABASE_URL=postgresql://veridaq:veridaq_dev@localhost:5432/veridaq`
- `REDIS_URL=redis://localhost:6379`
- `FRONTEND_URL=http://localhost:3000`
- `BACKEND_URL=http://localhost:4000`
- `NEXT_PUBLIC_BACKEND_URL=http://localhost:4000`

Replace these with production values only when you are deploying:

- `DATABASE_URL`
- `REDIS_URL`
- `FRONTEND_URL`
- `BACKEND_URL`
- `NEXT_PUBLIC_BACKEND_URL`

### 12.2 In Vercel project settings

Set:

- `NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain`
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...`
- `NEXT_PUBLIC_STELLAR_NETWORK=testnet`

### 12.3 In backend host settings

Set:

- `FRONTEND_URL=https://your-vercel-domain`
- `BACKEND_URL=https://your-backend-domain`
- `DATABASE_URL=...`
- `REDIS_URL=...`
- `JWT_SECRET=...`
- `REFRESH_SECRET=...`
- `ENCRYPTION_KEY=...`
- `STELLAR_RPC_URL=...`

## 13. Seed Data And Migrations

The repo includes a seed script at `packages/backend/prisma/seed.ts`.

It creates:

- Admin user
- Demo institution
- Demo employer
- Default claim definitions

### Local setup

Run:

1. `pnpm db:migrate`
2. `pnpm db:seed`

### Production setup

For production, you usually do one of these:

- Run migrations during deploy
- Run a one time seed only if the database is empty and you want the default accounts

Do not reseed production repeatedly unless you intentionally want to upsert the default demo rows.

## 14. Contracts And Circuit Artifacts

This repo expects contract addresses and circuit artifacts to be available once you move beyond local development.

Important production variables include:

- `INSTITUTION_REGISTRY_ADDRESS`
- `CREDENTIAL_REGISTRY_ADDRESS`
- `REVOCATION_REGISTRY_ADDRESS`
- `PAYMASTER_VAULT_ADDRESS`
- `SUBSCRIPTION_MANAGER_ADDRESS`
- `ZK_VERIFIER_ADDRESS`
- `AA_SIMPLE_ACCOUNT_FACTORY_ADDRESS`
- `ENTRY_POINT_ADDRESS`

If you deploy new contracts, update the backend env with the new addresses.

For the circuit files, the backend expects paths to the compiled artifacts:

- `CIRCUIT_ZKEY_PATH`
- `CIRCUIT_WASM_PATH`

If you run the backend in Docker or on a container host, use absolute in container paths.

If you run the backend on the host machine, local relative paths may work if the process starts from the repository root.

## 15. Vercel Specific Notes

Current Vercel guidance relevant to this repo:

- Environment variables are set per project and per environment
- Production, Preview, and Development variables are separate
- `vercel env pull` can sync local env files from the project
- Next.js on Vercel gets automatic SSR, streaming, image optimization, and deployment preview support

For this repo, the most important Vercel env rule is this:

- Set `NEXT_PUBLIC_BACKEND_URL` for Production and Preview

Without that, the frontend will default to `http://localhost:4000` and break once deployed.

## 16. Supabase Specific Notes

Current Supabase guidance relevant to this repo:

- Direct connection is best for persistent backend services and migrations
- Pooler session mode is the fallback for persistent services on IPv4 only networks
- Pooler transaction mode is best for serverless and edge functions
- SSL should be used wherever possible

For this repo, because the backend is persistent, do not default to transaction pooler unless your host requires it.

## 17. Upstash Specific Notes

Current Upstash practice for this repo:

- Use the `rediss://` URL in production
- Keep the URL secret out of git history
- Use the same `REDIS_URL` key in local and production, but with different values

## 18. If You Want A Single Host Instead

If you want everything on one platform with almost no backend hosting work, the realistic options are not Vercel alone.

You would need either:

- A full backend host plus Vercel for the frontend
- Or a bigger rewrite so the backend becomes serverless friendly and the worker moves elsewhere

For this codebase, the first option is the correct one.

## 19. Minimal Production Checklist

Before launch, confirm these are true:

- Frontend is deployed on Vercel
- Backend is deployed on a persistent Node host
- Supabase connection string is in backend `DATABASE_URL`
- Upstash connection string is in backend `REDIS_URL`
- `FRONTEND_URL` matches the live frontend domain
- `BACKEND_URL` matches the live backend domain
- `NEXT_PUBLIC_BACKEND_URL` matches the live backend domain
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` is set in Vercel
- Circuit artifact paths are correct in production
- Contract addresses are filled if chain features are live
- HTTPS is enabled on both frontend and backend

## 20. Final Recommended Variable Set

This is the clean production naming set to use:

Backend:

- `NODE_ENV=production`
- `PORT=4000`
- `FRONTEND_URL=https://your-frontend-domain`
- `BACKEND_URL=https://your-backend-domain`
- `DATABASE_URL=<supabase_connection_string>`
- `REDIS_URL=<upstash_rediss_url>`
- `JWT_SECRET=<long_random_secret>`
- `REFRESH_SECRET=<long_random_secret>`
- `STELLAR_RPC_URL=https://soroban-testnet.stellar.org`
- `CIRCUIT_ZKEY_PATH=/app/packages/circuits/build/credential_final.zkey`
- `CIRCUIT_WASM_PATH=/app/packages/circuits/build/credential_js/credential.wasm`
- `ENCRYPTION_KEY=<64_hex_char_key>`

Frontend on Vercel:

- `NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain`
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=<walletconnect_project_id>`
- `NEXT_PUBLIC_STELLAR_NETWORK=testnet`

## 21. Bottom Line

The correct production deployment for this codebase is:

- Vercel for `packages/frontend`
- Supabase for PostgreSQL
- Upstash for Redis
- A real Node host for `packages/backend`

That matches the current code, the current env names, and the current deployment behavior without forcing a rewrite.

## 22. Optional Next Step

If you want, I can also turn this into a shorter checklist version for day of deployment, or a separate `.env.example` aligned with the production values above.
