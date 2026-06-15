/**
 * Auth routes — login, refresh, logout for all three actor types.
 *
 * POST /api/auth/institution/login
 * POST /api/auth/employer/login
 * POST /api/auth/admin/login
 * POST /api/auth/refresh
 * POST /api/auth/logout
 * GET  /api/auth/me
 */

import type { FastifyPluginAsync } from "fastify"
import { z } from "zod"
import { AuthService } from "../services/auth.service.js"

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

const registerEmployerBody = z.object({
  name: z.string().min(2),
  cacNumber: z.string().min(5),
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

const registerInstitutionBody = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  publicKey: z.string().min(10), // Usually a longer hex
  institutionKey: z
    .string()
    .regex(/^(0x)?[0-9a-fA-F]{64}$/)
    .optional(),
  password: z.string().min(8).max(128),
})

const triggerResetBody = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "institution", "employer"]),
})

const executeResetBody = z.object({
  token: z.string().min(32),
  newPassword: z.string().min(8).max(128),
  role: z.enum(["admin", "institution", "employer"]),
})

export const authRoutes: FastifyPluginAsync = async (app) => {
  const authSvc = new AuthService(app.prisma)

  // Tighten rate limit for login endpoints: 5 attempts per 15 minutes per IP
  const loginRateLimit = {
    config: {
      rateLimit: { max: 5, timeWindow: "15 minutes" },
    },
  }

  // ── Institution login ────────────────────────────────────────────────────

  app.post("/institution/login", { ...loginRateLimit }, async (req, rep) => {
    const { email, password } = loginBody.parse(req.body)
    const result = await authSvc.loginInstitution(email, password)
    if (!result) return rep.code(401).send({ error: "Invalid credentials" })

    // Access token in response body; refresh token in httpOnly cookie
    rep.setCookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env["NODE_ENV"] === "production",
      path: "/api/auth/refresh",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    })

    return { accessToken: result.accessToken, user: result.user }
  })

  // ── Employer login ────────────────────────────────────────────────────────

  app.post("/employer/login", { ...loginRateLimit }, async (req, rep) => {
    const { email, password } = loginBody.parse(req.body)
    const result = await authSvc.loginEmployer(email, password)
    if (!result) return rep.code(401).send({ error: "Invalid credentials" })

    rep.setCookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env["NODE_ENV"] === "production",
      path: "/api/auth/refresh",
      maxAge: 7 * 24 * 60 * 60,
    })

    return { accessToken: result.accessToken, user: result.user }
  })

  // ── Admin login ───────────────────────────────────────────────────────────

  app.post("/admin/login", { ...loginRateLimit }, async (req, rep) => {
    const { email, password } = loginBody.parse(req.body)
    const result = await authSvc.loginAdmin(email, password)
    if (!result) return rep.code(401).send({ error: "Invalid credentials" })

    rep.setCookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env["NODE_ENV"] === "production",
      path: "/api/auth/refresh",
      maxAge: 7 * 24 * 60 * 60,
    })

    return { accessToken: result.accessToken, user: result.user }
  })

  // ── Refresh ───────────────────────────────────────────────────────────────

  app.post("/refresh", async (req, rep) => {
    const token = req.cookies["refreshToken"]
    if (!token) return rep.code(401).send({ error: "No refresh token" })

    const result = await authSvc.refresh(token)
    if (!result) {
      rep.clearCookie("refreshToken")
      return rep.code(401).send({ error: "Invalid or expired refresh token" })
    }

    return { accessToken: result.accessToken }
  })

  app.post("/extension/token", async (req, rep) => {
    const headerToken = req.headers["x-refresh-token"]
    const token = typeof headerToken === "string" ? headerToken : req.cookies["refreshToken"]
    if (!token) return rep.code(401).send({ error: "No refresh token" })

    const result = await authSvc.exchangeExtensionToken(token)
    if (!result) return rep.code(401).send({ error: "Invalid or expired refresh token" })

    return result
  })

  // ── Logout ────────────────────────────────────────────────────────────────

  app.post("/logout", async (req, rep) => {
    rep.clearCookie("refreshToken", { path: "/api/auth/refresh" })
    return { ok: true }
  })

  // ── Me ────────────────────────────────────────────────────────────────────

  app.get("/me", { preHandler: app.requireAuth }, async (req, rep) => {
    const { sub, role } = req.jwtPayload
    let user = null

    if (role === "ADMIN") {
      const admin = await app.prisma.admin.findUnique({ where: { id: sub } })
      if (admin) user = { id: admin.id, email: admin.email, name: admin.name, role: "ADMIN" }
    } else if (role === "INSTITUTION") {
      const inst = await app.prisma.institution.findUnique({ where: { id: sub } })
      if (inst && inst.active)
        user = {
          id: inst.id,
          email: inst.email,
          name: inst.name,
          role: "INSTITUTION",
          kycApproved: inst.kycApproved,
        }
    } else if (role === "EMPLOYER") {
      const emp = await app.prisma.employer.findUnique({ where: { id: sub } })
      if (emp && emp.active)
        user = {
          id: emp.id,
          email: emp.email,
          name: emp.name,
          role: "EMPLOYER",
          kycApproved: emp.kycApproved,
        }
    }

    if (!user) return rep.code(401).send({ error: "User not found or deactivated" })
    return { user }
  })

  // ── Registration ─────────────────────────────────────────────────────────

  app.post("/register/employer", async (req, rep) => {
    try {
      const data = registerEmployerBody.parse(req.body)
      const result = await authSvc.registerEmployer(data)
      return rep.code(201).send(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed"
      return rep.code(400).send({ error: message })
    }
  })

  app.post("/register/institution", async (req, rep) => {
    try {
      const data = registerInstitutionBody.parse(req.body)
      const payload = {
        name: data.name,
        email: data.email,
        publicKey: data.publicKey,
        password: data.password,
        ...(data.institutionKey ? { institutionKey: data.institutionKey } : {}),
      }
      const result = await authSvc.registerInstitution(payload)
      return rep.code(201).send(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed"
      return rep.code(400).send({ error: message })
    }
  })

  // ── Password Reset ───────────────────────────────────────────────────────

  app.post("/password/forgot", async (req, rep) => {
    try {
      const { email, role } = triggerResetBody.parse(req.body)
      // We don't await/fail explicitly to prevent email enumeration, but we execute it
      await authSvc.triggerPasswordReset(email, role)
      return rep.send({ message: "If an account exists, a reset link was sent." })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Password reset failed"
      return rep.code(400).send({ error: message })
    }
  })

  app.post("/password/reset", async (req, rep) => {
    try {
      const { token, newPassword, role } = executeResetBody.parse(req.body)
      await authSvc.executePasswordReset(token, newPassword, role)
      return rep.send({ message: "Password has been successfully reset." })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Password reset failed"
      return rep.code(400).send({ error: message })
    }
  })
}
