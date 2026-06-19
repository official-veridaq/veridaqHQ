# VERIDAQ

**Privacy-first academic credential verification. Zero-knowledge proofs on Stellar.**

VERIDAQ lets universities register student credentials as Poseidon hash commitments
on the Stellar network and lets employers verify specific academic claims through
Groth16 Zero-Knowledge Proofs. No student name, grade, matriculation number, or
personal attribute ever appears on the public blockchain in readable form.

---

## How it works

A university registrar uploads an Excel file of graduating students. The backend
computes a Poseidon hash commitment and a nullifier for each student record and
submits them to a Soroban smart contract in a single batch transaction. No raw
data leaves the backend.

When an employer wants to verify a candidate's qualifications, they submit the
candidate's matriculation number, institution, and the specific claim they want
confirmed (e.g. "minimum Upper Second Class"). The backend retrieves the private
credential data, generates a Groth16 ZKP proving the claim is true, then submits
the proof to the on-chain verifier. The result is VERIFIED or NOT VERIFIED.

Students receive one email when their credential is registered. They take no action.

---

## Quick start

```bash
git clone https://github.com/official-veridaq/veridaqHQ
cd veridaqHQ

# Start the full stack
docker compose up -d
```

That's it. The backend (port 4000), frontend (port 3000), PostgreSQL, and Redis
start automatically. The database is seeded with demo accounts.

Open http://localhost:3000.

### Demo credentials

| Portal      | Email                 | Password    |
| ----------- | --------------------- | ----------- |
| Admin       | admin@veridaq.xyz     | Admin@2026! |
| Institution | futminna@veridaq.xyz  | Inst@2026!  |
| Employer    | firstbank@veridaq.xyz | Emp@2026!   |

### Using the mock blockchain (no Stellar testnet needed)

By default, `.env` sets `USE_MOCK_BLOCKCHAIN=true`, which makes the backend return
success for all blockchain operations without connecting to Stellar. This lets you
run the full demo flow — batch upload, verification, etc. — without real XLM or
deployed contracts.

For production, set `USE_MOCK_BLOCKCHAIN=false` and deploy contracts to Stellar
testnet/mainnet.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js 15 frontend                  │
│           Institution │ Employer │ Admin portals          │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS / REST
┌──────────────────────────▼──────────────────────────────┐
│                   Fastify 5 backend                      │
│   Auth │ Batch upload │ Proof generation │ Admin API     │
│   Prisma 6 (PostgreSQL) │ BullMQ (Redis) │ Stellar SDK  │
└──────────────────────────┬──────────────────────────────┘
                           │ JSON-RPC (Soroban)
┌──────────────────────────▼──────────────────────────────┐
│                  Stellar Soroban                         │
│  InstitutionRegistry │ CredentialRegistry               │
│  RevocationRegistry  │ Groth16Verifier                  │
│  SubscriptionManager  │ PaymasterVault                  │
└─────────────────────────────────────────────────────────┘
```

---

## Tech stack

| Layer               | Technology                               |
| ------------------- | ---------------------------------------- |
| Blockchain          | Stellar, Soroban smart contracts         |
| Smart contracts     | Rust, Soroban SDK                        |
| ZKP circuit         | Circom 2.0.8, SnarkJS 0.7, Groth16       |
| Commitment hash     | Poseidon (circomlibjs)                   |
| Backend             | Node.js 22, Fastify 5, TypeScript 5.8    |
| Database            | PostgreSQL 16, Prisma 6                  |
| Queue               | Redis 7, BullMQ 5                        |
| Blockchain client   | @stellar/stellar-sdk                     |
| Frontend            | Next.js 15 App Router, React 19          |
| Styling             | Tailwind CSS 3.4, shadcn/ui              |
| Package manager     | pnpm 9 (single root package.json)        |
| Infrastructure      | Docker Compose                           |

---

## Project structure

```
veridaq/
  backend/       Fastify 5 API — routes, services, BullMQ workers, Prisma
  frontend/      Next.js 15 App Router — institution, employer, admin portals
  contracts/     Soroban smart contracts (Rust)
  circuits/      Circom 2 circuit + trusted setup artifacts
  docker-compose.yml  PostgreSQL 16 + Redis 7 + backend + frontend
  package.json   All npm dependencies for the entire monorepo
```

---

## Smart contracts

| Contract            | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| InstitutionRegistry | On-chain identity for registered universities            |
| CredentialRegistry  | Stores (commitment, nullifier) pairs in batches          |
| RevocationRegistry  | Append-only revocation list keyed by nullifier           |
| SubscriptionManager | Institution tier management (FREE / PAID)                |
| PaymasterVault      | Gas sponsorship for credential submissions               |
| Groth16Verifier     | Generated by SnarkJS from the Circom circuit             |

---

## ZKP circuit

The circuit at `circuits/credential.circom` proves that a given commitment was
computed from private inputs satisfying the claimed property, without revealing
the inputs themselves.

**Private inputs:** student name hash, matric number hash, CGPA, degree class,
course hash, graduation year, random blinding factor.

**Public inputs:** commitment, nullifier, claim type, claim threshold.

**Hash function:** Poseidon — designed for efficiency inside arithmetic circuits.
Keccak256 would make the circuit impractically large.

---

## Security

- **No personal data on-chain.** Commitments are Poseidon hashes with a random
  blinding factor. Computationally hiding — the raw input cannot be recovered.
- **Non-forgeability.** The Groth16 verifier checks mathematical soundness. The
  backend cannot fabricate a VERIFIED result without a valid witness.
- **Revocation.** Institutions can revoke credentials by nullifier. The verifier
  checks the revocation registry before accepting a proof.
- **JWT hygiene.** Access tokens in memory only. Refresh tokens in httpOnly
  cookies. Never stored in localStorage.
- **Input validation.** Every API endpoint validates its request body with Zod
  before touching the database or blockchain.

---

## Development

### Full simulation (API flow)

```bash
bash simulate-flow.sh
```

This script exercises the entire flow: admin login → institution upload →
employer verification. Requires the backend to be running.

### Individual backend tests

```bash
pnpm test:backend
pnpm test:contracts
pnpm lint
pnpm typecheck
```

---

## License

MIT — see `LICENSE` file.

> VERIDAQ is a production-grade credential verification platform. For production
> deployment, deploy your own Soroban contracts and obtain an independent security
> audit.
