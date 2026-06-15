import { PrismaClient } from "@prisma/client"
import pino from "pino"
import { BlockchainService } from "./blockchain.service.js"
import { EmailService } from "./email.service.js"

const log = pino({ name: "admin-service" })

export class AdminService {
  private emailService: EmailService
  private blockchainSvc: BlockchainService

  constructor(
    private prisma: PrismaClient,
    blockchainSvc?: BlockchainService
  ) {
    this.emailService = new EmailService()
    this.blockchainSvc = blockchainSvc ?? new BlockchainService()
  }

  async listInstitutions(page: number, search?: string) {
    const limit = 20
    const skip = (page - 1) * limit

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}

    const [total, items] = await this.prisma.$transaction([
      this.prisma.institution.count({ where }),
      this.prisma.institution.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          tier: true,
          kycApproved: true,
          active: true,
          createdAt: true,
          deactivationReason: true,
          _count: { select: { batches: true } },
        },
      }),
    ])

    return { total, page, limit, items }
  }

  async approveInstitution(institutionId: string, adminId: string) {
    const inst = await this.prisma.institution.findUnique({ where: { id: institutionId } })
    if (!inst) return null

    try {
      const alreadyRegistered = await this.blockchainSvc.isInstitutionRegistered(inst.onChainId)
      if (!alreadyRegistered) {
        await this.blockchainSvc.registerInstitution(inst.onChainId, inst.name, inst.adminWallet)
      }
    } catch (err) {
      log.error({ err, institutionId }, "Failed to register institution on-chain")
      return null
    }

    await this.prisma.$transaction([
      this.prisma.institution.update({
        where: { id: institutionId },
        data: { kycApproved: true },
      }),
      this.prisma.auditLog.create({
        data: {
          action: "KYC_APPROVED",
          details: { role: "institution", orgName: inst.name },
          adminId,
          institutionId: inst.id,
        },
      }),
    ])

    await this.emailService.sendKycApproval({
      to: inst.email,
      orgName: inst.name,
      role: "institution",
    })

    return true
  }

  async setInstitutionTier(institutionId: string, tier: "FREE" | "PAID") {
    const inst = await this.prisma.institution.findUnique({ where: { id: institutionId } })
    if (!inst) return null

    await this.prisma.institution.update({
      where: { id: institutionId },
      data: { tier },
    })

    return true
  }

  async listEmployers(page: number) {
    const limit = 20
    const skip = (page - 1) * limit

    const [total, items] = await this.prisma.$transaction([
      this.prisma.employer.count(),
      this.prisma.employer.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          cacNumber: true,
          walletAddress: true,
          kycApproved: true,
          active: true,
          freeVerificationsRemaining: true,
          createdAt: true,
        },
      }),
    ])

    return { total, page, limit, items }
  }

  async approveEmployer(employerId: string, adminId: string) {
    const emp = await this.prisma.employer.findUnique({ where: { id: employerId } })
    if (!emp) return null

    if (!emp.walletAddress) return null

    try {
      const alreadyInitialised = await this.blockchainSvc.isEmployerInitialised(
        emp.walletAddress
      )
      if (!alreadyInitialised) {
        await this.blockchainSvc.initialiseEmployer(emp.walletAddress)
      }
    } catch (err) {
      log.error({ err, employerId }, "Failed to initialise employer on-chain")
      return null
    }

    await this.prisma.$transaction([
      this.prisma.employer.update({
        where: { id: employerId },
        data: { kycApproved: true },
      }),
      this.prisma.auditLog.create({
        data: {
          action: "KYC_APPROVED",
          details: { role: "employer", orgName: emp.name },
          adminId,
          employerId: emp.id,
        },
      }),
    ])

    await this.emailService.sendKycApproval({
      to: emp.email,
      orgName: emp.name,
      role: "employer",
    })

    return true
  }

  async deactivateInstitution(institutionId: string, adminId: string, reason: string) {
    const inst = await this.prisma.institution.findUnique({ where: { id: institutionId } })
    if (!inst) return null

    const deactivatedAt = new Date()

    await this.prisma.$transaction([
      this.prisma.institution.update({
        where: { id: institutionId },
        data: {
          active: false,
          deactivatedAt,
          deactivationReason: reason,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          action: "INSTITUTION_DEACTIVATED",
          details: { orgName: inst.name, reason },
          adminId,
          institutionId: inst.id,
        },
      }),
    ])

    await this.emailService.sendInstitutionDeactivationAlert({
      to: inst.email,
      orgName: inst.name,
      reason,
      date: deactivatedAt.toISOString(),
    })

    return true
  }

  async deactivateEmployer(employerId: string, adminId: string, reason: string) {
    const emp = await this.prisma.employer.findUnique({ where: { id: employerId } })
    if (!emp) return null

    const deactivatedAt = new Date()

    await this.prisma.$transaction([
      this.prisma.employer.update({
        where: { id: employerId },
        data: {
          active: false,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          action: "EMPLOYER_DEACTIVATED",
          details: { orgName: emp.name, reason },
          adminId,
          employerId: emp.id,
        },
      }),
    ])

    await this.emailService.sendEmployerDeactivationAlert({
      to: emp.email,
      orgName: emp.name,
      reason,
      date: deactivatedAt.toISOString(),
    })

    return true
  }

  async getPlatformStats() {
    let adminWalletBalance = "0"
    try {
      const { config } = await import("../config/index.js")
      if (config.PLATFORM_ADMIN_PUBLIC_KEY) {
        const balance = await this.blockchainSvc.getBalance(config.PLATFORM_ADMIN_PUBLIC_KEY)
        adminWalletBalance = balance.toString()
      }
    } catch (err) {
      log.error({ err }, "Could not fetch admin wallet balance")
    }

    const [institutions, employers, batches, verifications, activeInstitutionsList] =
      await this.prisma.$transaction([
        this.prisma.institution.count(),
        this.prisma.employer.count(),
        this.prisma.batch.count({ where: { status: "CONFIRMED" } }),
        this.prisma.verificationRequest.count({ where: { result: "VERIFIED" } }),
        this.prisma.institution.findMany({
          where: { kycApproved: true, active: true },
          select: { name: true },
          orderBy: { createdAt: "desc" },
        }),
      ])

    const totalCredentials = await this.prisma.credential.count()
    const revokedCount = await this.prisma.credential.count({ where: { status: "REVOKED" } })

    return {
      institutions,
      employers,
      confirmedBatches: batches,
      successfulVerifications: verifications,
      totalCredentials,
      revokedCredentials: revokedCount,
      activeInstitutionNames: activeInstitutionsList.map((i) => i.name),
      adminWalletBalance,
    }
  }
}
