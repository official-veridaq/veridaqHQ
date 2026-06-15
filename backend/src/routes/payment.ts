import type { FastifyPluginAsync } from "fastify"
import { z } from "zod"
import { PaymentService, CREDIT_PACKS } from "../services/payment.service.js"

const createPaymentSchema = z.object({
  type: z.enum(["INSTITUTION_UPGRADE", "INSTITUTION_FUNDING", "EMPLOYER_TOPUP"]),
  method: z.enum(["CRYPTO", "FIAT"]),
  amountWei: z.string().min(1),
  amountFiat: z.string().optional(),
  fiatCurrency: z.string().optional(),
  description: z.string().optional(),
})

const completeFiatSchema = z.object({
  referenceId: z.string().min(1),
  fiatProvider: z.string().min(1),
  fiatSessionId: z.string().min(1),
  amountFiat: z.string().min(1),
  fiatCurrency: z.string().min(1),
})

export const paymentRoutes: FastifyPluginAsync = async (app) => {
  const paymentSvc = new PaymentService(app.prisma)

  app.addHook("preHandler", app.requireAuth)

  app.post("/create", async (req, rep) => {
    const body = createPaymentSchema.parse(req.body)
    const payerRole = req.jwtPayload.role as "INSTITUTION" | "EMPLOYER"

    if (body.type === "INSTITUTION_UPGRADE" && payerRole !== "INSTITUTION") {
      return rep.code(403).send({ error: "Only institutions can upgrade" })
    }
    if (body.type === "INSTITUTION_FUNDING" && payerRole !== "INSTITUTION") {
      return rep.code(403).send({ error: "Only institutions can fund" })
    }
    if (body.type === "EMPLOYER_TOPUP" && payerRole !== "EMPLOYER") {
      return rep.code(403).send({ error: "Only employers can top up" })
    }

    const payment = await paymentSvc.createPayment({
      type: body.type as any,
      method: body.method as any,
      amountWei: body.amountWei,
      amountFiat: body.amountFiat ?? null,
      fiatCurrency: body.fiatCurrency ?? "USD",
      payerId: req.jwtPayload.sub,
      payerRole,
      description: body.description ?? null,
    })

    return rep.code(201).send(payment)
  })

  app.get("/info", async (req) => {
    const payerRole = req.jwtPayload.role as "INSTITUTION" | "EMPLOYER"

    let institutionOnChainId: string | null = null
    let institutionName: string | null = null
    let currentBalance: string | null = null
    let credits: number | null = null
    let freeRemaining: number | null = null

    if (payerRole === "INSTITUTION") {
      const inst = await app.prisma.institution.findUnique({
        where: { id: req.jwtPayload.sub },
        select: { onChainId: true, name: true, tier: true },
      })
      if (inst) {
        institutionOnChainId = inst.onChainId
        institutionName = inst.name
      }
    }

    if (payerRole === "EMPLOYER") {
      const emp = await app.prisma.employer.findUnique({
        where: { id: req.jwtPayload.sub },
        select: { freeVerificationsRemaining: true, verificationCredits: true },
      })
      if (emp) {
        freeRemaining = emp.freeVerificationsRemaining
        credits = emp.verificationCredits
      }
    }

    return {
      crossmintEnabled: Boolean(process.env.CROSSMINT_SERVER_API_KEY),
      institutionOnChainId,
      institutionName,
      currentBalance,
      freeRemaining,
      credits,
      creditPacks: CREDIT_PACKS,
    }
  })

  app.get("/list", async (req) => {
    const q = req.query as { page?: string; limit?: string }
    const payerRole = req.jwtPayload.role as "INSTITUTION" | "EMPLOYER"
    return paymentSvc.listPayments({
      payerId: req.jwtPayload.sub,
      payerRole,
      page: Number(q.page ?? 1),
      limit: Number(q.limit ?? 20),
    })
  })

  app.get("/:referenceId", async (req, rep) => {
    const { referenceId } = req.params as { referenceId: string }
    const payment = await paymentSvc.getPayment(referenceId)
    if (!payment) return rep.code(404).send({ error: "Payment not found" })
    if (payment.payerId !== req.jwtPayload.sub) {
      return rep.code(403).send({ error: "Access denied" })
    }
    return payment
  })

  app.post("/complete/fiat", async (req, rep) => {
    const body = completeFiatSchema.parse(req.body)
    const result = await paymentSvc.completeFiatPayment(
      body.referenceId,
      body.fiatProvider,
      body.fiatSessionId,
      body.amountFiat,
      body.fiatCurrency
    )
    if ("error" in result) {
      return rep.code(400).send({ error: result.error })
    }
    return { completed: true }
  })

  app.post("/fail", async (req, rep) => {
    const body = z.object({ referenceId: z.string().min(1) }).parse(req.body)
    const result = await paymentSvc.failPayment(body.referenceId)
    if ("error" in result) return rep.code(404).send({ error: "Payment not found" })
    return { failed: true }
  })

  app.get("/balance", async (req, rep) => {
    const payerRole = req.jwtPayload.role as "INSTITUTION" | "EMPLOYER"
    const balance = await paymentSvc.getPayerBalance(req.jwtPayload.sub, payerRole)
    if (!balance) return rep.code(404).send({ error: "Entity not found" })
    return balance
  })
}
