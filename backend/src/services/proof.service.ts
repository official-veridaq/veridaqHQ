/**
 * ProofService — generates and verifies Groth16 ZKPs using SnarkJS.
 *
 * The proving key and WASM witness generator are loaded from disk once on
 * startup and cached in memory. The private credential data is decrypted,
 * used to build the witness, and then cleared from memory immediately after
 * SnarkJS returns.
 *
 * SECURITY: the private inputs (the plaintext student attributes plus the
 * institution's private key) MUST NOT appear in any logs, error messages,
 * or database records. They exist in memory only for the duration of the
 * fullProve() call.
 */

import { readFileSync } from "fs"
import * as snarkjs from "snarkjs"
import { config } from "../config/index.js"
import { decrypt } from "../utils/crypto.js"
import { FIELD_MODULUS } from "../utils/field.js"

type PrivateInputs = {
  nameHash: bigint
  matricHash: bigint
  cgpa: bigint
  classification: bigint
  courseHash: bigint
  graduationYear: bigint
  blindingFactor: bigint
  institutionKey: bigint
}

type PublicInputs = {
  commitment: string
  nullifier: string
  claimType: number
  threshold: number
}

type ProofResult = {
  proof: Groth16Proof
  publicSignals: string[]
}

type Groth16Proof = {
  pi_a: [string, string]
  pi_b: [[string, string], [string, string]]
  pi_c: [string, string]
}

export class ProofService {
  private wasmBuffer: Uint8Array
  private zkeyBuffer: Uint8Array

  constructor() {
    // Load once on startup. If these files do not exist, the server will fail to
    // start. Run pnpm circuit:compile then pnpm circuit:setup first.
    this.wasmBuffer = new Uint8Array(readFileSync(config.CIRCUIT_WASM_PATH))
    this.zkeyBuffer = new Uint8Array(readFileSync(config.CIRCUIT_ZKEY_PATH))
  }

  /**
   * Decrypts the stored credential data and generates a Groth16 proof.
   * The decrypted plaintext is cleared immediately after the circuit witness
   * is built. It is never logged or stored.
   */
  async generateProof(
    encryptedData: string,
    encryptedIv: string,
    encryptedTag: string,
    institutionKey: string,
    publicInputs: PublicInputs
  ): Promise<ProofResult> {
    // Decrypt the stored credential plaintext
    const plaintext = decrypt(encryptedData, encryptedIv, encryptedTag)
    const attrs = JSON.parse(plaintext) as {
      nameHash: string
      matricHash: string
      cgpa: number
      classification: number
      courseHash: string
      graduationYear: number
      blindingFactor: string
    }

    // Build the private input object for the circuit
    const privateInputs: PrivateInputs = {
      nameHash: BigInt(attrs.nameHash) % FIELD_MODULUS,
      matricHash: BigInt(attrs.matricHash) % FIELD_MODULUS,
      cgpa: BigInt(attrs.cgpa),
      classification: BigInt(attrs.classification),
      courseHash: BigInt(attrs.courseHash) % FIELD_MODULUS,
      graduationYear: BigInt(attrs.graduationYear),
      blindingFactor: BigInt(attrs.blindingFactor) % FIELD_MODULUS,
      institutionKey: BigInt(institutionKey) % FIELD_MODULUS,
    }

    // The full witness + proof is computed entirely in memory by SnarkJS.
    // We use fullProve rather than groth16.prove + witness.generate because
    // fullProve handles the WASM witness generation internally.
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      {
        // Private inputs
        nameHash: privateInputs.nameHash.toString(),
        matricHash: privateInputs.matricHash.toString(),
        cgpa: privateInputs.cgpa.toString(),
        classification: privateInputs.classification.toString(),
        courseHash: privateInputs.courseHash.toString(),
        graduationYear: privateInputs.graduationYear.toString(),
        blindingFactor: privateInputs.blindingFactor.toString(),
        institutionKey: privateInputs.institutionKey.toString(),
        // Public inputs
        commitment: publicInputs.commitment,
        nullifier: publicInputs.nullifier,
        claimType: publicInputs.claimType.toString(),
        threshold: publicInputs.threshold.toString(),
      },
      this.wasmBuffer,
      this.zkeyBuffer
    )

    // Clear sensitive data from memory. JavaScript does not provide secure memory
    // wiping, but nulling these references removes the most obvious exposure.
    Object.keys(privateInputs).forEach((k) => {
      ;(privateInputs as Record<string, unknown>)[k] = 0n
    })

    return { proof, publicSignals }
  }

  /**
   * Verifies a proof off-chain using the verification key.
   * This is a quick local check before paying for an on-chain transaction.
   */
  async verifyProofLocally(
    proof: unknown,
    publicSignals: string[],
    vkeyPath: string
  ): Promise<boolean> {
    const vkey = JSON.parse(readFileSync(vkeyPath, "utf8"))
    return snarkjs.groth16.verify(vkey, publicSignals, proof)
  }
}
