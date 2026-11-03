import type { FastifyPluginAsync } from "fastify"
import { z } from "zod"
import { BlockchainService } from "../services/blockchain.service.js"

const updateBody = z.object({
  name: z.string().min(2).max(200).optional(),
})

export const employerRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", app.requireEmployer)

  app.get("/profile", async (req, rep) => {
    const bSvc = new BlockchainService()
    const emp = await app.prisma.employer.findUnique({
      where: { id: req.jwtPayload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        cacNumber: true,
        kycApproved: true,
        walletAddress: true,
        freeVerificationsRemaining: true,
        createdAt: true,
      },
    })
    if (!emp) return rep.code(404).send({ error: "Not found" })
    let onChainVerifications = 0
    if (emp.walletAddress) {
      try {
        onChainVerifications = await bSvc.getRemainingFreeVerifications(emp.walletAddress)
      } catch (err) {
        req.log.error({ err }, "Failed to fetch free verification balance")
      }
    }

    return {
      ...emp,
      freeVerificationsRemaining: Math.max(
        Number(emp.freeVerificationsRemaining),
        onChainVerifications
      ),
    }
  })

  app.patch("/profile", async (req, rep) => {
    const { name } = updateBody.parse(req.body)
    if (!name) {
      const existing = await app.prisma.employer.findUnique({ where: { id: req.jwtPayload.sub } })
      if (!existing) return rep.code(404).send({ error: "Not found" })
      return { id: existing.id, name: existing.name }
    }
    const updated = await app.prisma.employer.update({
      where: { id: req.jwtPayload.sub },
      data: { name },
    })
    return { id: updated.id, name: updated.name }
  })
}
