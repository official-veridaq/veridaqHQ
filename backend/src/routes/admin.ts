import type { FastifyPluginAsync } from "fastify"
import { z } from "zod"
import { AdminService } from "../services/admin.service.js"
import { PaymentService } from "../services/payment.service.js"

const tierBody = z.object({
  tier: z.enum(["FREE", "PAID"]),
})

const deactivateBody = z.object({
  reason: z.string().min(10),
})

export const adminRoutes: FastifyPluginAsync = async (app) => {
  const adminSvc = new AdminService(app.prisma)
  const paymentSvc = new PaymentService(app.prisma)

  app.addHook("preHandler", app.requireAdmin)

  app.get("/institutions", async (req) => {
    const q = req.query as { page?: string; search?: string }
    return adminSvc.listInstitutions(Number(q.page ?? 1), q.search)
  })

  app.post("/institutions/:id/approve", async (req, rep) => {
    const { id } = req.params as { id: string }
    const result = await adminSvc.approveInstitution(id, req.jwtPayload.sub)
    if (!result) return rep.code(404).send({ error: "Institution not found" })
    return { ok: true }
  })

  app.post("/institutions/:id/tier", async (req, rep) => {
    const { id } = req.params as { id: string }
    const { tier } = tierBody.parse(req.body)
    const result = await adminSvc.setInstitutionTier(id, tier)
    if (!result) return rep.code(404).send({ error: "Institution not found" })
    return { ok: true }
  })

  app.post("/institutions/:id/deactivate", async (req, rep) => {
    const { id } = req.params as { id: string }
    const { reason } = deactivateBody.parse(req.body)
    const result = await adminSvc.deactivateInstitution(id, req.jwtPayload.sub, reason)
    if (!result) return rep.code(404).send({ error: "Institution not found" })
    return { ok: true }
  })

  app.get("/employers", async (req) => {
    const q = req.query as { page?: string }
    return adminSvc.listEmployers(Number(q.page ?? 1))
  })

  app.post("/employers/:id/approve", async (req, rep) => {
    const { id } = req.params as { id: string }
    const result = await adminSvc.approveEmployer(id, req.jwtPayload.sub)
    if (!result) return rep.code(404).send({ error: "Employer not found" })
    return { ok: true }
  })

  app.post("/employers/:id/deactivate", async (req, rep) => {
    const { id } = req.params as { id: string }
    const { reason } = deactivateBody.parse(req.body)
    const result = await adminSvc.deactivateEmployer(id, req.jwtPayload.sub, reason)
    if (!result) return rep.code(404).send({ error: "Employer not found" })
    return { ok: true }
  })

  app.get("/stats", async () => adminSvc.getPlatformStats())

  app.get("/payments", async (req) => {
    const q = req.query as { page?: string; limit?: string; status?: string }
    return paymentSvc.listPayments({
      page: Number(q.page ?? 1),
      limit: Number(q.limit ?? 50),
      status: q.status as any,
    })
  })

  app.get("/audit", async (req) => {
    const q = req.query as { page?: string; limit?: string }
    const page = Number(q.page ?? 1)
    const limit = Number(q.limit ?? 50)
    const skip = (page - 1) * limit
    const [total, items] = await app.prisma.$transaction([
      app.prisma.auditLog.count(),
      app.prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ])
    return { total, page, limit, items }
  })
}
