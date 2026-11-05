<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="frontend/public/logo-white.png">
    <source media="(prefers-color-scheme: light)" srcset="frontend/public/logo-black.png">
    <img alt="VERIDAQ" src="frontend/public/logo-black.png" width="180" style="max-width: 100%;">
  </picture>

  <h1 align="center" style="margin-top: 16px; margin-bottom: 4px; font-size: 2.5em; font-weight: 700; letter-spacing: -0.02em;">VERIDAQ</h1>

  <p align="center" style="font-size: 1.15em; color: #586069; max-width: 600px; margin: 8px auto 20px;">
    Privacy-Preserving Academic Credential Verification on Stellar Soroban
  </p>

  <p align="center">
    <a href="https://github.com/official-veridaq/veridaqHQ/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
    </a>
    <a href="https://www.typescriptlang.org/">
      <img src="https://img.shields.io/badge/language-TypeScript-blue" alt="TypeScript">
    </a>
    <a href="https://nextjs.org/">
      <img src="https://img.shields.io/badge/frontend-Next.js%2015-black" alt="Next.js 15">
    </a>
    <a href="https://fastify.dev/">
      <img src="https://img.shields.io/badge/backend-Fastify%205-ffffff" alt="Fastify 5">
    </a>
    <a href="https://soroban.stellar.org/">
      <img src="https://img.shields.io/badge/blockchain-Soroban-9cf" alt="Soroban">
    </a>
    <a href="https://docs.circom.io/">
      <img src="https://img.shields.io/badge/zkp-Circom%202-ff69b4" alt="Circom 2">
    </a>
  </p>

  <br>

  <p align="center" style="font-size: 1.05em; max-width: 720px; margin: 0 auto; line-height: 1.6;">
    <strong>VERIDAQ</strong> enables academic institutions to issue verifiable credentials and<br>
    employers to verify them — all without exposing any student personal data.<br>
    Built on <strong>Stellar Soroban</strong> with <strong>Groth16 Zero-Knowledge Proofs</strong>.
  </p>
</div>

