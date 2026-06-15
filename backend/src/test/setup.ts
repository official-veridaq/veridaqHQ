/**
 * Vitest global test setup.
 * Creates and tears down a test Prisma client connected to the test database.
 * Gracefully skips tests when database is unavailable.
 */

import { PrismaClient } from "@prisma/client"
import { beforeAll, afterAll } from "vitest"

let prisma: PrismaClient

beforeAll(async () => {
  prisma = new PrismaClient()
  try {
    await prisma.$connect()
  } catch {
    // Database not available — tests that need it will be skipped.
  }
})

afterAll(async () => {
  try {
    await prisma.$disconnect()
  } catch {
    // ignore
  }
})
