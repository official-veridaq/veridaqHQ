# VERIDAQ — GitHub Copilot Workspace Instructions

## What this project is

VERIDAQ (Verified Academic Qualifications) is a privacy-preserving academic credential
verification platform built on the Stellar Soroban blockchain. Institutions register
student credential records on-chain as Poseidon hash commitments. Employers request
verification of specific academic claims. The system uses Groth16 Zero-Knowledge Proofs
to prove those claims without disclosing any personal student data to the blockchain or
to the employer beyond what they specifically requested.

The core guarantee is: no student name, grade, matriculation number, or personal
attribute ever appears on the public blockchain in any readable form at any stage.

## Tech stack

| Layer               | Technology                                   |
| ------------------- | -------------------------------------------- |
| Blockchain          | Stellar Soroban (Soroban testnet)             |
| Smart Contracts     | Rust, Soroban SDK                             |
| Account Abstraction | N/A (Soroban native fee model)               |
| ZKP Circuit         | Circom 2.0.8, SnarkJS 0.7, Groth16           |
| Commitment Hash     | Poseidon (circomlib)                         |
| Backend             | Node.js 22, Fastify 5, TypeScript 5.8        |
| Database            | PostgreSQL 16, Prisma 6                      |
| Queue               | Redis 7, BullMQ 5                            |
| Blockchain client   | @stellar/stellar-sdk                          |
| Frontend            | Next.js 15 (App Router), React 19            |
| Styling             | Tailwind CSS 3.4, shadcn/ui                  |
| Package manager     | pnpm (monorepo, single root package.json)    |
| Infrastructure      | Docker Compose (local Postgres + Redis)      |

## Architecture in plain terms

Three actors use the system:

1. INSTITUTION (a university registrar) — uploads an Excel file of graduating students.
   The backend computes a Poseidon commitment and nullifier for each student and submits
    them on-chain via Soroban contract invocation.

2. EMPLOYER — selects an institution, enters a matriculation number, picks a claim (e.g.
   "Minimum Upper Second Class"). The backend generates a Groth16 ZKP proving that claim
   against the on-chain commitment, calls verifyProof on-chain, returns VERIFIED or NOT.

3. ADMIN — registers institutions and employers, manages tiers, monitors the platform.

The student has no portal. They receive one email on issuance. That is all.

## Directory layout

```
veridaq/
  packages/
    contracts/       Soroban Rust contract + tests
    circuits/        Circom 2 circuit + trusted setup scripts
    backend/         Fastify 5 API — routes, services, BullMQ workers, Prisma
    frontend/        Next.js 15 App Router — institution, employer, admin portals
  docker-compose.yml Postgres 16 + Redis 7
  package.json       Single root package.json with all npm dependencies
  GUIDE.md           Step-by-step setup guide
```

## Coding conventions — READ CAREFULLY

These rules apply everywhere in this codebase. Follow them precisely.

### General

- All code, comments, and variable names must use plain English.
- Do not use hyphens or dashes in prose comments. Use commas or full stops instead.
- Do not use AI buzzwords: no "leverage", "harness", "cutting-edge", "robust", "robust
  solution", "scalable", "seamless", "journey", "ecosystem", "revolutionize", etc.
- Write comments as a competent developer would: explain WHY something is done, not
  just WHAT the code does.
- Numbers below 10 in comments are written as words (two, three, seven).
- No contractions in comments (write "do not" not "don't").

### TypeScript

- Use strict TypeScript. No `any` unless absolutely necessary and justified in comment.
- Prefer `type` over `interface` for simple shapes. Use `interface` for objects that
  need to be extended.
- Use Zod for ALL external input validation (API request bodies, env vars, Excel rows).
- Return typed objects from services, not raw Prisma models where possible.
- Use named exports everywhere. No default exports except Next.js pages and layouts.
- Organize imports: external libs, then internal absolute paths, then relative paths.

### Solidity

- Solidity version is locked to 0.8.28. Do not change this.
- Use custom errors (revert MyError()) not require() with strings.
- Follow the pattern: checks, effects, interactions.
- Emit events for every state change.
- Use OpenZeppelin 5 for AccessControl, ReentrancyGuard, Pausable. Do not roll your own.
- NatSpec comments on all public and external functions.
- Function order: constructor, receive/fallback, external, public, internal, private,
  then view/pure functions at the end.

### Security rules (non-negotiable)

- JWT tokens are stored in httpOnly cookies, not localStorage or sessionStorage.
- All user inputs are validated with Zod before touching the database.
- Passwords are hashed with bcryptjs cost factor 12.
- The encryption key for credential plaintext is AES-256-GCM. It lives in the .env file
  and never in the codebase.
- Rate limiting is applied to all authentication endpoints.
- CORS is configured to allow only the frontend origin.
- The private key for blockchain operations is never logged, never sent to the client,
  and never stored in the database.
- All database queries that modify data run inside a transaction where more than one
  table is affected.
- SQL injection is not possible through Prisma parameterized queries; do not use raw
  queries unless absolutely required.
- The proof generation worker deletes the private inputs from memory immediately after
  SnarkJS fullProve() returns.

### Frontend

- Use Next.js App Router (app/ directory). No Pages Router.
- All pages that fetch protected data are server components by default.
- Use "use client" only where browser APIs or React state/hooks are needed.
- Data fetching in server components uses the backend API via fetch() with proper
  cookie forwarding.
- Use @tanstack/react-query for client-side data fetching and caching.
- Use react-hook-form + Zod for all forms.
- No raw CSS except in globals.css. Use Tailwind utility classes.
- Dark theme by default. Colors come from the Tailwind config custom palette.
- Responsive design: mobile breakpoints must be considered on every page.

## Smart contracts overview

| Contract            | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| InstitutionRegistry | On-chain identity for institutions: slug, admin wallet, public key |
| CredentialRegistry  | Stores (commitment, nullifier) pairs per institution per batch     |
| RevocationRegistry  | Append-only list of revoked nullifiers                             |
| PaymasterVault      | On-chain XLM balance for gas fees                                  |
| SubscriptionManager | Institution tiers (FREE/PAID) and employer verification counters   |
| ZKVerifier          | Auto-generated by SnarkJS — on-chain Groth16 proof verifier        |

## ZKP circuit inputs

Private: nameHash, matricHash, cgpa (CGPA x 100 as integer), classification (1-4),
courseHash, graduationYear, blindingFactor, institutionKey.

Public: commitment (on-chain), nullifier (on-chain), claimType (1-6), threshold (for
CGPA threshold claims, 0 otherwise).

Commitment = Poseidon(nameHash, matricHash, cgpa, classification, courseHash,
graduationYear, blindingFactor).

Nullifier = Poseidon(matricHash, institutionKey).

## Default test credentials (seeded by db:seed)

| Role        | Email                 | Password    |
| ----------- | --------------------- | ----------- |
| Admin       | admin@veridaq.xyz     | Admin@2026! |
| Institution | futminna@veridaq.xyz  | Inst@2026!  |
| Employer    | firstbank@veridaq.xyz | Emp@2026!   |

## Where to find things

- Environment variables: .env.example (copy to .env and fill in)
- Database schema: packages/backend/prisma/schema.prisma
- API routes: packages/backend/src/routes/
- Proof generation: packages/backend/src/services/proof.service.ts
- Blockchain interactions: packages/backend/src/services/blockchain.service.ts
- ZKP circuit: packages/circuits/credential.circom
- Frontend pages: packages/frontend/app/
- Shared UI components: packages/frontend/components/
- API client: packages/frontend/lib/api.ts
- Auth utilities: packages/frontend/lib/auth.ts
