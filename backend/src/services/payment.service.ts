import { PrismaClient, PaymentMethod, PaymentStatus, PaymentType } from "@prisma/client"
import { randomBytes } from "crypto"
import pino from "pino"
import { BlockchainService } from "./blockchain.service.js"

const log = pino({ name: "payment-service" })

export const UPGRADE_PRICE_XLM = "10"
export const CREDIT_PACKS = [
  { label: "10 Verifications", amountXlm: "10", credits: 10, usd: 15 },
  { label: "25 Verifications", amountXlm: "25", credits: 25, usd: 30 },
  { label: "50 Verifications", amountXlm: "50", credits: 50, usd: 50 },
  { label: "100 Verifications", amountXlm: "100", credits: 100, usd: 90 },
] as const

export class PaymentService {
  private blockchainSvc: BlockchainService

  constructor(
    private prisma: PrismaClient,
    blockchainSvc?: BlockchainService
  ) {
    this.blockchainSvc = blockchainSvc ?? new BlockchainService()
  }

  private generateReference(): string {
    return "VRD-" + randomBytes(16).toString("hex").toUpperCase()
  }

  async createPayment(data: {
    type: PaymentType
    method?: PaymentMethod | null
    amountWei: string
    payerId: string
    payerRole: "INSTITUTION" | "EMPLOYER"
    description?: string | null
    amountFiat?: string | null
    fiatCurrency?: string | null
  }) {
    const referenceId = this.generateReference()

    const payment = await this.prisma.payment.create({
      data: {
        referenceId,
        type: data.type,
        method: data.method as any,
        amountWei: data.amountWei,
        amountFiat: data.amountFiat ?? null,
        fiatCurrency: data.fiatCurrency ?? null,
        payerId: data.payerId,
        payerRole: data.payerRole,
        description: data.description ?? null,
      },
    })

    log.info({ referenceId, type: data.type, payerId: data.payerId, method: data.method }, "Payment created")
    return payment
  }

  async completeCryptoPayment(
    referenceId: string,
    txHash: string,
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { referenceId } })
    if (!payment) return { error: "NOT_FOUND" as const }
    if (payment.status !== "PENDING") return { error: "ALREADY_PROCESSED" as const }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        method: "CRYPTO",
        txHash,
        completedAt: new Date(),
      },
    })

    await this.applyPayment(payment)
    return { completed: true }
  }

  async completeFiatPayment(
    referenceId: string,
    fiatProvider: string,
    fiatSessionId: string,
    amountFiat: string,
    fiatCurrency: string
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { referenceId } })
    if (!payment) return { error: "NOT_FOUND" as const }
    if (payment.status !== "PENDING") return { error: "ALREADY_PROCESSED" as const }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        method: "FIAT",
        fiatProvider,
        fiatSessionId,
        amountFiat,
        fiatCurrency,
        completedAt: new Date(),
      },
    })

    await this.applyPayment(payment)
    return { completed: true }
  }

  private async applyPayment(payment: {
    id: string
    type: PaymentType
    payerId: string
    payerRole: string
    amountWei: string
    method?: string | null
  }) {
    if (payment.type === "INSTITUTION_UPGRADE") {
      await this.prisma.institution.update({
        where: { id: payment.payerId },
        data: { tier: "PAID" },
      })
    } else if (payment.type === "EMPLOYER_TOPUP") {
      const emp = await this.prisma.employer.findUnique({ where: { id: payment.payerId } })
      if (emp) {
        const added = this.calculateCreditsForAmount(BigInt(payment.amountWei))
        await this.prisma.employer.update({
          where: { id: payment.payerId },
          data: { verificationCredits: { increment: added } },
        })
        if (emp.walletAddress) {
          try {
            await this.blockchainSvc.initialiseEmployer(emp.walletAddress)
          } catch (err) {
            log.error({ err, employerId: payment.payerId }, "Failed to re-init employer")
          }
        }
      }
    }

    await this.prisma.auditLog.create({
      data: {
        action: "PAYMENT_" + payment.type,
        details: {
          paymentId: payment.id,
          amountWei: payment.amountWei,
          payerId: payment.payerId,
          payerRole: payment.payerRole,
          method: payment.method,
        },
      },
    })
  }

  private calculateCreditsForAmount(_amount: bigint): number {
    return 10
  }

  async failPayment(referenceId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { referenceId } })
    if (!payment) return { error: "NOT_FOUND" as const }
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    })
    return { failed: true }
  }

  async getPayment(referenceId: string) {
    return this.prisma.payment.findUnique({ where: { referenceId } })
  }

  async listPayments(params: {
    payerId?: string
    payerRole?: string
    status?: PaymentStatus
    page?: number
    limit?: number
  }) {
    const { payerId, payerRole, status, page = 1, limit = 20 } = params
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = {}
    if (payerId) where.payerId = payerId
    if (payerRole) where.payerRole = payerRole
    if (status) where.status = status

    const [total, items] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ])
    return { total, page, limit, items }
  }

  async getPayerBalance(payerId: string, payerRole: string) {
    if (payerRole === "INSTITUTION") {
      const inst = await this.prisma.institution.findUnique({
        where: { id: payerId },
        select: { tier: true },
      })
      if (!inst) return null
      return { tier: inst.tier }
    }
    if (payerRole === "EMPLOYER") {
      const emp = await this.prisma.employer.findUnique({
        where: { id: payerId },
        select: {
          freeVerificationsRemaining: true,
          verificationCredits: true,
          walletAddress: true,
        },
      })
      if (!emp) return null
      let onChainVerifications = 0
      if (emp.walletAddress) {
        onChainVerifications = await this.blockchainSvc
          .getRemainingFreeVerifications(emp.walletAddress)
          .catch(() => 0)
      }
      return {
        dbVerifications: emp.freeVerificationsRemaining,
        dbCredits: emp.verificationCredits,
        onChainVerifications,
        totalAvailable: emp.freeVerificationsRemaining + emp.verificationCredits,
      }
    }
    return null
  }
}
