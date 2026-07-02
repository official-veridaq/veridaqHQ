/**
 * Comprehensive simulation tests covering all platform workflows.
 *
 * Tests follow the full user journey for Institution, Employer, and Admin
 * portals. BlockchainService and ProofService are mocked — no real RPC or
 * circuit files are needed. Runs against the seeded database from seed.ts.
 *
 * Run: pnpm test:backend
 */

import { PrismaClient, BatchStatus } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { AdminService } from "../services/admin.service.js"
import { AuthService } from "../services/auth.service.js"
import { InstitutionService } from "../services/institution.service.js"
import { VerificationService } from "../services/verification.service.js"
import { PaymentService } from "../services/payment.service.js"
import { encrypt } from "../utils/crypto.js"
import { hashToField } from "../utils/field.js"
import { BlockchainService } from "./mocks/blockchain.service.js"

// ── Mock ProofService ──────────────────────────────────────────────────────────

vi.mock("../services/proof.service.js", () => ({
  ProofService: class {
    async generateProof() {
      return {
        proof: {
          pi_a: ["1", "2"],
          pi_b: [["3", "4"], ["5", "6"]],
          pi_c: ["7", "8"],
        },
        publicSignals: ["1", "2", "3", "4"],
      }
    }
    async verifyProofLocally() { return true }
  },
}))

// ── Test data ──────────────────────────────────────────────────────────────────

let prisma: PrismaClient
let authSvc: AuthService
let adminSvc: AdminService
let instSvc: InstitutionService
let verifySvc: VerificationService
let paymentSvc: PaymentService

let institutionId: string
let institutionOnChainId: string
let employerId: string
let adminId: string

// ── Setup / Teardown ───────────────────────────────────────────────────────────

beforeAll(async () => {
  prisma = new PrismaClient()
  try {
    await prisma.$connect()
  } catch {
    return
  }

  const mockBlockchain = new BlockchainService() as unknown as import("../services/blockchain.service.js").BlockchainService

  authSvc = new AuthService(prisma)
  adminSvc = new AdminService(prisma, mockBlockchain)
  instSvc = new InstitutionService(prisma, mockBlockchain)
  verifySvc = new VerificationService(prisma, mockBlockchain)
  paymentSvc = new PaymentService(prisma, mockBlockchain)

  // Load seeded entities
  const inst = await prisma.institution.findUnique({ where: { email: "futminna@veridaq.xyz" } })
  const emp = await prisma.employer.findUnique({ where: { email: "firstbank@veridaq.xyz" } })
  const adm = await prisma.admin.findFirst()

  if (!inst || !emp || !adm) {
    throw new Error("Seed data not found — run pnpm db:seed first")
  }

  institutionId = inst.id
  institutionOnChainId = inst.onChainId
  employerId = emp.id
  adminId = adm.id
})

afterAll(async () => {
  await prisma?.$disconnect()
})

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AUTH FLOW
// ═══════════════════════════════════════════════════════════════════════════════

