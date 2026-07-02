import "dotenv/config"
import { buildPoseidon } from "circomlibjs"
import { PrismaClient } from "@prisma/client"
import { createDecipheriv, randomBytes } from "crypto"
import { createCipheriv } from "crypto"
import { keccak_256 } from "@noble/hashes/sha3.js"
import { BlockchainService } from "../src/services/blockchain.service.js"
import { ProofService } from "../src/services/proof.service.js"

const FIELD_MODULUS = 21888242871839275222246405757245275088548364400416034343698204186575808495617n
const ENCRYPTION_KEY = Buffer.from("8fc4a34ea583018208afbf4581630e9d1eb6999a6e0715b0ee83126fe1a1cbd3", "hex")

function hashToField(value: string): bigint {
  const hash = keccak_256(new TextEncoder().encode(value))
  return BigInt("0x" + Buffer.from(hash).toString("hex")) % FIELD_MODULUS
}

function encrypt(plaintext: string): { data: string; iv: string; tag: string } {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return { data: encrypted.toString("hex"), iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex") }
}

function decrypt(encryptedData: string, encryptedIv: string, encryptedTag: string): string {
  const decipher = createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, Buffer.from(encryptedIv, "hex"))
  decipher.setAuthTag(Buffer.from(encryptedTag, "hex"))
  return decipher.update(Buffer.from(encryptedData, "hex"), undefined, "utf8") + decipher.final("utf8")
}

async function main() {
  const prisma = new PrismaClient()
  const poseidon = await buildPoseidon()
  const F = poseidon.F
  const proofSvc = new ProofService()
  const bcSvc = new BlockchainService()

  // Get the institution and its current key
  const institution = await prisma.institution.findUnique({
    where: { id: "institution-futminna-001" },
  })
  if (!institution) throw new Error("Institution not found")

  const institutionKeyHex = decrypt(
    institution.institutionKeyEncrypted!,
    institution.institutionKeyIv!,
    institution.institutionKeyTag!,
  )
  const institutionKey = BigInt("0x" + institutionKeyHex) % FIELD_MODULUS
  console.log("Institution key loaded:", institutionKey.toString().slice(0, 20) + "...")

  // Create test student data
  const studentName = "Test Student Alpha"
  const matricNumber = "2024/TEST001"
  const cgpa = 450 // 4.50
  const classification = 4 // First Class
  const courseName = "Computer Science"
  const graduationYear = 2026
  const blindingFactor = BigInt("0x" + randomBytes(16).toString("hex"))

  // Compute hashes
  const nameHash = hashToField(studentName)
  const matricHash = hashToField(matricNumber)
  const cgpaInt = cgpa
  const courseHash = hashToField(courseName)

  console.log("Name hash:", nameHash.toString().slice(0, 20) + "...")
  console.log("Matric hash:", matricHash.toString().slice(0, 20) + "...")

  // Compute nullifier and commitment
  const rawNullifier = poseidon([matricHash, institutionKey])
  const nullifier = "0x" + F.toString(rawNullifier, 16).padStart(64, "0")

  const rawCommitment = poseidon([
    nameHash, matricHash, BigInt(cgpaInt), BigInt(classification),
    courseHash, BigInt(graduationYear), blindingFactor,
  ])
  const commitment = "0x" + F.toString(rawCommitment, 16).padStart(64, "0")

  console.log("Nullifier:", nullifier)
  console.log("Commitment:", commitment)

  // Encrypt credential data
  const plaintext = JSON.stringify({
    nameHash: nameHash.toString(),
    matricHash: matricHash.toString(),
    cgpa: cgpaInt,
    classification,
    courseHash: courseHash.toString(),
    graduationYear,
    blindingFactor: blindingFactor.toString(),
  })
  const enc = encrypt(plaintext)

  // Store credential in DB
  // Find an existing batch or create one
  let batch = await prisma.batch.findFirst({ where: { institutionId: institution.id } })
  if (!batch) {
    throw new Error("No batch found — upload a batch first")
  }
  const credential = await prisma.credential.create({
    data: {
      batchId: batch.id,
      institutionId: institution.id,
      commitment,
      nullifier,
      encryptedData: enc.data,
      encryptedIv: enc.iv,
      encryptedTag: enc.tag,
      graduationYear,
      status: "ACTIVE",
    },
  })
  console.log("Credential created:", credential.id)

  // Generate proof
  console.log("Generating proof...")
  const { proof, publicSignals } = await proofSvc.generateProof(
    enc.data,
    enc.iv,
    enc.tag,
    institutionKey.toString(),
    { commitment, nullifier, claimType: 1, threshold: 0 },
  )
  console.log("Proof generated!")

  // Convert to verifyProof format
  const a = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])] as [bigint, bigint]
  const b = [
    [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
    [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
  ] as [[bigint, bigint], [bigint, bigint]]
  const c = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])] as [bigint, bigint]
  const pubArgs: [bigint, bigint, bigint, bigint] = [
    BigInt(publicSignals[0]),
    BigInt(publicSignals[1]),
    BigInt(publicSignals[2]),
    BigInt(publicSignals[3]),
  ]

  // Sanity: check public signals match our inputs
  console.log("Public signals:")
  console.log("  0 (commitment):", publicSignals[0])
  console.log("  1 (nullifier): ", publicSignals[1])
  console.log("  2 (claimType): ", publicSignals[2])
  console.log("  3 (threshold): ", publicSignals[3])
  console.log("  Commitment matches:", "0x" + BigInt(publicSignals[0]).toString(16).padStart(64, "0") === commitment)
  console.log("  Nullifier matches:", "0x" + BigInt(publicSignals[1]).toString(16).padStart(64, "0") === nullifier)

  // Verify locally first
  console.log("Verifying locally...")
  const localOk = await proofSvc.verifyProofLocally(
    proof,
    publicSignals,
    "packages/circuits/build/verification_key.json",
  )
  console.log("Local verification:", localOk)

  if (!localOk) {
    console.error("Local verification failed — proof is invalid or VK mismatch")
    await prisma.$disconnect()
    process.exit(1)
  }

  // On-chain verification with all G2 orderings
  console.log("Calling on-chain verifyProof...")
  const result = await bcSvc.verifyProof(a, b, c, pubArgs)
  console.log("ON-CHAIN VERIFICATION RESULT:", result)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("FAILED:", err)
  process.exit(1)
})
