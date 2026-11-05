import type { FastifyPluginAsync } from "fastify"
import { z } from "zod"
import { CrossmintService } from "../services/crossmint.service.js"
import { PaymentService } from "../services/payment.service.js"
import { config } from "../config/index.js"

const crossmintSvc = new CrossmintService()

const createOrderSchema = z.object({
  amountUsd: z.number().min(10),
  type: z.enum(["INSTITUTION_UPGRADE", "INSTITUTION_FUNDING", "EMPLOYER_TOPUP"]).optional(),
})

export const crossmintRoutes: FastifyPluginAsync = async (app) => {
  const paymentSvc = new PaymentService(app.prisma)

  app.post("/create-order", { onRequest: [app.requireAuth] }, async (req, rep) => {
    const body = createOrderSchema.parse(req.body)
    const payerRole = req.jwtPayload.role as string
    const payerId = req.jwtPayload.sub

    const paymentType = body.type ?? "INSTITUTION_FUNDING"

    const payment = await paymentSvc.createPayment({
      type: paymentType as any,
      method: "FIAT",
      amountWei: "0",
      amountFiat: String(body.amountUsd),
      fiatCurrency: "USD",
      payerId,
      payerRole: payerRole as "INSTITUTION" | "EMPLOYER",
      description: `Crossmint deposit: $${body.amountUsd}`,
    })

    const walletAddress = config.PLATFORM_ADMIN_PUBLIC_KEY ?? req.jwtPayload.sub

    const { checkoutUrl, orderId } = await crossmintSvc.createOrder({
      amountUsd: body.amountUsd,
      walletAddress,
      orderId: payment.referenceId,
    })

    return rep.code(201).send({
      checkoutUrl,
      orderId,
      referenceId: payment.referenceId,
      amountUsd: body.amountUsd,
    })
  })

  /**
   * Crossmint webhook handler.
   * Crossmint sends events for payment completion, failure, etc.
   */
  app.post("/webhook", async (req, rep) => {
    const signature = (req.headers["x-crossmint-signature"] as string) ?? ""
    const rawBody = JSON.stringify(req.body)

    if (!crossmintSvc.verifyWebhookSignature(rawBody, signature)) {
      app.log.warn("Crossmint webhook signature verification failed")
      return rep.code(401).send({ error: "Invalid signature" })
    }

    const event = crossmintSvc.parseWebhookEvent(req.body)
    if (!event) {
      return rep.code(400).send({ error: "Invalid webhook payload" })
    }

    app.log.info(
      { eventType: event.type, status: event.status, orderId: event.orderId },
      "Crossmint webhook received"
    )

    if (event.type === "order:completed" && event.status === "success") {
      const amountFiat = event.payment?.total ?? "0"
      const fiatCurrency = event.payment?.currency ?? "USD"
      const recipientAddress = event.recipient?.walletAddress ?? "unknown"

      const result = await paymentSvc.completeFiatPayment(
        event.orderId,
        "crossmint",
        event.orderId,
        amountFiat,
        fiatCurrency
      )

      if ("error" in result) {
        app.log.error(
          { error: result.error, orderId: event.orderId },
          "Crossmint webhook: payment completion failed"
        )
        return rep.code(200).send({ received: true, status: "error", detail: result.error })
      }

      app.log.info(
        { orderId: event.orderId, amountFiat, recipientAddress },
        "Crossmint payment completed"
      )
    }

    return rep.code(200).send({ received: true })
  })
}