<br>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Repository Layout](#repository-layout)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Database Setup](#database-setup)
  - [Smart Contract Setup](#smart-contract-setup)
  - [Circuit Setup](#circuit-setup)
- [Running the Application](#running-the-application)
  - [Start the Backend](#start-the-backend)
  - [Start the Frontend](#start-the-frontend)
  - [Default Login Credentials](#default-login-credentials)
- [Testing](#testing)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

VERIDAQ solves a fundamental problem in credential verification: how can an employer verify an applicant's academic claims without the applicant surrendering their personal data and without the institution manually responding to every verification request?

The answer is Zero-Knowledge Proofs. Institutions register cryptographic commitments on the Stellar blockchain. When an employer needs to verify a claim, the system generates a Groth16 proof that the credential meets specific criteria (minimum CGPA, degree class, graduation year) without revealing the underlying data. The proof is verified on-chain against the stored commitment.

---

## Architecture

The platform consists of four main components:

**Smart Contract (Soroban)**
A Groth16 verifier contract deployed on Stellar Soroban testnet. It stores verification keys and verifies Groth16 proofs with four public signals: commitment, nullifier, claim type, and threshold. The contract is written in Rust using the Soroban SDK.

**Zero-Knowledge Circuit (Circom)**
A Circom 2 circuit that handles six claim types: CGPA minimum, degree class minimum, graduation year range, course of study match, institution accreditation, and cumulative credit threshold. The circuit uses Poseidon hashing and produces Groth16 proofs via SnarkJS.

**Backend (Fastify)**
A Node.js API built with Fastify 5 that orchestrates the entire verification flow. It handles institution and employer management, batch credential uploads, proof generation, on-chain verification, and billing. Uses Prisma ORM with PostgreSQL and BullMQ for background job processing.

**Frontend (Next.js)**
Three separate portals for institutions, employers, and platform administrators. Built with Next.js 15 App Router, Tailwind CSS, and shadcn/ui. Features include batch upload for institutions, one-click verification for employers, and platform management for admins.

---

## How It Works

### Credential Issuance

1. Institution admin uploads an XLSX file containing student credentials (name, matriculation number, CGPA, degree class, graduation year, course of study)
2. Backend processes each row through a BullMQ worker
3. Each credential is encrypted with AES-256-GCM using the institution's secret key
4. A Poseidon hash commitment (matricHash, secret, nullifier) is computed and stored on Stellar
5. The encrypted credential is stored in PostgreSQL
6. The plaintext data is immediately discarded from memory

### Credential Verification

1. Employer submits a verification request (institution, matriculation number, claim type, threshold value)
2. Backend looks up the credential by matriculation number
3. Decrypts the credential data using the institution's stored secret key
4. Generates a Groth16 proof via SnarkJS fullProve using the circuit
5. Submits the proof to the Soroban verifier contract on Stellar testnet
6. If the proof verifies, the result is stored as VERIFIED
7. Both institution and employer can see the verification result

---

## Repository Layout

```
veridaq/
  packages/
    contracts/          Soroban Rust contract
    circuits/           Circom 2 circuit
    backend/            Fastify API
    frontend/           Next.js App Router
    extension/          Chrome extension
  docker-compose.yml
  package.json
```

---

## Tech Stack

| Layer                | Technology              |
| -------------------- | ----------------------- |
| Blockchain           | Stellar Soroban Testnet |
| Smart Contract       | Rust, Soroban SDK       |
| Zero-Knowledge Proof | Circom 2, SnarkJS       |
| Commitment Hash      | Poseidon (circomlib)    |
| Backend              | Fastify 5, TypeScript   |
| ORM                  | Prisma 6                |
| Database             | PostgreSQL 16           |
| Queue                | Redis, BullMQ           |
| Blockchain Client    | @stellar/stellar-sdk    |
| Frontend             | Next.js 15, React 19    |
| Styling              | Tailwind CSS, shadcn/ui |
| Package Manager      | pnpm                    |
| Infrastructure       | Docker Compose          |

---

## Getting Started

### Prerequisites

| Tool           | Version       | Purpose                              |
| -------------- | ------------- | ------------------------------------ |
| Node.js        | 22+           | Runtime                              |
| pnpm           | 9+            | Package manager                      |
| Docker Desktop | Latest        | PostgreSQL 16 + Redis 7              |
| Rust + wasm32  | Latest stable | Soroban contract compilation         |
| stellar CLI    | Latest        | Contract deployment & invocation     |
| Circom 2       | 2.0.8+        | ZKP circuit compilation (optimistic) |
| Freighter      | Latest        | Stellar wallet browser extension     |

### Quick Start (Local Development — No Blockchain Required)

This path uses the mock blockchain — every Stellar call returns a safe default.
No RPC endpoint, no wallet, no XLM needed.

```bash
# 1. Clone
git clone git@github.com:trinnode/veridaqHQ.git
cd veridaq

# 2. Install dependencies
pnpm install

# 3. Start infra (PostgreSQL + Redis)
docker compose up -d

# 4. Copy env and enable mock blockchain
cp .env.example .env
# Edit .env: set USE_MOCK_BLOCKCHAIN=true
# This makes every blockchain call return a mock value.
# All other vars can stay at defaults (except JWT_SECRET / ENCRYPTION_KEY).

# 5. Database
pnpm db:migrate
pnpm db:seed

# 6. Start backend
pnpm dev:backend     # → http://localhost:4000

# 7. Start frontend (separate terminal)
pnpm dev:frontend    # → http://localhost:3000

# 8. Log in with seeded credentials (see below)
```

### Full Setup (Real Stellar Testnet — With On-Chain Transactions)

#### Step 1 — Clone & Install

```bash
git clone git@github.com:trinnode/veridaqHQ.git
cd veridaq
pnpm install
```

#### Step 2 — Start Infrastructure

```bash
docker compose up -d
docker compose ps          # Both postgres + redis should show "healthy"
```

#### Step 3 — Configure Environment

```bash
cp .env.example .env
```

Fill in the following variables in `.env`:

| Variable                    | Value / How to Get                  |
| --------------------------- | ----------------------------------- |
| `JWT_SECRET`                | `openssl rand -base64 64`           |
| `REFRESH_SECRET`            | `openssl rand -base64 64`           |
| `ENCRYPTION_KEY`            | `openssl rand -hex 32`              |
| `USE_MOCK_BLOCKCHAIN`       | `false`                             |
| `PLATFORM_ADMIN_SECRET_KEY` | Your Stellar secret key (see below) |
| `PLATFORM_ADMIN_PUBLIC_KEY` | Corresponding public key            |

**Generate a Stellar admin keypair:**

```bash
stellar keys generate veridaq-admin
stellar keys show veridaq-admin
# Copy the secret key → PLATFORM_ADMIN_SECRET_KEY
# Copy the public key  → PLATFORM_ADMIN_PUBLIC_KEY
```

Or derive from an existing 24-word mnemonic:

```bash
node -e "
const { Keypair } = require('@stellar/stellar-sdk');
// In production, never hardcode mnemonics — use a .env secret
const mnemonic = 'your twenty four word mnemonic phrase goes here ...';
const kp = Keypair.fromMnemonic(mnemonic);
console.log('Secret:', kp.secret());
console.log('Public:', kp.publicKey());
"
```

**Fund the account on testnet** (needs XLM for contract fees):

```bash
curl -X POST "https://friendbot.stellar.org?addr=$(grep PLATFORM_ADMIN_PUBLIC_KEY .env | cut -d= -f2)"
```

#### Step 4 — Run Database Migrations

```bash
pnpm db:migrate
pnpm db:seed
```

The seed script creates three test accounts and prints confirmation lines.

#### Step 5 — Deploy Contracts (Only If Starting Fresh)

The following contracts have been pre-deployed on Stellar Soroban testnet with the **existing admin keypair**. If you are using a **different admin keypair**, you must redeploy them:

**Institution Registry** — stores institution identities and KYC status
**Credential Registry (Veridaq Core)** — stores credential commitments, handles batch registration, manages employer credits and verification fees
**Groth16 Verifier** — verifies Groth16 ZK proofs on-chain

```bash
# Build WASM
cd contracts/groth16-verifier
cargo build --target wasm32-unknown-unknown --release
cd ../veridaq-core
cargo build --target wasm32-unknown-unknown --release
cd ../institution-registry
cargo build --target wasm32-unknown-unknown --release
cd ../..

# Deploy all three
INST_REG=$(stellar contract deploy \
  --wasm contracts/target/wasm32v1-none/release/institution_registry.wasm \
  --source veridaq-admin --network testnet)

CORE_REG=$(stellar contract deploy \
  --wasm contracts/target/wasm32v1-none/release/veridaq_core.wasm \
  --source veridaq-admin --network testnet)

ZK_VER=$(stellar contract deploy \
  --wasm contracts/target/wasm32v1-none/release/groth16_verifier.wasm \
  --source veridaq-admin --network testnet)

# Initialize each contract
ADMIN=$(grep PLATFORM_ADMIN_PUBLIC_KEY .env | cut -d= -f2)

stellar contract invoke --id $INST_REG --source veridaq-admin --network testnet -- \
  initialize --admin $ADMIN

stellar contract invoke --id $ZK_VER --source veridaq-admin --network testnet -- \
  initialize --admin $ADMIN

stellar contract invoke --id $CORE_REG --source veridaq-admin --network testnet -- \
  initialize \
  --admin $ADMIN \
  --institution_registry $INST_REG \
  --groth16_verifier $ZK_VER \
  --verifier_vk_hash 0000000000000000000000000000000000000000000000000000000000000001 \
  --xlm_asset $ADMIN

# Fill .env with deployed IDs
echo "
INSTITUTION_REGISTRY_ID=$INST_REG
CREDENTIAL_REGISTRY_ID=$CORE_REG
REVOCATION_REGISTRY_ID=$CORE_REG
ZK_VERIFIER_ID=$ZK_VER
" >> .env
```

**Pre-deployed contract IDs** (current admin keypair):

| Contract             | Address                                                    |
| -------------------- | ---------------------------------------------------------- |
| Institution Registry | `CDX674MGO7EAYPFIRGWZEXDN2JTVUT2GMSJQA5DFKGCEIIATG2MOAALW` |
| Credential Registry  | `CD33Q52CNAQJGSDBOTSR2DYGEG4775SCLPHRGHLAXRAMAKAWRZQEDQB2` |
| Groth16 Verifier     | `CDV5XY4N3E7NPEVHK7ZARVOYQJ4VF3VCYPR7NRX64JMGO74GHY54ZA24` |

**Register the test institution on-chain** (required for batch upload):

```bash
INST_REG=CDX674MGO7EAYPFIRGWZEXDN2JTVUT2GMSJQA5DFKGCEIIATG2MOAALW
ADMIN=$(grep PLATFORM_ADMIN_PUBLIC_KEY .env | cut -d= -f2)
# left-padded hex of "futminna"
INST_ID="0000000000000000000000000000000000000000000000006675746d696e6e61"

stellar contract invoke --id $INST_REG --source veridaq-admin --network testnet -- \
  register --caller $ADMIN --id $INST_ID \
  --name "Federal University of Technology Minna" --admin_wallet $ADMIN
```

#### Step 6 — Circuit Setup (Optimistic — Uses Pre-Built Artifacts)

The circuit artifacts (proving key, WASM, verification key) are gitignored.
If they are missing, run:

```bash
pnpm circuit:compile
pnpm circuit:setup
```

This downloads a ~230 MB Powers of Tau file, runs phase 2 setup, and exports:

- `packages/circuits/build/credential_final.zkey` — proving key
- `packages/circuits/build/credential_js/credential.wasm` — witness generator

**Skip this step** if using mock blockchain (proof generation is not needed).

---

## Running the Application

### Start the Backend

```bash
pnpm dev:backend
```

The backend starts on port 4000 by default.  
Swagger UI (all routes documented): http://localhost:4000/docs

### Start the Frontend

```bash
pnpm dev:frontend
```

The frontend starts on port 3000. Three portals available:

| Portal      | URL                                     |
| ----------- | --------------------------------------- |
| Institution | http://localhost:3000/institution/login |
| Employer    | http://localhost:3000/employer/login    |
| Admin       | http://localhost:3000/admin/login       |

### Default Login Credentials

| Portal      | Email                 | Password    |
| ----------- | --------------------- | ----------- |
| Institution | futminna@veridaq.xyz  | Inst@2026!  |
| Employer    | firstbank@veridaq.xyz | Emp@2026!   |
| Admin       | admin@veridaq.xyz     | Admin@2026! |

### Testing the Batch Upload Flow (Real On-Chain)

1. Login as **institution** (`futminna@veridaq.xyz` / `Inst@2026!`)
2. Go to **Batches** → **Upload**
3. Download the template, fill in student rows, upload
4. The worker processes the file and calls `register_batch` on Soroban
5. Status changes to **CONFIRMED** with a real testnet transaction hash
6. View the tx on https://stellar.expert/explorer/testnet/tx/{txHash}

### Testing the Verification Flow

1. Login as **employer** (`firstbank@veridaq.xyz` / `Emp@2026!`)
2. Go to **Verify** — submit institution, matric number, claim type, threshold
3. Backend generates a Groth16 proof and calls the Soroban verifier
4. Result shows **VERIFIED** or **CLAIM_NOT_SATISFIED**
5. Click **Download PDF report** to get a signed PDF verification certificate

### Testing the Credits Purchase Flow

1. Login as **employer**
2. Click **Buy Credits** on the dashboard
3. Select a credit pack
4. Connect Freighter wallet (or use the fiat/card option)
5. Credits are applied immediately after payment is recorded

---

## Testing

```bash
pnpm lint           # ESLint — checks all TypeScript/TSX files
pnpm typecheck      # TypeScript checks — both backend + frontend tsconfig
pnpm test:backend   # Backend test suite (124 tests across 5+ suites)
pnpm test:contracts # Rust contract tests (18 tests across 2 contracts)
pnpm build:backend  # Production backend build (tsc)
pnpm build:frontend # Production frontend build (next build)
```

---

## Deployment

1. Deploy the Soroban contract to Stellar testnet or mainnet
2. Build and deploy the backend to your hosting provider
3. Build and deploy the frontend to Vercel or your hosting provider
4. Update .env with production values
5. Run database migrations on the production database

---

---

## Troubleshooting

### "Port 4000 already in use"

```bash
fuser -k 4000/tcp
pnpm dev:backend
```

### Backend crashes with "ENOENT: no such file or directory"

The backend resolves paths relative to the source file location. If you moved files or are running from a different directory, ensure these exist:

- `backend/src/assets/fonts/Orbitron-Variable.ttf`
- `frontend/public/logo-white.png`
- `frontend/public/logo-black.png`
- `/usr/share/fonts/truetype/msttcorefonts/CAMBRIA.TTC` (install `msttcorefonts` if missing)

### "Soroban simulation error" / on-chain call fails

1. Check that all contract IDs in `.env` match deployed contracts
2. Ensure the admin keypair (`PLATFORM_ADMIN_SECRET_KEY`) owns the contracts or has permissions
3. Verify the account has enough testnet XLM:
   ```bash
   curl "https://horizon-testnet.stellar.org/accounts/$PLATFORM_ADMIN_PUBLIC_KEY"
   ```
4. Re-register the test institution on-chain if using a new admin key:
   ```bash
   stellar contract invoke --id $INST_REG --source veridaq-admin --network testnet -- \
     register --caller $ADMIN --id $INST_ID \
     --name "Federal University of Technology Minna" --admin_wallet $ADMIN
   ```

### "Transaction Failed" when buying credits

The frontend sends XLM amounts like `"0.01"` which caused a `BigInt` parse error in earlier versions. Ensure you're running the latest code from this branch.

### "Batch validation fails — GraduationYear error"

The XLSX template expects 6 columns in this order:

1. MatricNumber
2. StudentName
3. CGPA
4. Classification
5. CourseName
6. GraduationYear

Download the template from the institution Batches page for the correct format.

### Docker not working / Docker Hub unreachable

Docker is only needed for PostgreSQL and Redis. If Docker is unavailable:

```bash
# Use local Postgres + Redis instead
# Install postgresql and redis-server on your system, then:
createdb veridaq
redis-server &

# Update .env:
# DATABASE_URL=postgresql://localhost:5432/veridaq
# REDIS_URL=redis://localhost:6379
```

The backend and frontend run natively with `pnpm dev:backend` / `pnpm dev:frontend`.

---

## License

MIT
