/**
 * Basic auth service tests.
 * Uses the seeded credentials from prisma/seed.ts.
 * Skipped when no database is available.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { PrismaClient } from "@prisma/client"
import { AuthService } from "../services/auth.service.js"

let authSvc: AuthService | undefined
let prisma: PrismaClient

beforeAll(async () => {
  prisma = new PrismaClient()
  try {
    await prisma.$connect()
    authSvc = new AuthService(prisma)
  } catch {
    // Database not available — tests silently skip
  }
})

afterAll(async () => {
  try {
    await prisma?.$disconnect()
  } catch {
    // ignore
  }
})

describe("AuthService.loginAdmin", () => {
  it("returns tokens for valid admin credentials", async () => {
    if (!authSvc) return
    const result = await authSvc.loginAdmin("admin@veridaq.xyz", "Admin@2026!")
    expect(result).not.toBeNull()
    expect(result?.accessToken).toBeTruthy()
    expect(result?.user.role).toBe("ADMIN")
  })

  it("returns null for wrong password", async () => {
    if (!authSvc) return
    const result = await authSvc.loginAdmin("admin@veridaq.xyz", "wrongpassword")
    expect(result).toBeNull()
  })
})
