/**
 * Database seed script.
 * Creates default admin, one institution, and one employer for local development.
 *
 * Credentials (all for development only — change these before any deployment):
 *   Admin:       admin@veridaq.xyz       / Admin@2026!
 *   Institution: futminna@veridaq.xyz    / Inst@2026!
 *   Employer:    firstbank@veridaq.xyz   / Emp@2026!
 *
 * Run with: pnpm db:seed
 */

import { PrismaClient } from "@prisma/client"
import bcryptjs from "bcryptjs"
import { randomBytes } from "crypto"
import { encrypt } from "../src/utils/crypto.js"

const prisma = new PrismaClient()
const COST = 12

async function main() {
  console.info("Seeding database...")

  const adminHash = await bcryptjs.hash("Admin@2026!", COST)
  const instHash = await bcryptjs.hash("Inst@2026!", COST)
  const empHash = await bcryptjs.hash("Emp@2026!", COST)
  const institutionKeyHex = randomBytes(32).toString("hex")
  const { encryptedData, encryptedIv, encryptedTag } = encrypt(institutionKeyHex)

  // Admin
  await prisma.admin.upsert({
    where: { email: "admin@veridaq.xyz" },
    update: {},
    create: {
      email: "admin@veridaq.xyz",
      passwordHash: adminHash,
      name: "Platform Administrator",
    },
  })

  // Institution — Federal University of Technology Minna
  const inst = await prisma.institution.upsert({
    where: { email: "futminna@veridaq.xyz" },
    update: {
      institutionKeyEncrypted: encryptedData,
      institutionKeyIv: encryptedIv,
      institutionKeyTag: encryptedTag,
      publicKey: "0x04aabbcc",
      adminWallet: "0x0000000000000000000000000000000000000001",
      active: true,
      tier: "FREE",
      kycApproved: true,
    },
    create: {
      onChainId: "0x" + Buffer.from("futminna").toString("hex").padStart(64, "0"),
      name: "Federal University of Technology Minna",
      email: "futminna@veridaq.xyz",
      passwordHash: instHash,
      adminWallet: "0x0000000000000000000000000000000000000001",
      publicKey: "0x04aabbcc",
      institutionKeyEncrypted: encryptedData,
      institutionKeyIv: encryptedIv,
      institutionKeyTag: encryptedTag,
      active: true,
      tier: "FREE",
      kycApproved: true,
    },
  })

  // Default claim definitions for the institution
  await prisma.claimDefinition.createMany({
    skipDuplicates: true,
    data: [
      {
        institutionId: inst.id,
        label: "Programme Completion",
        claimCode: 1,
        threshold: 0,
        reviewType: "AUTO",
      },
      {
        institutionId: inst.id,
        label: "Minimum Lower Second Class (2.2)",
        claimCode: 2,
        threshold: 0,
        reviewType: "AUTO",
      },
      {
        institutionId: inst.id,
        label: "Minimum Upper Second Class (2.1)",
        claimCode: 3,
        threshold: 0,
        reviewType: "AUTO",
      },
      {
        institutionId: inst.id,
        label: "First Class Honours",
        claimCode: 4,
        threshold: 0,
        reviewType: "AUTO",
      },
      {
        institutionId: inst.id,
        label: "CGPA above 3.50",
        claimCode: 5,
        threshold: 350,
        reviewType: "AUTO",
      },
      {
        institutionId: inst.id,
        label: "Course-Specific Completion",
        claimCode: 6,
        threshold: 0,
        reviewType: "MANUAL",
      },
    ],
  })

  // Employer — First Bank Nigeria
  await prisma.employer.upsert({
    where: { email: "firstbank@veridaq.xyz" },
    update: {},
    create: {
      name: "First Bank Nigeria Ltd",
      cacNumber: "RC000001",
      email: "firstbank@veridaq.xyz",
      passwordHash: empHash,
      walletAddress: "0x0000000000000000000000000000000000000002",
      active: true,
      kycApproved: true,
      freeVerificationsRemaining: 3,
    },
  })

  console.info("Seed complete.")
}

main()
  .catch((err) => {
    console.error("Seed failed:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
