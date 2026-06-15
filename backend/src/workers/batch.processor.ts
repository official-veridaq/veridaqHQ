import { Prisma, PrismaClient } from "@prisma/client"
import { Job, Worker } from "bullmq"
import { buildPoseidon } from "circomlibjs"
import { createHash } from "crypto"
import ExcelJS from "exceljs"
import pino from "pino"
import { Readable } from "stream"
import { z } from "zod"
import { config } from "../config/index.js"
import { BlockchainService } from "../services/blockchain.service.js"
import { formatCgpaRange, getCgpaRange, isCgpaInRange } from "../utils/cgpa.js"
import { decrypt, encrypt } from "../utils/crypto.js"
import { hashToField, hexToField, randomFieldElement } from "../utils/field.js"
import type { BatchJobData } from "./batch.queue.js"

const log = pino({ name: "batch-processor" })

const prisma = new PrismaClient()
const redisUrl = new URL(config.REDIS_URL)
const redisConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || "6379"),
  password: redisUrl.password || undefined,
}

const rowSchema = z.object({
  studentName: z.string().min(2).max(200),
  matricNumber: z.string().min(5).max(30),
  cgpa: z.coerce.number().min(1).max(5),
  classification: z.number().int().min(0).max(4),
  courseName: z.string().min(2).max(200),
  graduationYear: z.number().int().min(1960).max(2030),
})

const classMap: Record<string, number> = {
  "second class upper": 3,
  "second class lower": 2,
  "third class": 1,
  third: 1,
  "lower second class": 2,
  "2.2": 2,
  "lower second": 2,
  "upper second class": 3,
  "2.1": 3,
  "upper second": 3,
  "first class": 4,
  first: 4,
  pass: 0,
}

function parseClassification(raw: unknown): number {
  if (typeof raw === "number") return raw
  if (typeof raw === "string") {
    const n = Number(raw)
    if (!isNaN(n)) return n
    return classMap[raw.toLowerCase().trim()] ?? 0
  }
  return 0
}