describe("Auth Flow", () => {
  describe("Institution login", () => {
    it("returns tokens with correct role for valid credentials", async () => {
      const result = await authSvc.loginInstitution("futminna@veridaq.xyz", "Inst@2026!")
      expect(result).not.toBeNull()
      expect(result!.accessToken).toBeTruthy()
      expect(result!.refreshToken).toBeTruthy()
      expect(result!.user.role).toBe("INSTITUTION")
      expect(result!.user.email).toBe("futminna@veridaq.xyz")
    })

    it("rejects wrong password with null", async () => {
      const result = await authSvc.loginInstitution("futminna@veridaq.xyz", "wrongpassword")
      expect(result).toBeNull()
    })

    it("rejects unknown email with null", async () => {
      const result = await authSvc.loginInstitution("unknown@test.com", "Inst@2026!")
      expect(result).toBeNull()
    })
  })

  describe("Employer login", () => {
    it("returns tokens with correct role for valid credentials", async () => {
      const result = await authSvc.loginEmployer("firstbank@veridaq.xyz", "Emp@2026!")
      expect(result).not.toBeNull()
      expect(result!.user.role).toBe("EMPLOYER")
      expect(result!.user.email).toBe("firstbank@veridaq.xyz")
    })

    it("rejects wrong password with null", async () => {
      const result = await authSvc.loginEmployer("firstbank@veridaq.xyz", "wrongpassword")
      expect(result).toBeNull()
    })
  })

  describe("Admin login", () => {
    it("returns tokens with correct role for valid credentials", async () => {
      const result = await authSvc.loginAdmin("admin@veridaq.xyz", "Admin@2026!")
      expect(result).not.toBeNull()
      expect(result!.user.role).toBe("ADMIN")
      expect(result!.user.email).toBe("admin@veridaq.xyz")
    })

    it("rejects wrong password with null", async () => {
      const result = await authSvc.loginAdmin("admin@veridaq.xyz", "wrongpassword")
      expect(result).toBeNull()
    })
  })

  describe("Institution registration", () => {
    it("registers a new institution and returns tokens", async () => {
      const result = await authSvc.registerInstitution({
        name: "Test University",
        email: "testuni@veridaq.xyz",
        password: "TestUni@2026!",
        publicKey: "GABC12345TESTWALLET",
      })
      expect(result).not.toBeNull()
      expect(result!.id).toBeTruthy()
      expect(result!.email).toBe("testuni@veridaq.xyz")
      expect(result!.kycApproved).toBe(false)

      // Cleanup
      await prisma.institution.delete({ where: { email: "testuni@veridaq.xyz" } }).catch(() => {})
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. INSTITUTION FLOW
// ═══════════════════════════════════════════════════════════════════════════════

describe("Institution Flow", () => {
  describe("Profile", () => {
    it("returns the institution profile with all fields", async () => {
      const profile = await instSvc.getProfile(institutionId)
      expect(profile).not.toBeNull()
      expect(profile!.name).toBeTruthy()
      expect(profile!.email).toBe("futminna@veridaq.xyz")
      expect(typeof profile!.tier).toBe("string")
      expect(typeof profile!.kycApproved).toBe("boolean")
    })

    it("returns null for a non-existent institution ID", async () => {
      const profile = await instSvc.getProfile("nonexistent-id")
      expect(profile).toBeNull()
    })
  })

  describe("Dashboard stats", () => {
    it("returns all required dashboard statistics", async () => {
      const stats = await instSvc.getDashboardStats(institutionId)
      expect(typeof stats.totalCredentials).toBe("number")
      expect(typeof stats.requestsThisMonth).toBe("number")
      expect(typeof stats.pendingManual).toBe("number")
      expect(stats.tier).toBeDefined()
      expect(stats.name).toBeTruthy()
    })
  })

  describe("Batch listing", () => {
    it("returns paginated batches with correct structure", async () => {
      const result = await instSvc.listBatches(institutionId, 1, 10)
      expect(typeof result.total).toBe("number")
      expect(Array.isArray(result.items)).toBe(true)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
      expect(result.totalPages).toBe(Math.ceil(result.total / 10))

      if (result.items.length > 0) {
        const batch = result.items[0]!
        expect(batch.id).toBeTruthy()
        expect(Object.values(BatchStatus as unknown as Record<string, string>)).toContain(batch.status)
        expect(typeof batch.studentCount).toBe("number")
      }
    })

    it("accepts custom page sizes", async () => {
      const result = await instSvc.listBatches(institutionId, 2, 5)
      expect(result.page).toBe(2)
      expect(result.limit).toBe(5)
    })
  })

  describe("Claims management", () => {
    let claimId: string

    it("lists the seeded claim definitions", async () => {
      const claims = await instSvc.listClaims(institutionId)
      expect(claims.length).toBeGreaterThanOrEqual(6)
      const codes = claims.map((c) => c.claimCode)
      expect(codes).toContain(1)
      expect(codes).toContain(2)
      expect(codes).toContain(3)
    })

    it("creates a new claim definition", async () => {
      const claim = await instSvc.createClaim(institutionId, {
        label: "Simulation Test Claim",
        claimCode: 99,
        threshold: 500,
        reviewType: "AUTO",
      })
      expect(claim.id).toBeTruthy()
      expect(claim.label).toBe("Simulation Test Claim")
      expect(claim.claimCode).toBe(99)
      expect(claim.reviewType).toBe("AUTO")
      claimId = claim.id
    })

    it("updates the created claim", async () => {
      const updated = await instSvc.updateClaim(claimId, institutionId, {
        label: "Updated Simulation Claim",
        description: "Updated description",
      })
      expect(updated).not.toBeNull()
      expect(updated!.label).toBe("Updated Simulation Claim")
      expect(updated!.description).toBe("Updated description")
      expect(updated!.threshold).toBe(500) // unchanged
    })

    it("refuses to update a claim from another institution", async () => {
      const result = await instSvc.updateClaim(claimId, "other-institution-id", {
        label: "Should not update",
      })
      expect(result).toBeNull()
    })

    it("deletes the created claim", async () => {
      await instSvc.deleteClaim(claimId, institutionId)
      const claims = await instSvc.listClaims(institutionId)
      expect(claims.find((c) => c.id === claimId)).toBeUndefined()
    })
  })

  describe("Credential lifecycle", () => {
    let batchId: string
    let credentialNullifier: string

    it("prepares a test batch and credential", async () => {
      const batch = await prisma.batch.create({
        data: {
          institutionId,
          status: "PENDING",
          studentCount: 1,
          graduationYear: 2025,
        },
      })
      batchId = batch.id

      await prisma.batch.update({
        where: { id: batchId },
        data: { status: "CONFIRMED" },
      })
    })

    it("creates an encrypted credential in the batch", async () => {
      const nullifier = "0x" + "a1b2".repeat(16)
      credentialNullifier = nullifier
      const commitment = "0x" + "c3d4".repeat(16)

      const plaintext = JSON.stringify({
        nameHash: hashToField("Student Name").toString(),
        matricHash: hashToField("SIM/2025/CS/001").toString(),
        cgpa: 450,
        classification: 4,
        courseHash: hashToField("Computer Science").toString(),
        graduationYear: 2025,
        blindingFactor: "999999",
      })

      const { encryptedData, encryptedIv, encryptedTag } = encrypt(plaintext)

      await prisma.credential.create({
        data: {
          batchId,
          institutionId,
          commitment,
          nullifier,
          encryptedData,
          encryptedIv,
          encryptedTag,
          graduationYear: 2025,
          status: "ACTIVE",
        },
      })
    })

    it("revokes the credential via the service", async () => {
      const result = await instSvc.revokeCredential(institutionId, credentialNullifier, 1)
      expect(result.ok).toBe(true)

      const cred = await prisma.credential.findUnique({ where: { nullifier: credentialNullifier } })
      expect(cred?.status).toBe("REVOKED")
    })

    it("returns error when revoking an already revoked credential", async () => {
      const result = await instSvc.revokeCredential(institutionId, credentialNullifier, 1)
      expect(result.ok).toBe(false)
      expect(result.error).toMatch(/already revoked/i)
    })

    it("returns error when revoking a nonexistent nullifier", async () => {
      const result = await instSvc.revokeCredential(institutionId, "0x" + "ff".repeat(32), 1)
      expect(result.ok).toBe(false)
      expect(result.error).toMatch(/not found/i)
    })

    it("cleans up test data", async () => {
      await prisma.credential.deleteMany({ where: { nullifier: credentialNullifier } }).catch(() => {})
      await prisma.batch.deleteMany({ where: { id: batchId } }).catch(() => {})
    })
  })

  describe("Verification requests for institution", () => {
    it("returns pending manual reviews", async () => {
      const stats = await instSvc.getDashboardStats(institutionId)
      expect(typeof stats.pendingManual).toBe("number")
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. EMPLOYER FLOW
// ═══════════════════════════════════════════════════════════════════════════════

describe("Employer Flow", () => {
  describe("Active institutions", () => {
    it("returns seeded institution with claim definitions", async () => {
      const insts = await verifySvc.getActiveInstitutions()
      expect(Array.isArray(insts)).toBe(true)
      expect(insts.length).toBeGreaterThanOrEqual(1)

      const futminna = insts.find((i) => i.id === institutionId)
      expect(futminna).toBeDefined()
      expect(futminna!.claims.length).toBeGreaterThanOrEqual(6)
      expect(futminna!.name).toBeTruthy()
    })
  })

  describe("Verification request creation", () => {
    let credentialNullifier: string

    it("creates a test credential for verification", async () => {
      const nullifier = "0x" + "e5f6".repeat(16)
      credentialNullifier = nullifier
      const commitment = "0x" + "7a8b".repeat(16)

      const plaintext = JSON.stringify({
        nameHash: hashToField("Employer Test Student").toString(),
        matricHash: hashToField("EMP/2024/CS/001").toString(),
        cgpa: 400,
        classification: 3,
        courseHash: hashToField("Engineering").toString(),
        graduationYear: 2024,
        blindingFactor: "888888",
      })

      const { encryptedData, encryptedIv, encryptedTag } = encrypt(plaintext)

      let batch = await prisma.batch.findFirst({ where: { institutionId, status: "CONFIRMED" } })
      if (!batch) {
        batch = await prisma.batch.create({
          data: { institutionId, status: "CONFIRMED", studentCount: 1, graduationYear: 2024 },
        })
      }

      await prisma.credential.upsert({
        where: { nullifier },
        update: {},
        create: {
          batchId: batch.id,
          institutionId,
          commitment,
          nullifier,
          encryptedData,
          encryptedIv,
          encryptedTag,
          graduationYear: 2024,
          status: "ACTIVE",
        },
      })
    })

    it("creates a verification request that resolves to PROCESSING", async () => {
      const result = await verifySvc.createRequest({
        employerId,
        institutionOnChainId,
        matricNumber: "EMP/2024/CS/001",
        claimType: 1,
        threshold: 0,
      })
      expect("requestId" in result).toBe(true)
      if ("requestId" in result) {
        expect(result.requestId).toBeTruthy()
        expect(["PROCESSING", "AWAITING_INSTITUTION", "VERIFIED", "NOT_VERIFIED"]).toContain(result.status)
        await prisma.verificationRequest.delete({ where: { id: result.requestId } }).catch(() => {})
      }
    })

    it("returns NOT_FOUND for unknown institution", async () => {
      const result = await verifySvc.createRequest({
        employerId,
        institutionOnChainId: "0x" + "0".repeat(64),
        matricNumber: "EMP/2024/CS/001",
        claimType: 1,
        threshold: 0,
      })
      expect(result.error).toBe("NOT_FOUND")
    })

    it("returns NOT_FOUND for unknown matric number", async () => {
      const result = await verifySvc.createRequest({
        employerId,
        institutionOnChainId,
        matricNumber: "DOESNOTEXIST/9999/XX/999",
        claimType: 1,
        threshold: 0,
      })
      expect(result.error).toBe("NOT_FOUND")
    })

    it("returns REVOKED for a revoked credential", async () => {
      await prisma.credential.update({
        where: { nullifier: credentialNullifier },
        data: { status: "REVOKED" },
      })

      const result = await verifySvc.createRequest({
        employerId,
        institutionOnChainId,
        matricNumber: "EMP/2024/CS/001",
        claimType: 1,
        threshold: 0,
      })
      expect(result.error).toBe("REVOKED")

      await prisma.credential.update({
        where: { nullifier: credentialNullifier },
        data: { status: "ACTIVE" },
      })
    })

    it("cleans up the test credential", async () => {
      await prisma.credential.deleteMany({ where: { nullifier: credentialNullifier } }).catch(() => {})
    })
  })

  describe("Verification history", () => {
    it("returns paginated verification history for the employer", async () => {
      const history = await verifySvc.getHistory(employerId, 1, 10)
      expect(typeof history.total).toBe("number")
      expect(Array.isArray(history.items)).toBe(true)
      expect(history.page).toBe(1)
      expect(history.limit).toBe(10)
    })

    it("supports pagination", async () => {
      const page1 = await verifySvc.getHistory(employerId, 1, 5)
      const page2 = await verifySvc.getHistory(employerId, 2, 5)
      expect(page1.items.length).toBeLessThanOrEqual(5)
      expect(page2.items.length).toBeLessThanOrEqual(5)
    })

    it("returns empty result for employer with no history", async () => {
      const result = await verifySvc.getHistory("no-history-employer-id", 1, 10)
      expect(Array.isArray(result.items)).toBe(true)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ADMIN FLOW
// ═══════════════════════════════════════════════════════════════════════════════

describe("Admin Flow", () => {
  describe("Institution management", () => {
    it("lists institutions with pagination", async () => {
      const result = await adminSvc.listInstitutions(1)
      expect(typeof result.total).toBe("number")
      expect(Array.isArray(result.items)).toBe(true)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)

      if (result.items.length > 0) {
        const inst = result.items[0]!
        expect(inst.name).toBeTruthy()
        expect(typeof inst.kycApproved).toBe("boolean")
        expect(typeof inst.tier).toBe("string")
      }
    })

    it("searches institutions by name or email", async () => {
      const result = await adminSvc.listInstitutions(1, "futminna")
      expect(result.total).toBeGreaterThanOrEqual(1)
      expect(result.items[0]!.email).toBe("futminna@veridaq.xyz")
    })

    it("approves an institution KYC", async () => {
      const result = await adminSvc.approveInstitution(institutionId, adminId)
      expect(result).not.toBeNull()

      const inst = await prisma.institution.findUnique({ where: { id: institutionId } })
      expect(inst?.kycApproved).toBe(true)
    })

    it("deactivates an institution", async () => {
      const result = await adminSvc.deactivateInstitution(institutionId, adminId, "Testing deactivation")
      expect(result).not.toBeNull()

      const inst = await prisma.institution.findUnique({ where: { id: institutionId } })
      expect(inst?.active).toBe(false)
      expect(inst?.deactivationReason).toBe("Testing deactivation")

      // Reactivate for subsequent tests
      await prisma.institution.update({
        where: { id: institutionId },
        data: { active: true, deactivationReason: null },
      })
    })
  })

  describe("Employer management", () => {
    it("lists employers with pagination", async () => {
      const result = await adminSvc.listEmployers(1)
      expect(typeof result.total).toBe("number")
      expect(Array.isArray(result.items)).toBe(true)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it("returns employer profile by ID", async () => {
      const emp = await adminSvc.getEmployerProfile(employerId)
      expect(emp).not.toBeNull()
      expect(emp?.email).toBe("firstbank@veridaq.xyz")
    })
  })

  describe("Platform stats", () => {
    it("returns numeric platform statistics", async () => {
      const stats = await adminSvc.getStats()
      expect(typeof stats.institutions).toBe("number")
      expect(typeof stats.employers).toBe("number")
      expect(typeof stats.confirmedBatches).toBe("number")
      expect(typeof stats.successfulVerifications).toBe("number")
      expect(typeof stats.totalCredentials).toBe("number")
      expect(typeof stats.revokedCredentials).toBe("number")
    })
  })

  describe("Audit log", () => {
    it("returns paginated audit log entries", async () => {
      const logs = await adminSvc.getAuditLog(1, 20)
      expect(typeof logs.total).toBe("number")
      expect(Array.isArray(logs.items)).toBe(true)
      expect(logs.page).toBe(1)
      expect(logs.limit).toBe(20)

      if (logs.items.length > 0) {
        expect(logs.items[0]!.action).toBeTruthy()
      }
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PAYMENT FLOW
// ═══════════════════════════════════════════════════════════════════════════════

describe("Payment Flow", () => {
  describe("Payment creation", () => {
    it("creates a pending institution funding payment", async () => {
      const payment = await paymentSvc.createPayment({
        type: "INSTITUTION_FUNDING",
        method: "FIAT",
        amountWei: "5000",
        amountFiat: "50.00",
        fiatCurrency: "USD",
        payerId: institutionId,
        payerRole: "INSTITUTION",
        description: "Test deposit $50",
      })
      expect(payment.id).toBeTruthy()
      expect(payment.referenceId).toBeTruthy()
      expect(payment.status).toBe("PENDING")
      expect(payment.amountWei).toBe("5000")
      await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {})
    })

    it("creates an institution upgrade payment", async () => {
      const payment = await paymentSvc.createPayment({
        type: "INSTITUTION_UPGRADE",
        method: "CRYPTO",
        amountWei: "100000",
        payerId: institutionId,
        payerRole: "INSTITUTION",
      })
      expect(payment.type).toBe("INSTITUTION_UPGRADE")
      expect(payment.status).toBe("PENDING")
      await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {})
    })

    it("creates an employer topup payment", async () => {
      const payment = await paymentSvc.createPayment({
        type: "EMPLOYER_TOPUP",
        method: "FIAT",
        amountWei: "2500",
        payerId: employerId,
        payerRole: "EMPLOYER",
      })
      expect(payment.type).toBe("EMPLOYER_TOPUP")
      expect(payment.status).toBe("PENDING")
      await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {})
    })
  })

  describe("Payment lifecycle", () => {
    let paymentId: string
    let referenceId: string

    it("completes a fiat payment and applies it", async () => {
      const payment = await paymentSvc.createPayment({
        type: "INSTITUTION_FUNDING",
        method: "FIAT",
        amountWei: "50000",
        amountFiat: "500.00",
        fiatCurrency: "USD",
        payerId: institutionId,
        payerRole: "INSTITUTION",
      })
      paymentId = payment.id
      referenceId = payment.referenceId

      const result = await paymentSvc.completeFiatPayment(
        referenceId,
        "crossmint",
        "session-123",
        "500.00",
        "USD"
      )
      expect("completed" in result).toBe(true)
      if ("completed" in result) {
        expect(result.completed).toBe(true)
      }

      const updated = await prisma.payment.findUnique({ where: { id: paymentId } })
      expect(updated?.status).toBe("COMPLETED")
      await prisma.payment.delete({ where: { id: paymentId } }).catch(() => {})
    })

    it("fails an already completed payment gracefully", async () => {
      const payment = await paymentSvc.createPayment({
        type: "INSTITUTION_FUNDING",
        method: "FIAT",
        amountWei: "1000",
        payerId: institutionId,
        payerRole: "INSTITUTION",
      })
      paymentId = payment.id
      referenceId = payment.referenceId

      await paymentSvc.completeFiatPayment(referenceId, "test", "s1", "10.00", "USD")
      const result = await paymentSvc.completeFiatPayment(referenceId, "test", "s1", "10.00", "USD")
      expect("error" in result).toBe(true)
      if ("error" in result) {
        expect(result.error).toBe("ALREADY_PROCESSED")
      }

      await prisma.payment.delete({ where: { id: paymentId } }).catch(() => {})
    })
  })

  describe("Payment listing", () => {
    it("lists payments for an institution", async () => {
      const result = await paymentSvc.listPayments({ payerId: institutionId, payerRole: "INSTITUTION" })
      expect(typeof result.total).toBe("number")
      expect(Array.isArray(result.items)).toBe(true)
    })

    it("lists payments for an employer", async () => {
      const result = await paymentSvc.listPayments({ payerId: employerId, payerRole: "EMPLOYER" })
      expect(typeof result.total).toBe("number")
      expect(Array.isArray(result.items)).toBe(true)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. EDGE CASES & ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases & Error Handling", () => {
  describe("Empty/missing data", () => {
    it("returns empty batch list for institution with no batches", async () => {
      const result = await instSvc.listBatches("nonexistent-institution-id", 1, 10)
      expect(result.total).toBe(0)
      expect(result.items).toEqual([])
    })

    it("returns empty payment list for unknown payer", async () => {
      const result = await paymentSvc.listPayments({ payerId: "unknown-payer", payerRole: "INSTITUTION" })
      expect(result.total).toBe(0)
    })

    it("handles non-existent employer profile lookup", async () => {
      const emp = await adminSvc.getEmployerProfile("nonexistent-id")
      expect(emp).toBeNull()
    })
  })

  describe("Authentication edge cases", () => {
    it("rejects empty password", async () => {
      const result = await authSvc.loginInstitution("futminna@veridaq.xyz", "")
      expect(result).toBeNull()
    })

    it("rejects wrong email format", async () => {
      const result = await authSvc.loginAdmin("not-an-email", "Admin@2026!")
      expect(result).toBeNull()
    })
  })

  describe("Blockchain service mock reliability", () => {
    it("mock always returns true for verifyProof", async () => {
      const mock = new BlockchainService()
      const result = await mock.verifyProof(
        [1n, 2n],
        [[3n, 4n], [5n, 6n]],
        [7n, 8n],
        [1n, 2n, 3n, 4n]
      )
      expect(result).toBe(true)
    })

    it("mock always returns mock-tx-hash for registerBatch", async () => {
      const mock = new BlockchainService()
      const result = await mock.registerBatch("inst-1", ["c1"], ["n1"], 2024, 1, "tx-ref")
      expect(result.txHash).toBe("mock-tx-hash")
    })

    it("mock getBalance returns 10000 XLM in stroops", async () => {
      const mock = new BlockchainService()
      const balance = await mock.getBalance("any-address")
      expect(balance).toBe(100_000_000_000n)
    })
  })
})
