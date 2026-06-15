/**
 * BlockchainService — Soroban contract interactions for VERIDAQ.
 *
 * All methods use @stellar/stellar-sdk to communicate with Soroban RPC.
 * The PLATFORM_ADMIN_SECRET_KEY is used for signing all write operations.
 *
 * Read-only methods use simulation (no fee, no signature).
 * Write methods use prepare → assemble → sign → send → poll.
 *
 * Every method returns plain objects so callers never touch xdr.ScVal directly.
 */

import {
  rpc,
  nativeToScVal,
  scValToNative,
  Contract,
  Keypair,
  TransactionBuilder,
  Transaction,
  BASE_FEE,
  xdr,
} from "@stellar/stellar-sdk"
import { config } from "../config/index.js"
import pino from "pino"

const log = pino({ name: "blockchain-service" })

const POLL_INTERVAL_MS = 1000
const POLL_MAX_ATTEMPTS = 60

function hexToBytes(hex: string): Buffer {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex
  return Buffer.from(clean, "hex")
}

function padHexToBytes(hex: string, bytes: number): Buffer {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex
  return Buffer.from(clean.padStart(bytes * 2, "0"), "hex")
}

function bigintToBytesBE(value: bigint, length: number): Buffer {
  const hex = value.toString(16).padStart(length * 2, "0")
  return Buffer.from(hex, "hex")
}

function scvBytes32(hex: string): xdr.ScVal {
  return xdr.ScVal.scvBytes(padHexToBytes(hex, 32))
}

function scvU32(val: number): xdr.ScVal {
  return nativeToScVal(val, { type: "u32" })
}

function scvU64(val: number): xdr.ScVal {
  return nativeToScVal(val, { type: "u64" })
}

function scvAddress(addr: string): xdr.ScVal {
  return nativeToScVal(addr, { type: "address" })
}

function scvI128(val: bigint | number): xdr.ScVal {
  return nativeToScVal(BigInt(val), { type: "i128" })
}

function scvVec(items: xdr.ScVal[]): xdr.ScVal {
  return xdr.ScVal.scvVec(items)
}

export class BlockchainService {
  private server: rpc.Server
  private keypair: Keypair
  private source: string

  constructor() {
    const secretKey = config.PLATFORM_ADMIN_SECRET_KEY
    if (!secretKey) {
      throw new Error("PLATFORM_ADMIN_SECRET_KEY is not set")
    }
    this.keypair = Keypair.fromSecret(secretKey)
    this.source = this.keypair.publicKey()
    this.server = new rpc.Server(config.STELLAR_RPC_URL, { allowHttp: true })
  }

  // ── Generic helpers ───────────────────────────────────────────────────────

  private async getAccount() {
    return this.server.getAccount(this.source)
  }

  private async buildTx(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
  ) {
    const contract = new Contract(contractId)
    const op = contract.call(method, ...args)
    const account = await this.getAccount()
    return new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: config.STELLAR_NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(30)
      .build()
  }

  private async simulate(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
  ) {
    const tx = await this.buildTx(contractId, method, args)
    return this.server.simulateTransaction(tx)
  }

  private async read<T>(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<T> {
    const sim = await this.simulate(contractId, method, args)
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(
        `Soroban simulation error for ${method}: ${JSON.stringify(sim.error)}`,
      )
    }
    if (!sim.result || !sim.result.retval) {
      throw new Error(
        `Soroban simulation returned no result for ${method}`,
      )
    }
    return scValToNative(sim.result.retval) as T
  }

  private async write(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<string> {
    const tx = await this.buildTx(contractId, method, args)
    const sim = await this.server.simulateTransaction(tx)
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(
        `Soroban simulation error for ${method}: ${JSON.stringify(sim.error)}`,
      )
    }

    const preparedBuilder = rpc.assembleTransaction(tx, sim)
    const builtTx = preparedBuilder.build()
    const sig = this.keypair.signDecorated(builtTx.signatureBase())
    const envelope = builtTx.toEnvelope()
    envelope.v1().signatures().push(sig)
    const signedTx = new Transaction(envelope, config.STELLAR_NETWORK_PASSPHRASE)

    const sendResult = await this.server.sendTransaction(signedTx)
    if (sendResult.status === "ERROR") {
      const errMsg = sendResult.errorResult
        ? JSON.stringify(sendResult.errorResult)
        : "Unknown send error"
      throw new Error(`Soroban send error for ${method}: ${errMsg}`)
    }
    if (!sendResult.hash) {
      throw new Error(`Soroban send returned no hash for ${method}`)
    }

    const txHash = sendResult.hash
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      const txResult = await this.server.getTransaction(txHash)
      if (txResult.status === "SUCCESS") {
        return txHash
      }
      if (txResult.status === "FAILED") {
        throw new Error(
          `Soroban transaction FAILED for ${method}: ${txHash}`,
        )
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    }

    throw new Error(
      `Soroban transaction timeout for ${method}: ${txHash}`,
    )
  }