async function processJob(job: Job<BatchJobData>) {
  const { institutionId, fileBuffer } = job.data

  const institution = await prisma.institution.findUnique({ where: { id: institutionId } })
  if (!institution) throw new Error("Institution not found: " + institutionId)
  if (
    !institution.institutionKeyEncrypted ||
    !institution.institutionKeyIv ||
    !institution.institutionKeyTag
  ) {
    throw new Error("Institution key missing for institution: " + institutionId)
  }

  const institutionKeyHex = decrypt(
    institution.institutionKeyEncrypted,
    institution.institutionKeyIv,
    institution.institutionKeyTag
  )
  const institutionKey = hexToField(institutionKeyHex)

  const buffer = Buffer.from(fileBuffer, "base64")
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.read(Readable.from(buffer))

  const sheet = workbook.worksheets[0]
  if (!sheet) throw new Error("Excel file contains no worksheets")

  const poseidon = await buildPoseidon()
  const F = poseidon.F

  const credentials: Array<{
    commitment: string
    nullifier: string
    encryptedData: string
    encryptedIv: string
    encryptedTag: string
    graduationYear: number
  }> = []

  const errors: Array<{ row: number; error: string }> = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    const cells = row.values as unknown[]
    const raw = {
      matricNumber: cells[1],
      studentName: cells[2],
      cgpa: cells[3],
      classification: parseClassification(cells[4]),
      courseName: cells[5],
      graduationYear: cells[6],
    }

    const parsed = rowSchema.safeParse(raw)
    if (!parsed.success) {
      errors.push({ row: rowNumber, error: JSON.stringify(parsed.error.flatten().fieldErrors) })
      return
    }

    const d = parsed.data

    const nameHash = hashToField(d.studentName)
    const matricHash = hashToField(d.matricNumber)
    const cgpaInt = Math.round(d.cgpa * 100)
    if (!isCgpaInRange(cgpaInt, d.classification)) {
      const range = getCgpaRange(d.classification)
      const rangeLabel = range ? `${range.label} ${formatCgpaRange(range)}` : "Unknown"
      errors.push({
        row: rowNumber,
        error: `CGPA ${d.cgpa.toFixed(2)} does not match classification range ${rangeLabel}`,
      })
      return
    }
    const courseHash = hashToField(d.courseName)
    const blindingFactor = randomFieldElement(16)

    const rawCommitment = poseidon([
      nameHash,
      matricHash,
      BigInt(cgpaInt),
      BigInt(d.classification),
      courseHash,
      BigInt(d.graduationYear),
      blindingFactor,
    ])
    const commitment = "0x" + F.toString(rawCommitment, 16).padStart(64, "0")

    const rawNullifier = poseidon([matricHash, institutionKey])
    const nullifier = "0x" + F.toString(rawNullifier, 16).padStart(64, "0")

    const plaintext = JSON.stringify({
      nameHash: nameHash.toString(),
      matricHash: matricHash.toString(),
      cgpa: cgpaInt,
      classification: d.classification,
      courseHash: courseHash.toString(),
      graduationYear: d.graduationYear,
      blindingFactor: blindingFactor.toString(),
    })

    const { encryptedData, encryptedIv, encryptedTag } = encrypt(plaintext)

    credentials.push({
      commitment,
      nullifier,
      encryptedData,
      encryptedIv,
      encryptedTag,
      graduationYear: d.graduationYear,
    })
  })

  const batch = await prisma.$transaction(async (tx) => {
    const batchData: {
      institutionId: string
      status: "FAILED" | "PENDING"
      studentCount: number
      graduationYear: number
      errorReport?: Prisma.InputJsonValue
    } = {
      institutionId,
      status: errors.length > 0 && credentials.length === 0 ? "FAILED" : "PENDING",
      studentCount: credentials.length,
      graduationYear: credentials[0]?.graduationYear ?? new Date().getFullYear(),
    }
    if (errors.length > 0) batchData.errorReport = errors as Prisma.InputJsonValue

    const b = await tx.batch.create({
      data: batchData,
    })

    if (credentials.length > 0) {
      await tx.credential.createMany({
        data: credentials.map((c) => ({
          batchId: b.id,
          institutionId,
          commitment: c.commitment,
          nullifier: c.nullifier,
          encryptedData: c.encryptedData,
          encryptedIv: c.encryptedIv,
          encryptedTag: c.encryptedTag,
          graduationYear: c.graduationYear,
        })),
        skipDuplicates: true,
      })
    }

    return b
  })

  log.info(
    { batchId: batch.id, credentials: credentials.length, errors: errors.length },
    "Batch written to database"
  )

  if (credentials.length === 0) {
    return { batchId: batch.id, credentials: 0, errors: errors.length }
  }

  const bSvc = new BlockchainService()
  let txRef: `0x${string}` | undefined

  try {
    const commitments = credentials.map((c) => c.commitment as `0x${string}`)
    const nullifiers = credentials.map((c) => c.nullifier as `0x${string}`)
    txRef = `0x${createHash("sha256").update(batch.id).digest("hex")}` as `0x${string}`

    const directResult = await bSvc.registerBatch(
      institution.onChainId,
      commitments,
      nullifiers,
      batch.graduationYear,
      batch.degreeTypeCode,
    )
    const txHash = directResult.txHash

    await prisma.batch.update({
      where: { id: batch.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        txHash: txHash,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown blockchain error"
    log.error({ err: error, batchId: batch.id }, "Soroban batch registration failed")

    const details = {
      row: 0,
      error: "Blockchain registration failed: " + message,
      txRef,
    }

    const errorReport = [...errors, details]

    await prisma.batch.update({
      where: { id: batch.id },
      data: {
        status: "FAILED",
        errorReport,
      },
    })
  }

  return { batchId: batch.id, credentials: credentials.length, errors: errors.length }
}

const worker = new Worker<BatchJobData>("batch-processing", processJob, {
  connection: redisConnection,
  concurrency: 2,
})

worker.on("completed", (job, result) => {
  log.info({ jobId: job.id, result }, "Batch job completed")
})

worker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, err: err.message }, "Batch job failed")
})

log.info("Batch processor worker started")
