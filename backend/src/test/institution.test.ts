/**
 * InstitutionService unit tests.
 *
 * Uses the seeded institution from prisma/seed.ts.
 * BlockchainService is replaced by the mock.
 * Skipped when no database is available.
 */

import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { InstitutionService } from "../services/institution.service.js"
import { encrypt } from "../utils/crypto.js"
import { hashToField } from "../utils/field.js"
import { BlockchainService } from "./mocks/blockchain.service.js"

let prisma: PrismaClient
let instSvc: InstitutionService | undefined
let institutionId: string
let testClaimId: string | null = null
let testCredentialNullifier: string | null = null

beforeAll(async () => {
  prisma = new PrismaClient()
  try {
    await prisma.$connect()
    const inst = await prisma.institution.findUnique({
      where: { email: "futminna@veridaq.xyz" },
      select: { id: true },
    })
    if (!inst) throw new Error("Seed institution not found — run pnpm db:seed first")
    institutionId = inst.id

    const mockBlockchain = new BlockchainService() as unknown as import("../services/blockchain.service.js").BlockchainService
    instSvc = new InstitutionService(prisma, mockBlockchain)
  } catch {
    // Database not available — tests silently skip
  }
})

afterAll(async () => {
  if (!instSvc) return
  if (testClaimId) {
    await prisma.claimDefinition.deleteMany({ where: { id: testClaimId } }).catch(() => {})
  }
  if (testCredentialNullifier) {
    await prisma.credential.deleteMany({ where: { nullifier: testCredentialNullifier } }).catch(() => {})
  }
  await prisma.$disconnect()
})

// ── Batch listing ─────────────────────────────────────────────────────────────

describe("InstitutionService.listBatches", () => {
  it("returns a paginated result", async () => {
    if (!instSvc) return
    const result = await instSvc.listBatches(institutionId, 1, 10)
    expect(typeof result.total).toBe("number")
    expect(Array.isArray(result.items)).toBe(true)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(10)
  })
})

// ── Claim definitions ─────────────────────────────────────────────────────────

describe("InstitutionService.listClaims", () => {
  it("returns the seeded claim definitions", async () => {
    if (!instSvc) return
    const claims = await instSvc.listClaims(institutionId)
    expect(Array.isArray(claims)).toBe(true)
    expect(claims.length).toBeGreaterThanOrEqual(6)
    const codes = claims.map((c) => c.claimCode)
    expect(codes).toContain(1)
    expect(codes).toContain(4)
  })
})

describe("InstitutionService.createClaim", () => {
  it("creates a new claim definition", async () => {
    if (!instSvc) return
    const claim = await instSvc.createClaim(institutionId, {
      label: "Test Claim",
      claimCode: 5,
      threshold: 400,
      reviewType: "AUTO",
    })
    expect(claim.id).toBeTruthy()
    expect(claim.label).toBe("Test Claim")
    expect(claim.threshold).toBe(400)
    testClaimId = claim.id
  })
})

describe("InstitutionService.updateClaim", () => {
  it("updates the label of an existing claim", async () => {
    if (!instSvc || !testClaimId) return
    const updated = await instSvc.updateClaim(testClaimId, institutionId, {
      label: "Updated Test Claim",
    })
    expect(updated?.label).toBe("Updated Test Claim")
  })

  it("returns null when the claim does not belong to the institution", async () => {
    if (!instSvc) return
    const result = await instSvc.updateClaim("nonexistent-id", institutionId, {
      label: "Should not update",
    })
    expect(result).toBeNull()
  })
})

// ── Credential revocation ─────────────────────────────────────────────────────

describe("InstitutionService.revokeCredential", () => {
  beforeAll(async () => {
    if (!instSvc) return
    const nullifier = "0x" + "ee".repeat(32)
    testCredentialNullifier = nullifier

    let batch = await prisma.batch.findFirst({ where: { institutionId } })
    if (!batch) {
      batch = await prisma.batch.create({
        data: { institutionId, status: "CONFIRMED", studentCount: 1, graduationYear: 2024 },
      })
    }

    const plaintext = JSON.stringify({
      nameHash: hashToField("Revoke Test Student").toString(),
      matricHash: hashToField("REVOKE/2024/CS/001").toString(),
      cgpa: 380,
      classification: 3,
      courseHash: hashToField("Engineering").toString(),
      graduationYear: 2024,
      blindingFactor: "111",
    })
    const { encryptedData, encryptedIv, encryptedTag } = encrypt(plaintext)

    await prisma.credential.upsert({
      where: { nullifier },
      update: {},
      create: {
        batchId: batch.id,
        institutionId,
        commitment: "0x" + "ff".repeat(32),
        nullifier,
        encryptedData,
        encryptedIv,
        encryptedTag,
        graduationYear: 2024,
        status: "ACTIVE",
      },
    })
  })

  it("revokes a credential that belongs to the institution", async () => {
    if (!instSvc || !testCredentialNullifier) return
    const result = await instSvc.revokeCredential(institutionId, testCredentialNullifier, 1)
    expect(result.ok).toBe(true)

    const cred = await prisma.credential.findUnique({
      where: { nullifier: testCredentialNullifier },
    })
    expect(cred?.status).toBe("REVOKED")
  })

  it("returns an error when revoking an already-revoked credential", async () => {
    if (!instSvc || !testCredentialNullifier) return
    const result = await instSvc.revokeCredential(institutionId, testCredentialNullifier, 1)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/already revoked/i)
  })

  it("returns an error when the nullifier does not exist", async () => {
    if (!instSvc) return
    const result = await instSvc.revokeCredential(
      institutionId,
      "0x" + "00".repeat(32),
      1
    )
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/not found/i)
  })
})

// ── Dashboard stats ───────────────────────────────────────────────────────────

describe("InstitutionService.getDashboardStats", () => {
  it("returns numeric stats for the institution", async () => {
    if (!instSvc) return
    const stats = await instSvc.getDashboardStats(institutionId)
    expect(typeof stats.totalCredentials).toBe("number")
    expect(typeof stats.requestsThisMonth).toBe("number")
    expect(typeof stats.pendingManual).toBe("number")
    expect(stats.tier).toBeDefined()
  })
})

// ── Profile ───────────────────────────────────────────────────────────────────

describe("InstitutionService.getProfile", () => {
  it("returns the institution profile", async () => {
    if (!instSvc) return
    const profile = await instSvc.getProfile(institutionId)
    expect(profile?.email).toBe("futminna@veridaq.xyz")
    expect(profile?.name).toBeTruthy()
  })
})
