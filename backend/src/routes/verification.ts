/**
 * Verification routes — employer submits credential verification requests.
 *
 * POST /api/verify/request       — create a new verification request
 * GET  /api/verify/request/:id   — poll status of a request
 * GET  /api/verify/history       — list all requests for the authenticated employer
 * GET  /api/verify/institutions  — list active institutions and their claim menus
 */

import type { FastifyPluginAsync } from "fastify"
import { z } from "zod"
import { ReportService } from "../services/report.service.js"
import { VerificationService } from "../services/verification.service.js"

const createRequestBody = z.object({
  institutionOnChainId: z.string().min(1),
  matricNumber: z.string().min(5).max(30),
  claimType: z.number().int().min(1).max(6),
  threshold: z.number().int().min(0).max(500).default(0),
  courseName: z.string().optional(),
})

export const verificationRoutes: FastifyPluginAsync = async (app) => {
  const verifySvc = new VerificationService(app.prisma)
  const reportSvc = new ReportService(app.prisma)

  // All verification routes require the caller to be an employer
  app.addHook("preHandler", app.requireEmployer)

  // ── Submit a request ────────────────────────────────────────────────────

  app.post("/request", async (req, rep) => {
    const { institutionOnChainId, matricNumber, claimType, threshold, courseName } =
      createRequestBody.parse(req.body)

    const employerId = req.jwtPayload.sub
    const payload = {
      employerId,
      institutionOnChainId,
      matricNumber,
      claimType,
      threshold,
      ...(courseName ? { courseName } : {}),
    }
    const result = await verifySvc.createRequest(payload)

    if (result.error === "REVOKED") return rep.code(409).send({ error: "Credential revoked" })
    if (result.error === "NOT_FOUND") return rep.code(404).send({ error: "Record not found" })
    if (result.error === "INSTITUTION_KEY_MISSING") {
      return rep.code(500).send({ error: "Institution key missing" })
    }
    return rep.code(202).send({ requestId: result.requestId, status: result.status })
  })

  // ── Poll status ─────────────────────────────────────────────────────────

  app.get("/request/:id", async (req, rep) => {
    const { id } = req.params as { id: string }
    const employerId = req.jwtPayload.sub

    const request = await verifySvc.getRequest(id, employerId)
    if (!request) return rep.code(404).send({ error: "Request not found" })

    return request
  })

  // ── History ─────────────────────────────────────────────────────────────

  app.get("/history", async (req) => {
    const employerId = req.jwtPayload.sub
    const query = req.query as { page?: string; limit?: string }
    const page = Math.max(1, Number(query.page ?? 1))
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20)))

    return verifySvc.getHistory(employerId, page, limit)
  })

  // Report PDF

  app.get("/report/:id", async (req, rep) => {
    const { id } = req.params as { id: string }
    const employerId = req.jwtPayload.sub

    const result = await reportSvc.buildVerificationReport(id, employerId)
    if (result.error === "NOT_FOUND") return rep.code(404).send({ error: "Request not found" })
    if (result.error === "NOT_READY") return rep.code(409).send({ error: "Report not ready" })

    rep.header("content-type", "application/pdf")
    rep.header("content-disposition", `inline; filename="veridaq-report-${id}.pdf"`)
    return rep.send(result.buffer)
  })

  // ── Active institutions ─────────────────────────────────────────────────

  app.get("/institutions", async () => {
    return verifySvc.getActiveInstitutions()
  })
}