  private async writeWithResult<T>(
    contractId: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<{ txHash: string; result: T }> {
    const tx = await this.buildTx(contractId, method, args)
    const sim = await this.server.simulateTransaction(tx)
    if (rpc.Api.isSimulationError(sim)) {
      throw new Error(
        `Soroban simulation error for ${method}: ${JSON.stringify(sim.error)}`,
      )
    }

    const preparedBuilder = rpc.assembleTransaction(tx, sim)
    const builtTx = preparedBuilder.build()
    const sig = this.keypair.signDecorated(builtTx.signatureBase())
    const envelope = builtTx.toEnvelope()
    envelope.v1().signatures().push(sig)
    const signedTx = new Transaction(envelope, config.STELLAR_NETWORK_PASSPHRASE)

    const sendResult = await this.server.sendTransaction(signedTx)
    if (sendResult.status === "ERROR") {
      const errMsg = sendResult.errorResult
        ? JSON.stringify(sendResult.errorResult)
        : "Unknown send error"
      throw new Error(`Soroban send error for ${method}: ${errMsg}`)
    }
    if (!sendResult.hash) {
      throw new Error(`Soroban send returned no hash for ${method}`)
    }

    const txHash = sendResult.hash
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      const txResult = await this.server.getTransaction(txHash)
      if (txResult.status === "SUCCESS") {
        const returnVal = (txResult as rpc.Api.GetSuccessfulTransactionResponse).returnValue
        const result = returnVal
          ? (scValToNative(returnVal) as T)
          : (null as T)
        return { txHash, result }
      }
      if (txResult.status === "FAILED") {
        throw new Error(
          `Soroban transaction FAILED for ${method}: ${txHash}`,
        )
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    }

    throw new Error(
      `Soroban transaction timeout for ${method}: ${txHash}`,
    )
  }

  // ── Institution Registry ──────────────────────────────────────────────────

  async registerInstitution(
    institutionId: string,
    name: string,
    adminWallet: string,
  ): Promise<string> {
    return this.write(
      config.INSTITUTION_REGISTRY_ID!,
      "register",
      [
        scvAddress(this.source),
        scvBytes32(institutionId),
        nativeToScVal(name, { type: "string" }),
        scvAddress(adminWallet),
      ],
    )
  }

  async isInstitutionRegistered(institutionId: string): Promise<boolean> {
    return this.read<boolean>(
      config.INSTITUTION_REGISTRY_ID!,
      "is_active",
      [scvBytes32(institutionId)],
    )
  }

  // ── Veridaq Core — Credentials ────────────────────────────────────────────

  async registerBatch(
    institutionId: string,
    commitments: string[],
    nullifiers: string[],
    graduationYear: number,
    degreeTypeCode: number,
    _txRef?: string,
  ): Promise<{ txHash: string }> {
    if (commitments.length !== nullifiers.length) {
      throw new Error("Commitments and nullifiers length mismatch")
    }

    const commitScVals = commitments.map((c) => scvBytes32(c))
    const nullifierScVals = nullifiers.map((n) => scvBytes32(n))

    const txHash = await this.write(
      config.CREDENTIAL_REGISTRY_ID!,
      "register_batch",
      [
        scvAddress(this.source),
        scvBytes32(institutionId),
        scvVec(commitScVals),
        scvVec(nullifierScVals),
        scvU32(graduationYear),
        scvU32(degreeTypeCode),
      ],
    )
    return { txHash }
  }

  async commitmentExists(_commitment: string): Promise<boolean> {
    throw new Error(
      "commitmentExists is not supported on Soroban — use nullifierExists instead",
    )
  }

  async nullifierExists(nullifier: string): Promise<boolean> {
    return this.read<boolean>(
      config.CREDENTIAL_REGISTRY_ID!,
      "exists",
      [scvBytes32(nullifier)],
    )
  }

  async getCredentialRecord(nullifier: string): Promise<{
    commitment: string
    nullifier: string
    institution_id: string
    graduation_year: number
    degree_type_code: number
    registered_at: number
  }> {
    const raw = await this.read<{
      commitment: Uint8Array
      nullifier: Uint8Array
      institution_id: Uint8Array
      graduation_year: number
      degree_type_code: number
      registered_at: number
    }>(config.CREDENTIAL_REGISTRY_ID!, "get_record", [
      scvBytes32(nullifier),
    ])

    return {
      commitment: "0x" + Buffer.from(raw.commitment).toString("hex"),
      nullifier: "0x" + Buffer.from(raw.nullifier).toString("hex"),
      institution_id:
        "0x" + Buffer.from(raw.institution_id).toString("hex"),
      graduation_year: raw.graduation_year,
      degree_type_code: raw.degree_type_code,
      registered_at: raw.registered_at,
    }
  }

  // ── Veridaq Core — Revocation ─────────────────────────────────────────────

  async revokeCredential(
    nullifier: string,
    reasonCode: number,
  ): Promise<string> {
    return this.write(
      config.REVOCATION_REGISTRY_ID!,
      "revoke",
      [
        scvAddress(this.source),
        scvBytes32(nullifier),
        scvU32(reasonCode),
      ],
    )
  }

  async isRevoked(nullifier: string): Promise<boolean> {
    return this.read<boolean>(
      config.REVOCATION_REGISTRY_ID!,
      "is_revoked",
      [scvBytes32(nullifier)],
    )
  }

  // ── Veridaq Core — Employers ──────────────────────────────────────────────

  async initialiseEmployer(employerAddress: string): Promise<string> {
    return this.write(
      config.CREDENTIAL_REGISTRY_ID!,
      "init_employer",
      [
        scvAddress(this.source),
        scvAddress(employerAddress),
      ],
    )
  }

  async getEmployer(
    employerAddress: string,
  ): Promise<{ free_remaining: number; total: number } | null> {
    return this.read<{ free_remaining: number; total: number } | null>(
      config.CREDENTIAL_REGISTRY_ID!,
      "get_employer",
      [scvAddress(employerAddress)],
    )
  }

  async isEmployerInitialised(employerAddress: string): Promise<boolean> {
    const emp = await this.getEmployer(employerAddress)
    return emp !== null
  }

  async getRemainingFreeVerifications(
    employerAddress: string,
  ): Promise<number> {
    const emp = await this.getEmployer(employerAddress)
    return emp?.free_remaining ?? 0
  }

  // ── Veridaq Core — Verification ───────────────────────────────────────────

  async requestVerification(
    institutionId: string,
    nullifier: string,
    claimType: number,
    threshold: number,
    proofA: string,
    proofB: string,
    proofC: string,
    sigCommitment: string,
    sigNullifier: string,
    sigClaimType: string,
    sigThreshold: string,
  ): Promise<{ txHash: string; verified: boolean }> {
    const scvBytes = (hex: string): xdr.ScVal =>
      xdr.ScVal.scvBytes(hexToBytes(hex))

    const { txHash, result } = await this.writeWithResult<boolean>(
      config.CREDENTIAL_REGISTRY_ID!,
      "request_verification",
      [
        scvAddress(this.source),
        scvBytes32(institutionId),
        scvBytes32(nullifier),
        scvU32(claimType),
        scvU64(threshold),
        scvBytes(proofA),
        scvBytes(proofB),
        scvBytes(proofC),
        scvBytes32(sigCommitment),
        scvBytes32(sigNullifier),
        scvBytes32(sigClaimType),
        scvBytes32(sigThreshold),
      ],
    )

    return { txHash, verified: result ?? false }
  }

  // ── Groth16 Verifier — raw proof check (read only) ────────────────────────

  async verifyProof(
    a: [bigint, bigint],
    b: [[bigint, bigint], [bigint, bigint]],
    c: [bigint, bigint],
    publicInputs: [bigint, bigint, bigint, bigint],
  ): Promise<boolean> {
    const proofABytes = Buffer.concat([
      bigintToBytesBE(a[0], 32),
      bigintToBytesBE(a[1], 32),
    ])
    const proofBBytes = Buffer.concat([
      bigintToBytesBE(b[0][0], 32),
      bigintToBytesBE(b[0][1], 32),
      bigintToBytesBE(b[1][0], 32),
      bigintToBytesBE(b[1][1], 32),
    ])
    const proofCBytes = Buffer.concat([
      bigintToBytesBE(c[0], 32),
      bigintToBytesBE(c[1], 32),
    ])

    const publicSignalBytes = publicInputs.map((pi) =>
      xdr.ScVal.scvBytes(bigintToBytesBE(pi, 32)),
    )

    const sim = await this.simulate(
      config.ZK_VERIFIER_ID!,
      "verify_raw",
      [
        scvBytes32("0x" + "0".repeat(64)),
        xdr.ScVal.scvBytes(proofABytes),
        xdr.ScVal.scvBytes(proofBBytes),
        xdr.ScVal.scvBytes(proofCBytes),
        scvVec(publicSignalBytes),
      ],
    )

    if (!rpc.Api.isSimulationSuccess(sim)) {
      return false
    }

    if (!sim.result || !sim.result.retval) {
      return false
    }

    const raw = scValToNative(sim.result.retval)
    if (typeof raw === "boolean") return raw
    return false
  }

  // ── XLM balance ───────────────────────────────────────────────────────────

  async getBalance(address: string): Promise<bigint> {
    try {
      const url = new URL(config.STELLAR_RPC_URL)
      const horizonUrl = `${url.protocol}//horizon${url.hostname.replace(/^[^.]*/, "")}`
      const response = await fetch(`${horizonUrl}/accounts/${address}`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!response.ok) return 0n
      const data = await response.json() as { balances?: { asset_type: string; balance: string }[] }
      const native = data.balances?.find((b) => b.asset_type === "native")
      const amount = native?.balance ?? "0"
      const [whole, fraction = ""] = amount.split(".")
      const padded = fraction.padEnd(7, "0")
      return BigInt(whole + padded)
    } catch {
      return 0n
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  static uuidToBytes32(uuid: string): string {
    return "0x" + uuid.replace(/-/g, "").padStart(64, "0")
  }
}
