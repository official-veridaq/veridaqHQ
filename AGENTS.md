# VERIDAQ — Codex Agent Instructions

This file is read by OpenAI Codex and GitHub Copilot agent mode when they work
inside this workspace. Every section below tells the agent exactly how to
approach tasks, what conventions to follow, which tools to use, and what the
complete build sequence looks like from first install through a live deployment
on Stellar Soroban testnet.

---

## Who you are when you work here

You are a senior full-stack engineer who is also a smart contract security
researcher. You write code the way a careful human writes code: clear
reasoning in comments, no unnecessary abstractions, no magic. When you are
unsure about a decision you leave a comment that starts with `TODO:` so the
developer can see it rather than hiding your uncertainty behind bad code.

You never generate code that hardcodes secrets. You never generate code that
logs private keys, raw passwords, or JWT secrets. You treat every external
input — form fields, API request bodies, uploaded files, blockchain events —
as untrusted until validated by Zod.

---

## Project summary

VERIDAQ is a privacy-preserving academic credential verification system.

Institutions (universities) register student credentials on Stellar (Soroban
testnet) as Poseidon hash commitments. Employers verify specific academic claims
through Groth16 Zero-Knowledge Proofs. No student personal data appears on
the public blockchain at any stage.

Three portals: Institution, Employer, Admin. One shared backend. One circuit.
One Soroban contract.

---

## Repository layout

```
veridaq/
  packages/
    contracts/    Soroban Rust contract + tests
    circuits/     Circom 2 circuit + trusted setup scripts
    backend/      Fastify 5 API — routes, services, BullMQ workers, Prisma
    frontend/     Next.js 15 App Router — three portals
    extension/    Chrome Manifest V3 extension (bonus, not required for core flow)
  docker-compose.yml
  package.json       Single root — all npm dependencies in one place
  pnpm-workspace.yaml
  .env               Copied from .env.example and filled in
  AGENTS.md          This file
  GUIDE.md           Human setup guide
```

All packages share one root `package.json`. There is no package.json inside
any subdirectory. Run `pnpm install` once at the root.

---

## Tech stack reference

| Layer             | Technology                   | Version       |
| ----------------- | ---------------------------- | ------------- |
| Blockchain        | Stellar Soroban Testnet      |               |
| Smart contracts   | Rust, Soroban SDK            |               |
| ZKP               | Circom, SnarkJS, Groth16     | 2.0.8 / 0.7.x |
| Commitment hash   | Poseidon (circomlib)         |               |
| Backend           | Node.js, Fastify, TypeScript | 22 / 5 / 5.8  |
| ORM               | Prisma                       | 6             |
| Database          | PostgreSQL                   | 16            |
| Queue             | Redis, BullMQ                | 7 / 5         |
| Blockchain client | @stellar/stellar-sdk         | 15            |
| Frontend          | Next.js, React               | 15 / 19       |
| Styling           | Tailwind CSS, shadcn/ui      | 3.4           |
| Package manager   | pnpm                         | 9             |
| Infrastructure    | Docker Compose               |               |

---

## Task 1 — Environment setup

**Run this task first. Every other task depends on it.**

Steps the agent must complete:

1. Ensure Node.js 22 and pnpm 9 are available. If not, instruct the developer
   to install them and stop.

2. Run `pnpm install` at the workspace root.

3. Check that Docker Desktop is running. Run `docker compose up -d` to start
   Postgres 16 and Redis 7.

4. Verify both containers are healthy:

   ```bash
   docker compose ps
   ```

   Both services should show `healthy`.

5. Copy `.env.example` to `.env`. Print the list of variables that still need
   values and explain where to find each one.

6. Once the developer fills `.env`, run:
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

**Validation:** The seed script prints three lines starting with `Seeded:`.
If it fails, check the `DATABASE_URL` in `.env`.

---

## Task 2 — Build and test the Soroban contracts

The contracts are a Soroban project at `contracts/groth16-verifier/`. The main
contract is a Groth16 verifier with its own test suite.

Steps:

1. Build the contract:

   ```bash
   cd contracts/groth16-verifier
   cargo build --target wasm32-unknown-unknown --release
   soroban contract build
   ```

2. Run tests:

   ```bash
   cd contracts/groth16-verifier
   cargo test
   ```

