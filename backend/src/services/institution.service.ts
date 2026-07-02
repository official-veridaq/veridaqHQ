import { PrismaClient } from "@prisma/client"
import pino from "pino"
import { decrypt } from "../utils/crypto.js"
import { hexToField } from "../utils/field.js"
import { BlockchainService } from "./blockchain.service.js"

const log = pino({ name: "institution-service" })

export class InstitutionService {
  private blockchainSvc: BlockchainService

  constructor(
    private prisma: PrismaClient,
    blockchainSvc?: BlockchainService
  ) {
    this.blockchainSvc = blockchainSvc ?? new BlockchainService()
  }
  async deleteBatch(batchId: string, institutionId: string) {
    const batch = await this.prisma.batch.findFirst({
      where: { id: batchId, institutionId },
    })
    if (!batch) return null
    if (batch.status !== "FAILED") return { error: "Only failed batches can be dismissed" as const }

    await this.prisma.$transaction([
      this.prisma.credential.deleteMany({ where: { batchId } }),
      this.prisma.batch.delete({ where: { id: batchId } }),
    ])

    return { deleted: true }
  }

  async listBatches(institutionId: string, page: number, limit: number) {
    const skip = (page - 1) * limit
    const total = await this.prisma.batch.count({ where: { institutionId } })
    const items = await this.prisma.batch.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        status: true,
        txHash: true,
        studentCount: true,
        graduationYear: true,
        createdAt: true,
        confirmedAt: true,
        errorReport: true,
      },
    })
    return { total, page, limit, totalPages: Math.ceil(total / limit), items }
  }

  async getBatch(batchId: string, institutionId: string) {
    return this.prisma.batch.findFirst({
      where: { id: batchId, institutionId },
      include: {
        credentials: {
          select: {
            id: true,
            commitment: true,
            nullifier: true,
            status: true,
            graduationYear: true,
            createdAt: true,
          },
        },
      },
    })
  }

  async createClaim(
    institutionId: string,
    data: {
      label: string
      claimCode: number
      threshold: number
      reviewType: string
      active?: boolean | undefined
      description?: string | null | undefined
    }
  ) {
    return this.prisma.claimDefinition.create({
      data: {
        institutionId,
        label: data.label,
        claimCode: data.claimCode,
        threshold: data.threshold,
        reviewType: data.reviewType as "AUTO" | "MANUAL",
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    })
  }

  async listClaims(institutionId: string) {
    return this.prisma.claimDefinition.findMany({
      where: { institutionId, active: true },
      orderBy: { claimCode: "asc" },
    })
  }

  async deleteClaim(claimId: string, institutionId: string) {
    const deleted = await this.prisma.claimDefinition.deleteMany({
      where: { id: claimId, institutionId },
    })
    return deleted.count > 0
  }

  async updateClaim(
    claimId: string,
    institutionId: string,
    data: Partial<{
      label: string
      claimCode: number
      threshold: number
      reviewType: string
      active: boolean
      description: string
    }>
  ) {
    const updateData: {
      label?: string
      claimCode?: number
      threshold?: number
      reviewType?: "AUTO" | "MANUAL"
      active?: boolean
      description?: string
    } = {}

    if (data.label) updateData.label = data.label
    if (typeof data.claimCode === "number") updateData.claimCode = data.claimCode
    if (typeof data.threshold === "number") updateData.threshold = data.threshold
    if (data.reviewType) updateData.reviewType = data.reviewType as "AUTO" | "MANUAL"
    if (typeof data.active === "boolean") updateData.active = data.active
    if (data.description) updateData.description = data.description

    const updated = await this.prisma.claimDefinition.updateMany({
      where: { id: claimId, institutionId },
      data: updateData,
    })

    if (updated.count === 0) {
      return null
    }

    return this.prisma.claimDefinition.findUnique({
      where: { id: claimId },
    })
  }

  async revokeCredential(institutionId: string, nullifier: string, reasonCode: number) {
    const credential = await this.prisma.credential.findUnique({
      where: { nullifier },
    })

    if (!credential) return { ok: false, error: "Credential not found" }
    if (credential.institutionId !== institutionId) {
      return { ok: false, error: "This credential does not belong to your institution" }
    }
    if (credential.status === "REVOKED") {
      return { ok: false, error: "Credential is already revoked" }
    }

    try {
      await this.blockchainSvc.revokeCredential(nullifier, reasonCode)
    } catch (err) {
      log.error({ err, nullifier }, "Failed to revoke credential on-chain")
      return { ok: false, error: "On-chain revocation failed" }
    }

    await this.prisma.credential.update({
      where: { id: credential.id },
      data: { status: "REVOKED" },
    })

    return { ok: true }
  }

  async listVerifications(institutionId: string, status: string | undefined, page: number) {
    const limit = 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { institutionId }
    if (status) where["status"] = status

    const [total, items] = await this.prisma.$transaction([
      this.prisma.verificationRequest.count({ where }),
      this.prisma.verificationRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          result: true,
          claimType: true,
          matricNumber: true,
          createdAt: true,
          completedAt: true,
          employer: { select: { name: true } },
        },
      }),
    ])

    return { total, page, limit, items }
  }

  async approveVerification(requestId: string, institutionId: string) {
    const request = await this.prisma.verificationRequest.findFirst({
      where: {
        id: requestId,
        institutionId,
        status: "AWAITING_INSTITUTION",
      },
      select: {
        id: true,
        employerId: true,
        matricNumber: true,
        claimType: true,
        threshold: true,
        institution: {
          select: {
            onChainId: true,
            publicKey: true,
            institutionKeyEncrypted: true,
            institutionKeyIv: true,
            institutionKeyTag: true,
          },
        },
        credential: {
          select: {
            id: true,
            commitment: true,
            nullifier: true,
            encryptedData: true,
            encryptedIv: true,
            encryptedTag: true,
          },
        },
      },
    })

    if (!request) {
      return { ok: false, error: "Verification request not found" }
    }

    if (!request.credential) {
      return { ok: false, error: "Verification request has no linked credential" }
    }

    await this.prisma.verificationRequest.update({
      where: { id: request.id },
      data: { status: "PROCESSING" },
    })

    if (
      !request.institution.institutionKeyEncrypted ||
      !request.institution.institutionKeyIv ||
      !request.institution.institutionKeyTag
    ) {
      return { ok: false, error: "Institution key missing" }
    }

    const institutionKeyHex = decrypt(
      request.institution.institutionKeyEncrypted,
      request.institution.institutionKeyIv,
      request.institution.institutionKeyTag
    )
    const institutionKey = hexToField(institutionKeyHex).toString()

    const { VerificationService: VS } = await import("./verification.service.js")
    const verifySvc = new VS(this.prisma, this.blockchainSvc)

    void verifySvc
      .runProofGeneration(request.id, request.credential, institutionKey, {
        employerId: request.employerId,
        institutionOnChainId: request.institution.onChainId,
        matricNumber: request.matricNumber,
        claimType: request.claimType,
        threshold: request.threshold,
      })
      .catch((error: unknown) => {
        log.error({ error, requestId }, "Manual verification approval proof generation failed")
      })

    return { ok: true }
  }

  async declineVerification(requestId: string, institutionId: string) {
    const updated = await this.prisma.verificationRequest.updateMany({
      where: {
        id: requestId,
        institutionId,
        status: "AWAITING_INSTITUTION",
      },
      data: {
        status: "COMPLETED",
        result: "RECORD_NOT_FOUND",
        completedAt: new Date(),
      },
    })

    if (updated.count === 0) {
      return { ok: false, error: "Verification request not found" }
    }

    return { ok: true }
  }

  async getDashboardStats(institutionId: string) {
    const totalCredentials = await this.prisma.credential.count({
      where: { batch: { institutionId } },
    })

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const requestsThisMonth = await this.prisma.verificationRequest
      .count({
        where: {
          institutionId,
          createdAt: { gte: startOfMonth },
        },
      })
      .catch(() => 0)

    const pendingManual = await this.prisma.verificationRequest
      .count({
        where: {
          status: "AWAITING_INSTITUTION",
          institutionId,
        },
      })
      .catch(() => 0)

    const profile = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: {
        tier: true,
        kycApproved: true,
        name: true,
        createdAt: true,
      },
    })

    const lastBatch = await this.prisma.batch.findFirst({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      select: { status: true, createdAt: true },
    })

    return {
      totalCredentials,
      requestsThisMonth,
      pendingManual,
      promoActive: profile?.tier === "FREE",
      tier: profile?.tier,
      kycApproved: profile?.kycApproved,
      name: profile?.name,
      createdAt: profile?.createdAt,
      lastBatch,
    }
  }

  async getProfile(institutionId: string) {
    return this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: {
        id: true,
        name: true,
        email: true,
        tier: true,
        kycApproved: true,
        active: true,
        adminWallet: true,
        createdAt: true,
        _count: { select: { batches: true } },
      },
    })
  }

  async getBilling(institutionId: string) {
    const inst = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true, onChainId: true, tier: true },
    })
    if (!inst) return null

    return {
      tier: inst.tier,
    }
  }
}
