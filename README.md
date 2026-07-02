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

| Layer                   | Technology              |
| ----------------------- | ----------------------- |
| Blockchain              | Stellar Soroban Testnet |
| Smart Contract          | Rust, Soroban SDK       |
| Zero-Knowledge Proof    | Circom 2, SnarkJS       |
| Commitment Hash         | Poseidon (circomlib)    |
| Backend                 | Fastify 5, TypeScript   |
| ORM                     | Prisma 6                |
| Database                | PostgreSQL 16           |
| Queue                   | Redis, BullMQ           |
| Blockchain Client       | @stellar/stellar-sdk    |
| Frontend                | Next.js 15, React 19    |
| Styling                 | Tailwind CSS, shadcn/ui |
| Package Manager         | pnpm                    |
| Infrastructure          | Docker Compose          |

---

## Getting Started

### Prerequisites

- Node.js 22 or later
- pnpm 9 or later
- Docker Desktop (for PostgreSQL and Redis)
- Rust toolchain with wasm32 target (for Soroban contract)
- soroban-cli (for contract deployment)
- Circom 2 (optional, for circuit compilation)
- Freighter browser extension (Stellar wallet, optional for wallet features)

### Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd veridaq

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Edit .env with your values (see .env.example for all variables)
```

### Database Setup

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Verify both services are healthy
docker compose ps

# Run migrations
pnpm db:migrate

# Seed the database with test data
pnpm db:seed
```

### Smart Contract Setup

```bash
# Build the Soroban contract
cd contracts/groth16-verifier
cargo build --target wasm32-unknown-unknown --release
soroban contract build

# Run contract tests
cargo test

# Deploy to Stellar testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/groth16_verifier.wasm \
  --source <your-identity> \
  --network testnet
```

### Circuit Setup

```bash
# Compile the Circom circuit
pnpm circuit:compile

# Run trusted setup (requires Powers of Tau file)
pnpm circuit:setup
```

---

## Running the Application

### Start the Backend

```bash
pnpm dev:backend
```

The backend starts on port 4000 by default. API documentation is available at http://localhost:4000/docs.

### Start the Frontend

```bash
pnpm dev:frontend
```

The frontend starts on port 3000.

### Default Login Credentials

| Portal      | URL                                                | Email                    | Password    |
| ----------- | -------------------------------------------------- | ------------------------ | ----------- |
| Institution | http://localhost:3000/institution/login | futminna@veridaq.xyz     | Inst@2026!  |
| Employer    | http://localhost:3000/employer/login    | firstbank@veridaq.xyz    | Emp@2026!   |
| Admin       | http://localhost:3000/admin/login       | admin@veridaq.xyz        | Admin@2026! |

---

## Testing

```bash
pnpm lint           # ESLint
pnpm typecheck      # TypeScript checks
pnpm test:backend   # Backend test suite (124 tests)
pnpm test:contracts # Rust contract tests (18 tests)
pnpm build:backend  # Production build check
pnpm build:frontend # Frontend build check
```

---

## Deployment

1. Deploy the Soroban contract to Stellar testnet or mainnet
2. Build and deploy the backend to your hosting provider
3. Build and deploy the frontend to Vercel or your hosting provider
4. Update .env with production values
5. Run database migrations on the production database

---

## License

MIT