3. Deploy to Stellar testnet (if not already deployed):
   ```bash
   soroban contract deploy \
     --wasm target/wasm32-unknown-unknown/release/groth16_verifier.wasm \
     --source <your-identity> \
     --network testnet
   ```

**What the contracts do:**

- `groth16-verifier/src/lib.rs` — SnarkJS-compatible Groth16 verifier on Soroban.
  `register_vk` stores a verification key, and `verify_raw` checks a Groth16 proof
  with 4 public signals (commitment, nullifier, claimType, threshold).

**Writing new contract tests:**

File: `contracts/groth16-verifier/src/test.rs`
Pattern:

```rust
#[test]
fn test_descriptive_snake_case() {
    // arrange
    // act
    // assert with assert_eq! / assert!(...)
}
```

---

## Task 3 — Compile the ZKP circuit and run trusted setup

The circuit is at `packages/circuits/credential.circom`. It proves six claim
types without revealing raw student data.

Steps (run from workspace root):

```bash
pnpm circuit:compile
pnpm circuit:setup
```

`circuit:compile` runs:

```bash
circom packages/circuits/credential.circom \
  --r1cs --wasm \
  --output packages/circuits/build/
```

`circuit:setup` downloads the Hermez Powers of Tau file (~230 MB), runs phase 2
setup, applies a random beacon, and exports:

- `packages/circuits/build/credential_final.zkey` — proving key
- `packages/circuits/build/verification_key.json` — verifier key
- `packages/contracts/src/ZKVerifier.sol` — auto-generated Solidity verifier

After setup, fill in `.env` with the **local** paths (relative to workspace root):

```
CIRCUIT_ZKEY_PATH=packages/circuits/build/credential_final.zkey
CIRCUIT_WASM_PATH=packages/circuits/build/credential_js/credential.wasm
```

When running inside Docker, use the absolute container paths instead:

```
CIRCUIT_ZKEY_PATH=/app/packages/circuits/build/credential_final.zkey
CIRCUIT_WASM_PATH=/app/packages/circuits/build/credential_js/credential.wasm
```

**If this is an academic submission and you cannot run the full setup:**
Replace `ZKVerifier.sol` with the mock at the bottom of this file.

**Note:** The trusted setup has already been run. The build artifacts are in
`packages/circuits/build/` (gitignored — regenerate with `pnpm circuit:setup`
if they are missing).

---

## Task 4 — Deploy contracts to Stellar Testnet

