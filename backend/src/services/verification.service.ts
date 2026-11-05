import { PrismaClient } from "@prisma/client"
import pino from "pino"
import { decrypt } from "../utils/crypto.js"
import { hashToField, hexToField } from "../utils/field.js"
import { config } from "../config/index.js"
import { BlockchainService } from "./blockchain.service.js"
import { ProofService } from "./proof.service.js"

const log = pino({ name: "verification-service" })

type CreateRequestInput = {
  employerId: string
  institutionOnChainId: string
  matricNumber: string
  claimType: number
  threshold: number
  courseName?: string
}

export class VerificationService {
  private proofSvc: ProofService
  private blockchainSvc: BlockchainService

  constructor(
    private prisma: PrismaClient,
    blockchainSvc?: BlockchainService
  ) {
    this.proofSvc = new ProofService()
    this.blockchainSvc = blockchainSvc ?? new BlockchainService()
  }

  private async findCredentialByMatric(institutionId: string, matricNumber: string) {
    const targetMatricHash = hashToField(matricNumber).toString()

    const credentials = await this.prisma.credential.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        commitment: true,
        nullifier: true,
        encryptedData: true,
        encryptedIv: true,
        encryptedTag: true,
        status: true,
      },
    })

    for (const credential of credentials) {
      try {
        const plaintext = decrypt(
          credential.encryptedData,
          credential.encryptedIv,
          credential.encryptedTag
        )
        const attrs = JSON.parse(plaintext) as { matricHash?: string }
        if (attrs.matricHash === targetMatricHash) {
          return credential
        }
      } catch {
        // Skip malformed credential payloads and continue searching.
      }
    }

    return null
  }

  async createRequest(input: CreateRequestInput) {
    const institution = await this.prisma.institution.findUnique({
      where: { onChainId: input.institutionOnChainId },
    })
    if (!institution) {
      return { error: "NOT_FOUND" as const }
    }
    if (!institution.kycApproved) {
      return { error: "INSTITUTION_INACTIVE" as const }
    }

    const employer = await this.prisma.employer.findUnique({
      where: { id: input.employerId },
    })
    if (!employer) return { error: "NOT_FOUND" as const }

    const credential = await this.findCredentialByMatric(institution.id, input.matricNumber)

    if (!credential) return { error: "NOT_FOUND" as const }
    if (credential.status === "REVOKED") return { error: "REVOKED" as const }

    try {
      const revoked = await this.blockchainSvc.isRevoked(credential.nullifier)
      if (revoked) return { error: "REVOKED" as const }
    } catch (err) {
      log.error({ err }, "Failed to check on-chain revocation status")
    }

    const claimDef = await this.prisma.claimDefinition.findFirst({
      where: {
        institutionId: institution.id,
        claimCode: input.claimType,
      },
    })

    const isManual = claimDef ? claimDef.reviewType === "MANUAL" : true

    const request = await this.prisma.verificationRequest.create({
      data: {
        employerId: input.employerId,
        institutionId: institution.id,
        credentialId: credential.id,
        matricNumber: input.matricNumber,
        claimType: input.claimType,
        threshold: input.threshold,
        status: isManual ? "AWAITING_INSTITUTION" : "PROCESSING",
      },
    })

    if (!isManual) {
      if (
        !institution.institutionKeyEncrypted ||
        !institution.institutionKeyIv ||
        !institution.institutionKeyTag
      ) {
        return { error: "INSTITUTION_KEY_MISSING" as const }
      }

      const institutionKeyHex = decrypt(
        institution.institutionKeyEncrypted,
        institution.institutionKeyIv,
        institution.institutionKeyTag
      )
      const institutionKey = hexToField(institutionKeyHex).toString()

      this.runProofGeneration(request.id, credential, institutionKey, input).catch((err) => {
        log.error({ err, requestId: request.id }, "Proof generation failed")
      })
    }

    return { requestId: request.id, status: request.status }
  }

  async runProofGeneration(
    requestId: string,
    credential: {
      id: string
      commitment: string
      nullifier: string
      encryptedData: string
      encryptedIv: string
      encryptedTag: string
    },
    institutionKey: string,
    input: CreateRequestInput
  ) {
    try {
      const { proof, publicSignals } = await this.proofSvc.generateProof(
        credential.encryptedData,
        credential.encryptedIv,
        credential.encryptedTag,
        institutionKey,
        {
          commitment: credential.commitment,
          nullifier: credential.nullifier,
          claimType: input.claimType,
          threshold: input.threshold,
        }
      )

      // Local verification as a sanity check before on-chain call
      const locallyVerified = await this.proofSvc.verifyProofLocally(
        proof,
        publicSignals,
        config.VERIFICATION_KEY_PATH
      )
      if (!locallyVerified) {
        throw new Error("Local proof verification failed — proof is invalid or VK mismatch")
      }
      log.info("Local proof verification passed — proceeding to on-chain verification")

      const a = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])] as [bigint, bigint]
      const b = [
        [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
        [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
      ] as [[bigint, bigint], [bigint, bigint]]
      const c = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])] as [bigint, bigint]

      if (publicSignals.length !== 4) {
        throw new Error(`Expected 4 public signals, got ${publicSignals.length}`)
      }

      const [signal0, signal1, signal2, signal3] = publicSignals
      if (!signal0 || !signal1 || !signal2 || !signal3) {
        throw new Error("Missing public signals for verifier")
      }

      const pubArgs: [bigint, bigint, bigint, bigint] = [
        BigInt(signal0),
        BigInt(signal1),
        BigInt(signal2),
        BigInt(signal3),
      ]

      const isVerifiedOnChain = await this.blockchainSvc.verifyProof(a, b, c, pubArgs)
      if (!isVerifiedOnChain) throw new Error("On-chain verification returned false")

      await this.prisma.verificationRequest.update({
        where: { id: requestId },
        data: {
          status: "COMPLETED",
          result: "VERIFIED",
          proofJson: JSON.stringify({ proof, publicSignals }),
          completedAt: new Date(),
        },
      })
    } catch (err) {
      log.error({ err, requestId }, "Proof generation or on-chain verification failed")
      await this.prisma.verificationRequest.update({
        where: { id: requestId },
        data: {
          status: "FAILED",
          result: "CLAIM_NOT_SATISFIED",
          completedAt: new Date(),
        },
      })
    }
  }

  async getRequest(requestId: string, employerId: string) {
    return this.prisma.verificationRequest.findFirst({
      where: { id: requestId, employerId },
      select: {
        id: true,
        status: true,
        result: true,
        claimType: true,
        threshold: true,
        createdAt: true,
        completedAt: true,
        institution: {
          select: {
            name: true,
            active: true,
            deactivatedAt: true,
            deactivationReason: true,
          },
        },
      },
    })
  }

  async getHistory(employerId: string, page: number, limit: number) {
    const skip = (page - 1) * limit
    const total = await this.prisma.verificationRequest.count({ where: { employerId } })
    const items = await this.prisma.verificationRequest.findMany({
      where: { employerId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        status: true,
        result: true,
        claimType: true,
        createdAt: true,
        completedAt: true,
        institution: {
          select: {
            name: true,
            onChainId: true,
            active: true,
            deactivatedAt: true,
            deactivationReason: true,
          },
        },
      },
    })
    return { total, page, limit, items }
  }

  async getActiveInstitutions() {
    const insts = await this.prisma.institution.findMany({
      where: { active: true, kycApproved: true },
      select: {
        id: true,
        onChainId: true,
        name: true,
        tier: true,
        claims: {
          where: { active: true },
          select: { id: true, label: true, claimCode: true, threshold: true },
        },
      },
    })
    return insts
  }
}
