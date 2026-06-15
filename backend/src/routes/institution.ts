import ExcelJS from "exceljs"
import type { FastifyPluginAsync } from "fastify"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { config } from "../config/index.js"
import { InstitutionService } from "../services/institution.service.js"
import { BatchQueue } from "../workers/batch.queue.js"

const claimBody = z.object({
  label: z.string().min(3).max(100),
  claimCode: z.number().int().min(1).max(6),
  threshold: z.number().int().min(0).max(500).default(0),
  reviewType: z.enum(["AUTO", "MANUAL"]).default("AUTO"),
  active: z.boolean().optional(),
  description: z.string().optional(),
})

const revokeBody = z.object({
  nullifier: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "Invalid nullifier format"),
  reasonCode: z.number().int().min(1).max(5),
})

export const institutionRoutes: FastifyPluginAsync = async (app) => {
  const instSvc = new InstitutionService(app.prisma)
  const batchQueue = new BatchQueue(config.REDIS_URL)

  app.addHook("preHandler", app.requireInstitution)

  app.get("/batch/template", async (_req, rep) => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Batch Template")

    sheet.columns = [
      { header: "MatricNumber", key: "matricNumber", width: 18 },
      { header: "StudentName", key: "studentName", width: 28 },
      { header: "CGPA", key: "cgpa", width: 8 },
      { header: "Classification", key: "classification", width: 18 },
      { header: "CourseName", key: "courseName", width: 24 },
      { header: "GraduationYear", key: "graduationYear", width: 16 },
    ]

    sheet.addRow({
      matricNumber: "FUT/MIN/2020/001",
      studentName: "Example Student",
      cgpa: 4.2,
      classification: "Second Class Upper",
      courseName: "Computer Science",
      graduationYear: 2024,
    })

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
    rep.header("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    rep.header("content-disposition", "attachment; filename=veridaq_template.xlsx")
    return rep.send(buffer)
  })

  app.post("/batch/upload", async (req, rep) => {
    const institutionId = req.jwtPayload.sub
    const data = await req.file()
    if (!data) return rep.code(400).send({ error: "No file uploaded" })

    const ext = data.filename.split(".").pop()?.toLowerCase()
    if (ext !== "xlsx") return rep.code(400).send({ error: "Only .xlsx files are accepted" })

    const buffer = await data.toBuffer()
    const job = await batchQueue.enqueue({ institutionId, fileBuffer: buffer.toString("base64") })

    return rep.code(202).send({ jobId: job.id, message: "File received. Validation in progress." })
  })

  app.get("/batch", async (req) => {
    const { sub: institutionId } = req.jwtPayload
    const q = req.query as { page?: string; limit?: string }
    return instSvc.listBatches(institutionId, Number(q.page ?? 1), Number(q.limit ?? 10))
  })

  app.get("/batch/:id", async (req, rep) => {
    const { id } = req.params as { id: string }
    const result = await instSvc.getBatch(id, req.jwtPayload.sub)
    if (!result) return rep.code(404).send({ error: "Batch not found" })
    return result
  })

  app.delete("/batch/:id", async (req, rep) => {
    const { id } = req.params as { id: string }
    const result = await instSvc.deleteBatch(id, req.jwtPayload.sub)
    if (!result) return rep.code(404).send({ error: "Batch not found" })
    if ("error" in result) return rep.code(400).send({ error: result.error })
    return rep.code(204).send()
  })

  app.post("/claims", async (req, rep) => {
    try {
      const body = claimBody.parse(req.body)
      const institutionId = req.jwtPayload.sub
      const claim = await instSvc.createClaim(institutionId, body)
      return rep.code(201).send(claim)
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return rep.code(400).send({ error: "Validation failed", details: err.errors })
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          return rep.code(409).send({
            error: "A claim with this claim code and threshold already exists for your institution",
          })
        }
        if (err.code === "P2003") {
          return rep.code(500).send({ error: "Institution reference not found" })
        }
      }
      throw err
    }
  })

  app.get("/claims", async (req) => {
    return instSvc.listClaims(req.jwtPayload.sub)
  })

  app.patch("/claims/:id", async (req, rep) => {
    const { id } = req.params as { id: string }
    const body = claimBody.partial().parse(req.body)
    const updateData = {
      ...(body.label ? { label: body.label } : {}),
      ...(typeof body.claimCode === "number" ? { claimCode: body.claimCode } : {}),
      ...(typeof body.threshold === "number" ? { threshold: body.threshold } : {}),
      ...(body.reviewType ? { reviewType: body.reviewType } : {}),
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
      ...(body.description ? { description: body.description } : {}),
    }
    const claim = await instSvc.updateClaim(id, req.jwtPayload.sub, updateData)
    if (!claim) return rep.code(404).send({ error: "Claim not found" })
    return claim
  })

  app.post("/revoke", async (req, rep) => {
    const { nullifier, reasonCode } = revokeBody.parse(req.body)
    const institutionId = req.jwtPayload.sub
    const result = await instSvc.revokeCredential(institutionId, nullifier, reasonCode)
    if (!result.ok) return rep.code(400).send({ error: result.error })
    return { ok: true }
  })

  app.get("/verifications", async (req) => {
    const q = req.query as { status?: string; page?: string }
    return instSvc.listVerifications(req.jwtPayload.sub, q.status, Number(q.page ?? 1))
  })

  app.post("/verifications/:id/approve", async (req, rep) => {
    const { id } = req.params as { id: string }
    const result = await instSvc.approveVerification(id, req.jwtPayload.sub)
    if (!result.ok) return rep.code(400).send({ error: result.error })
    return { ok: true }
  })

  app.post("/verifications/:id/decline", async (req, rep) => {
    const { id } = req.params as { id: string }
    const result = await instSvc.declineVerification(id, req.jwtPayload.sub)
    if (!result.ok) return rep.code(400).send({ error: result.error })
    return { ok: true }
  })

  app.get("/dashboard", async (req) => {
    return instSvc.getDashboardStats(req.jwtPayload.sub)
  })

  app.get("/profile", async (req) => {
    return instSvc.getProfile(req.jwtPayload.sub)
  })

  app.get("/billing", async (req) => {
    return instSvc.getBilling(req.jwtPayload.sub)
  })
}