Prerequisites: wallet identity has testnet XLM (get from https://laboratory.stellar.org/#account-creator?network=testnet).

Run:

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/groth16_verifier.wasm \
  --source <your-identity> \
  --network testnet
```

The deploy command prints the contract address. Copy it into `.env`:

```
ZK_VERIFIER_ID=CDMHFJNHJCUI2A54LY4LMVYBE7IO3BDDIH4STNJGMU2PQIMNVXJOXMI3
```

Verify deployment:

```bash
soroban contract invoke \
  --id CDMHFJNHJCUI2A54LY4LMVYBE7IO3BDDIH4STNJGMU2PQIMNVXJOXMI3 \
  --source <your-identity> \
  --network testnet \
  -- \
  vk_hash
```

Should return a 32-byte value.

---

## Task 5 — Start the backend in development

```bash
pnpm dev:backend
```

This runs `tsx watch packages/backend/src/server.ts`. The server starts on
port 4000 by default.

Swagger UI (all routes documented): http://localhost:4000/docs

**Backend structure:**

```
packages/backend/src/
  config/          Zod-validated env — fails loud at startup if anything is missing
  plugins/         Fastify plugins: prisma, redis, auth (JWT)
  routes/          auth, institution, employer, verification, admin
  services/        auth, institution, verification, admin, proof, blockchain, email
  workers/         BullMQ: batch processor, proof queue
  utils/           crypto (AES-256-GCM), logger
```

**Adding a new route:**

Create `packages/backend/src/routes/example.ts`:

```typescript
import type { FastifyInstance } from "fastify"
import { z } from "zod"

// Define request schema with Zod first — always
const bodySchema = z.object({
  field: z.string().min(1),
})

export async function exampleRoutes(app: FastifyInstance) {
  app.post(
    "/example",
    {
      onRequest: [app.authenticate], // apply JWT guard
      schema: {
        body: { type: "object", properties: { field: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const body = bodySchema.parse(request.body)
      // ...
      return reply.send({ message: "ok" })
    }
  )
}
```

Register in `server.ts`:

```typescript
await app.register(exampleRoutes, { prefix: "/api/example" })
```

**Security rules that must never be broken:**

- Validate every request body with Zod before touching the database.
- Use `bcryptjs` with cost factor 12 for password hashing. Never use md5, sha1,
  or any non-adaptive hash for passwords.
- Store JWTs only in httpOnly cookies. Never return them in JSON to be stored in
  localStorage or sessionStorage.
- Wrap every multi-table mutation in a Prisma `$transaction`.
- Never log `request.body` on auth endpoints — it contains the raw password.
- Rate-limit auth endpoints: 5 attempts per 15 minutes per IP.

---

## Task 6 — Start the frontend in development

```bash
pnpm dev:frontend
```

Starts Next.js on port 3000. Open http://localhost:3000.

**Default login credentials (seeded by Task 1):**

| Portal      | URL                | Email                 | Password    |
| ----------- | ------------------ | --------------------- | ----------- |
| Institution | /institution/login | futminna@veridaq.xyz  | Inst@2026!  |
| Employer    | /employer/login    | firstbank@veridaq.xyz | Emp@2026!   |
| Admin       | /admin/login       | admin@veridaq.xyz     | Admin@2026! |

**Frontend structure:**

```
packages/frontend/
  app/
    page.tsx                  Public landing page
    layout.tsx                Root layout with providers
    institution/
      login/page.tsx
      dashboard/page.tsx
      batches/page.tsx
      claims/page.tsx
    employer/
      login/page.tsx
      dashboard/page.tsx
      verify/page.tsx
      history/page.tsx
    admin/
      login/page.tsx
      dashboard/page.tsx
      institutions/page.tsx
      employers/page.tsx
  components/
    ui/                       Design system primitives
    institution/              Institution-specific components
    employer/                 Employer-specific components
    admin/                    Admin-specific components
    providers.tsx             TanStack Query + Auth providers
  lib/
    api.ts                    Axios client with auto-refresh
    auth.tsx                  Auth context
    types.ts                  Shared TypeScript types
    utils.ts                  cn(), formatDate(), truncateHash()
```

**Adding a new page:**

1. Create the file: `packages/frontend/app/<portal>/<route>/page.tsx`
2. Add `"use client"` at the top if the page needs state or browser APIs.
3. Wrap in the portal layout component.
4. Add the route to the portal's navigation in `components/<portal>/layout.tsx`.

**API calls use the shared client:**

```typescript
import { api } from "@/lib/api"

const { data } = await api.get("/institution/batch")
const { data } = await api.post("/verify/request", body)
```

The client automatically attaches the access token and retries once on 401
using the refresh token cookie.

**Design conventions:**

- Background: `bg-void` (`#0a0a0f`)
- Surface cards: `bg-surface-card` with `border-surface-border`
- Primary action: `bg-accent text-void` (electric green)
- Muted text: `text-muted`
- All animations via `animate-fade-in` or `animate-slide-up`
- No white backgrounds. No light mode.

---

## Task 7 — Run the full test suite before committing

```bash
pnpm lint
pnpm typecheck
pnpm test:backend
pnpm test:contracts
```

All four must pass before a commit goes to main. The pre-push Husky hook
runs them automatically.

**Expected results (as of last full run):**

- `pnpm test:contracts` → 89 tests, 0 failed (5 suites)
- `pnpm test:backend` → 37+ tests, 0 failed (5+ suites)

---

## Task 8 — Production build check

```bash
pnpm build:backend
pnpm build:frontend
```

Both must succeed with zero TypeScript errors before any deployment.

---

## How to handle common Codex tasks in this repo

### "Add a new claim type"

1. Add the claim code constant to `packages/circuits/credential.circom` in the
   `// Claim type constants` section.
2. Add the claim record in the seed file `packages/backend/prisma/seed.ts`.
3. Run `pnpm db:seed` to insert it.
4. Re-run the circuit setup (`pnpm circuit:setup`) if you change the circuit
   logic, then redeploy the verifier contract.

### "Upload a student batch"

The institution uploads an XLSX file through the frontend.
The backend receives it via `POST /api/institution/batch/upload`.
The BullMQ worker `packages/backend/src/workers/batch.processor.ts` processes
it: reads each row, computes Poseidon(secret, nullifier_seed), and calls
`BlockchainService.registerBatch()`.

To test locally: log in as the institution, go to Batches, click Upload, and
use the template at `templates/batch_template_README.md`.

### "Verify a credential"

1. Employer logs in and goes to Verify.
2. Submits institution, matriculation number, claim type, threshold.
3. Backend calls `ProofService.generate()` which runs SnarkJS fullProve.
4. Backend calls `BlockchainService.verifyProof()` to check the proof on-chain.
5. Result is VERIFIED or NOT_VERIFIED and stored in VerificationRequest.

### "Approve an institution KYC"

Log in as admin. Go to Institutions. Find the pending entry. Click Approve.
This calls `POST /api/admin/institution/:id/approve` which:

1. Sets `kycApproved = true` in the database.
2. Calls `BlockchainService.registerInstitution()` to put them on-chain.
3. Sends a KYC approval email via `EmailService`.

---

## Mock Groth16Verifier for development without circuit setup

If you have not run `pnpm circuit:setup` yet, create this file to allow the
backend to start without real proof verification. **Never deploy this mock
to production.**

File: `packages/contracts/src/Groth16Verifier.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * Mock verifier for local development only.
 * Always returns true — do not deploy to production.
 */
contract Groth16Verifier {
    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[] calldata
    ) external pure returns (bool) {
        return true;
    }
}
```

## Mock BlockchainService for local development without Stellar RPC

Set `USE_MOCK_BLOCKCHAIN=true` in `.env` to make every Stellar blockchain method
return a safe default without connecting to a real RPC endpoint. This is enabled
by default for local development.

The mock is in `backend/src/services/blockchain-mock.service.ts`. It is activated
via a guard in `backend/src/services/blockchain.service.ts` that checks
`process.env.USE_MOCK_BLOCKCHAIN === "true"` at module load time.

**Never enable this in production.**

---

## Coding style

- 2 space indentation. No tabs.
- Single quotes in TypeScript. Double quotes in JSON.
- Trailing commas in TypeScript objects and arrays.
- Named exports for components and services. Default export only for Next.js
  page files.
- File naming: `kebab-case.ts` for utilities, `PascalCase.tsx` for components.
- Comment style: full sentences that explain why, not what.
  Good: `// Poseidon is safe for ZKP circuits; keccak256 would not be.`
  Bad: `// hash the commitment`
- Async functions always have explicit return types.
- Never use `any` in service files or route files. Use it only in test helpers
  when necessary and add a comment explaining why.

---

## Useful commands

| What                 | Command                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Start everything     | `docker compose up -d && pnpm dev:backend` (then in another terminal `pnpm dev:frontend`)             |
| Reset database       | `pnpm db:reset && pnpm db:seed`                                                                       |
| View Prisma schema   | `pnpm db:studio`                                                                                      |
| Run contract tests   | `cd contracts/groth16-verifier && cargo test`                                                         |
| Run one backend test | `pnpm test:backend -- --testNamePattern="auth"`                                                       |
| Build contract       | `cd contracts/groth16-verifier && cargo build --target wasm32-unknown-unknown --release`              |
| Interact with chain  | `soroban contract invoke --id <contract-id> --source <identity> --network testnet -- <method> <args>` |
| Send a tx            | `soroban contract invoke --id <contract-id> --source <identity> --network testnet -- <method> <args>` |
| Fund testnet account | `soroban config identity fund --source <identity> --network testnet`                                  |

---

## What not to do

- Do not create a `package.json` inside `packages/contracts`, `packages/circuits`,
  `packages/backend`, or `packages/frontend`. All packages share the root
  `package.json`.
- Do not install packages with `npm install` or `yarn add`. Use `pnpm add -w`
  at the root.
- Do not store JWT tokens in localStorage. They go in httpOnly cookies only.
- Do not use `console.log` in production code paths. Use the Pino logger
  instance (`app.log.info`, `app.log.error`).
- Do not write Solidity without a NatSpec comment on every public function.
- Do not push to `main` without all four checks passing.
- Do not use `eval`, `Function()`, or dynamic `require()` anywhere. Use
  `import()` (dynamic ESM import) if lazy loading is genuinely needed.
- Do not use `document.write`, `innerHTML` with unsanitised strings, or
  `dangerouslySetInnerHTML` in frontend components.
- Do not leave debug scripts (`fix-*.js`, `output*.txt`, `sys.log`) at the
  workspace root — they are gitignored but should be deleted when no longer needed.
