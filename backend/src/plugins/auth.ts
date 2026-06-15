import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify"
/**
 * Auth plugin: registers JWT sign/verify helpers and role-check preHandlers
 * that route handlers can use as preHandler hooks.
 */

import jwt from "@fastify/jwt"
import fp from "fastify-plugin"
import { config } from "../config/index.js"

export type JwtPayload = {
  sub: string
  role: "ADMIN" | "INSTITUTION" | "EMPLOYER"
  email: string
}

declare module "fastify" {
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, rep: FastifyReply) => Promise<any>
    requireAdmin: (req: FastifyRequest, rep: FastifyReply) => Promise<any>
    requireInstitution: (req: FastifyRequest, rep: FastifyReply) => Promise<any>
    requireEmployer: (req: FastifyRequest, rep: FastifyReply) => Promise<any>
  }
  interface FastifyRequest {
    jwtPayload: JwtPayload
  }
}

export const authPlugin: FastifyPluginAsync = fp(async (app) => {
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_EXPIRES_IN },
  })

  // Generic auth check — just verifies the token is valid
  const requireAuth = async (req: FastifyRequest, rep: FastifyReply) => {
    try {
      req.jwtPayload = await req.jwtVerify<JwtPayload>()
    } catch {
      return rep.code(401).send({ error: "Unauthorised" })
    }
  }

  // Role-specific guards
  const makeRoleGuard =
    (role: JwtPayload["role"]) => async (req: FastifyRequest, rep: FastifyReply) => {
      await requireAuth(req, rep)
      if (rep.sent) return
      if (req.jwtPayload?.role !== role) {
        return rep.code(403).send({ error: "Forbidden" })
      }
    }

  app.decorate("requireAuth", requireAuth)
  app.decorate("requireAdmin", makeRoleGuard("ADMIN"))
  app.decorate("requireInstitution", makeRoleGuard("INSTITUTION"))
  app.decorate("requireEmployer", makeRoleGuard("EMPLOYER"))
})
