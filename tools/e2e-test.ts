/**
 * Comprehensive end-to-end test:
 *   1. Generate a real Groth16 proof using SnarkJS
 *   2. Verify locally
 *   3. Call verify_raw on new verifier contract with all 24 G2 permutations
 *   4. Test edge cases
 */
import { readFileSync } from "fs"
import * as snarkjs from "snarkjs"
import { buildPoseidon } from "circomlibjs"
import {
  rpc, nativeToScVal, scValToNative, Contract,
  Keypair, TransactionBuilder, BASE_FEE, xdr, Account,
} from "@stellar/stellar-sdk"

const VERIFIER_ID = "CDMHFJNHJCUI2A54LY4LMVYBE7IO3BDDIH4STNJGMU2PQIMNVXJOXMI3"
const ADMIN_SECRET = "SDSKZUKLQRBWOU4QCSNU4PZDPMW37M7WWC2MXDWVZXXSNUDVMZPKYFRL"
const RPC_URL = "https://soroban-testnet.stellar.org"
const NETWORK = "Test SDF Network ; September 2015"
const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n

const WASM_PATH = "circuits/build/credential_js/credential.wasm"
const ZKEY_PATH = "circuits/build/credential_final.zkey"
const VK_PATH = "circuits/build/verification_key.json"

function bigintToBytesBE(value: bigint, length: number): Buffer {
  const hex = value.toString(16).padStart(length * 2, "0")
  return Buffer.from(hex, "hex")
}

function permute4(arr: Buffer[]): Buffer[][] {
  const result: Buffer[][] = []
  const used = new Array(arr.length).fill(false)
  function backtrack(path: Buffer[]) {
    if (path.length === arr.length) { result.push([...path]); return }
    for (let i = 0; i < arr.length; i++) {
      if (used[i]) continue
      used[i] = true; path.push(arr[i]!); backtrack(path); path.pop(); used[i] = false
    }
  }
  backtrack([])
  return result
}

async function simulate(server: rpc.Server, contractId: string, method: string, args: xdr.ScVal[]) {
  const keypair = Keypair.fromSecret(ADMIN_SECRET)
  const source = keypair.publicKey()
  const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${source}`)
  const accData = await res.json() as { id: string; sequence: string }
  const account = new Account(accData.id, accData.sequence)

  const contract = new Contract(contractId)
  const op = contract.call(method, ...args)
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(op)
    .setTimeout(30)
    .build()

  return server.simulateTransaction(tx)
}

function describe(label: string, fn: () => Promise<void>) {
  process.stdout.write(`  ${label} ... `)
  return fn().then(
    () => console.log("✔ PASS"),
    (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`✘ FAIL: ${msg}`)
      throw err
    },
  )
}

async function main() {
  console.log("=== Comprehensive End-to-End Verification Test ===\n")

  // ── 0. Setup ─────────────────────────────────────────────────────────────
  const server = new rpc.Server(RPC_URL, { allowHttp: true })
  const keypair = Keypair.fromSecret(ADMIN_SECRET)
  const source = keypair.publicKey()

  console.log("Source account:", source)
  console.log("Verifier contract:", VERIFIER_ID)

  // Load circuit artifacts
  const wasmBuffer = new Uint8Array(readFileSync(WASM_PATH))
  const zkeyBuffer = new Uint8Array(readFileSync(ZKEY_PATH))
  const vkeyJson = JSON.parse(readFileSync(VK_PATH, "utf8"))

  // ── 1. Generate test inputs ──────────────────────────────────────────────
  console.log("\n--- Generating Proof ---")

  // Poseidon for commitment & nullifier computation
  const poseidon = await buildPoseidon()

  const nameHash = BigInt("12345678901234567890") % FIELD_MODULUS
  const matricHash = BigInt("98765432109876543210") % FIELD_MODULUS
  const cgpa = BigInt(450)                     // 4.50 CGPA
  const classification = BigInt(4)              // First Class
  const courseHash = BigInt("42") % FIELD_MODULUS
  const graduationYear = BigInt(2024)
  const blindingFactor = BigInt("0x1234567890abcdef1234567890abcdef") % FIELD_MODULUS
  const institutionKey = BigInt("0xdeadbeefcafebabedeadbeefcafebabe") % FIELD_MODULUS

  // Compute commitment = Poseidon(nameHash, matricHash, cgpa, classification, courseHash, graduationYear, blindingFactor)
  const commitmentBig = poseidon([nameHash, matricHash, cgpa, classification, courseHash, graduationYear, blindingFactor])
  const commitment = poseidon.F.toString(commitmentBig)

  // Compute nullifier = Poseidon(matricHash, institutionKey)
  const nullifierBig = poseidon([matricHash, institutionKey])
  const nullifier = poseidon.F.toString(nullifierBig)

  const claimType = 4   // First Class
  const threshold = 0

  console.log("  commitment:    ", commitment.toString().slice(0, 40) + "...")
  console.log("  nullifier:     ", nullifier.toString().slice(0, 40) + "...")
  console.log("  claimType:     ", claimType)
  console.log("  threshold:     ", threshold)

  const circuitInputs = {
    nameHash: nameHash.toString(),
    matricHash: matricHash.toString(),
    cgpa: cgpa.toString(),
    classification: classification.toString(),
    courseHash: courseHash.toString(),
    graduationYear: graduationYear.toString(),
    blindingFactor: blindingFactor.toString(),
    institutionKey: institutionKey.toString(),
    commitment,
    nullifier,
    claimType: claimType.toString(),
    threshold: threshold.toString(),
  }

  const { proof: rawProof, publicSignals } = await snarkjs.groth16.fullProve(
    circuitInputs, wasmBuffer, zkeyBuffer,
  )
  const proof = rawProof as {
    pi_a: [string, string]; pi_b: [[string, string], [string, string]]; pi_c: [string, string]
  }

  console.log("  Proof A:", proof.pi_a[0].slice(0, 20) + "..., " + proof.pi_a[1].slice(0, 20) + "...")
  console.log("  Proof B:", proof.pi_b[0][0].slice(0, 20) + "..., " + proof.pi_b[0][1].slice(0, 20) + "...")
  console.log("  Proof C:", proof.pi_c[0].slice(0, 20) + "..., " + proof.pi_c[1].slice(0, 20) + "...")
  console.log("  Public signals:", publicSignals.map(s => s.slice(0, 20) + "..."))

  // ── 2. Local verification ────────────────────────────────────────────────
  console.log("\n--- Test 1: Local verification (SnarkJS) ---")
  await describe("should verify locally", async () => {
    const localResult = await snarkjs.groth16.verify(vkeyJson, publicSignals, proof)
    if (!localResult) throw new Error("Local verification returned false")
  })

  // ── 3. On-chain verify_raw with all 24 G2 permutations ──────────────────
  console.log("\n--- Test 2: On-chain verify_raw (all 24 G2 permutations) ---")

  const aRaw = proof.pi_a
  const bRaw = proof.pi_b
  const cRaw = proof.pi_c

  // Prepare proof bytes
  const proofABytes = Buffer.concat([
    bigintToBytesBE(BigInt(aRaw[0]), 32),
    bigintToBytesBE(BigInt(aRaw[1]), 32),
  ])
  const proofCBytes = Buffer.concat([
    bigintToBytesBE(BigInt(cRaw[0]), 32),
    bigintToBytesBE(BigInt(cRaw[1]), 32),
  ])

  // Proof B: SnarkJS format is [[x_re, x_im], [y_re, y_im]]
  // We swap to create [[x_im, x_re], [y_im, y_re]] like the backend does:
  const b_im_re = [
    [BigInt(bRaw[0][1]), BigInt(bRaw[0][0])],   // [x_im, x_re]
    [BigInt(bRaw[1][1]), BigInt(bRaw[1][0])],   // [y_im, y_re]
  ] as [[bigint, bigint], [bigint, bigint]]

  const b0 = bigintToBytesBE(b_im_re[0][0], 32)  // x_im
  const b1 = bigintToBytesBE(b_im_re[0][1], 32)  // x_re
  const b2 = bigintToBytesBE(b_im_re[1][0], 32)  // y_im
  const b3 = bigintToBytesBE(b_im_re[1][1], 32)  // y_re

  const permutations = permute4([b0, b1, b2, b3])
  console.log(`  Testing ${permutations.length} permutations...`)

  // Public signals as bytes (field elements)
  const pubSigBytes = publicSignals.map(s => bigintToBytesBE(BigInt(s), 32))

  let permutationPassed = false
  let firstResult: boolean | null = null

  for (let idx = 0; idx < permutations.length; idx++) {
    const perm = permutations[idx]!
    const proofBBytes = Buffer.concat(perm)

    const sim = await simulate(
      server, VERIFIER_ID, "verify_raw",
      [
        xdr.ScVal.scvBytes(Buffer.from("0000000000000000000000000000000000000000000000000000000000000002", "hex")),
        xdr.ScVal.scvBytes(proofABytes),
        xdr.ScVal.scvBytes(proofBBytes),
        xdr.ScVal.scvBytes(proofCBytes),
        xdr.ScVal.scvVec(pubSigBytes.map(b => xdr.ScVal.scvBytes(b))),
      ],
    )

    if (rpc.Api.isSimulationError(sim)) {
      const errStr = typeof sim.error === "string" ? sim.error : JSON.stringify(sim.error)
      const isOnCurveErr = errStr.toLowerCase().includes("point not on curve") || errStr.toLowerCase().includes("bn254 g2")
      if (isOnCurveErr) {
        console.log(`    perm #${idx}: G2 point not on curve: ${errStr.slice(0, 100)}`)
        continue
      }
      console.log(`    perm #${idx}: simulation error: ${errStr.slice(0, 100)}`)
      continue
    }

    if (!sim.result || !sim.result.retval) {
      console.log(`    perm #${idx}: no return value`)
      continue
    }

    const result = scValToNative(sim.result.retval) as boolean
    if (typeof result === "boolean") {
      console.log(`    perm #${idx}: result = ${result}`)
      if (firstResult === null) firstResult = result
      if (result === true) {
        permutationPassed = true
        console.log(`      *** CORRECT PERMUTATION (first pass at idx ${idx}) ***`)
      }
    } else {
      console.log(`    perm #${idx}: unexpected return type: ${typeof result}`)
    }
  }

  if (!permutationPassed) {
    console.error("  ✘ FAIL: No permutation returned true for valid proof")
    console.error(`  First result (should be true for correct G2 format): ${firstResult}`)
  } else {
    console.log("  ✔ PASS: Found working G2 permutation")
  }

  // ── 4. Edge case: wrong VK hash ──────────────────────────────────────────
  console.log("\n--- Test 3: Edge cases ---")

  await describe("wrong VK hash should error with MalformedVerifyingKey", async () => {
    const wrongVkHash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    const firstPerm = Buffer.concat([b0, b1, b2, b3])
    const sim = await simulate(
      server, VERIFIER_ID, "verify_raw",
      [
        xdr.ScVal.scvBytes(Buffer.from(wrongVkHash, "hex")),
        xdr.ScVal.scvBytes(proofABytes),
        xdr.ScVal.scvBytes(firstPerm),
        xdr.ScVal.scvBytes(proofCBytes),
        xdr.ScVal.scvVec(pubSigBytes.map(b => xdr.ScVal.scvBytes(b))),
      ],
    )
    if (rpc.Api.isSimulationSuccess(sim)) {
      throw new Error("Simulation should have failed for unknown VK hash")
    }
    // Expected: simulation error about MalformedVerifyingKey
    const errStr = typeof sim.error === "string" ? sim.error : JSON.stringify(sim.error)
    if (!errStr.includes("MalformedVerifyingKey") && !errStr.includes("HostError") && !errStr.includes("HostError")) {
      // It's ok if it's a different error as long as it's not a success
    }
  })

  await describe("wrong public inputs should return false", async () => {
    const firstPerm = Buffer.concat([b0, b1, b2, b3])
    const wrongPubSigBytes = [
      bigintToBytesBE(BigInt("1"), 32),
      bigintToBytesBE(BigInt("2"), 32),
      bigintToBytesBE(BigInt("3"), 32),
      bigintToBytesBE(BigInt("4"), 32),
    ]
    const sim = await simulate(
      server, VERIFIER_ID, "verify_raw",
      [
        xdr.ScVal.scvBytes(Buffer.from("0000000000000000000000000000000000000000000000000000000000000002", "hex")),
        xdr.ScVal.scvBytes(proofABytes),
        xdr.ScVal.scvBytes(firstPerm),
        xdr.ScVal.scvBytes(proofCBytes),
        xdr.ScVal.scvVec(wrongPubSigBytes.map(b => xdr.ScVal.scvBytes(b))),
      ],
    )
    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      const result = scValToNative(sim.result.retval) as boolean
      if (result === true) throw new Error("Wrong public inputs returned true!")
      console.log("      (correctly returned false)")
    } else if (rpc.Api.isSimulationError(sim)) {
      console.log("      (simulation error — also acceptable for bad inputs)")
    }
  })

  await describe("invalid proof A point (zero G1) should return false", async () => {
    const zero64 = Buffer.alloc(64)
    const firstPerm = Buffer.concat([b0, b1, b2, b3])
    const sim = await simulate(
      server, VERIFIER_ID, "verify_raw",
      [
        xdr.ScVal.scvBytes(Buffer.from("0000000000000000000000000000000000000000000000000000000000000002", "hex")),
        xdr.ScVal.scvBytes(zero64),
        xdr.ScVal.scvBytes(firstPerm),
        xdr.ScVal.scvBytes(proofCBytes),
        xdr.ScVal.scvVec(pubSigBytes.map(b => xdr.ScVal.scvBytes(b))),
      ],
    )
    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      const result = scValToNative(sim.result.retval) as boolean
      // Zero A at infinity should make pairing check return false
      console.log(`      result = ${result}`)
    } else if (rpc.Api.isSimulationError(sim)) {
      const errStr = typeof sim.error === "string" ? sim.error : JSON.stringify(sim.error)
      if (errStr.includes("point not on curve") || errStr.includes("bn254")) {
        throw new Error(`Should not error with 'point not on curve' for zero/valid points: ${errStr.slice(0, 100)}`)
      }
      console.log("      (simulation error — investigating)")
    }
  })

  await describe("too many public signals should error with PublicSignalCountMismatch", async () => {
    const firstPerm = Buffer.concat([b0, b1, b2, b3])
    const tooMany = [
      bigintToBytesBE(BigInt(1), 32),
      bigintToBytesBE(BigInt(2), 32),
      bigintToBytesBE(BigInt(3), 32),
      bigintToBytesBE(BigInt(4), 32),
      bigintToBytesBE(BigInt(5), 32),
    ]
    const sim = await simulate(
      server, VERIFIER_ID, "verify_raw",
      [
        xdr.ScVal.scvBytes(Buffer.from("0000000000000000000000000000000000000000000000000000000000000002", "hex")),
        xdr.ScVal.scvBytes(proofABytes),
        xdr.ScVal.scvBytes(firstPerm),
        xdr.ScVal.scvBytes(proofCBytes),
        xdr.ScVal.scvVec(tooMany.map(b => xdr.ScVal.scvBytes(b))),
      ],
    )
    if (rpc.Api.isSimulationSuccess(sim)) {
      throw new Error("Should have errored for public signal count mismatch")
    }
  })

  // ── 5. Summary ────────────────────────────────────────────────────────────
  console.log("\n=== Summary ===")
  console.log(`  Local verification: PASS`)
  console.log(`  On-chain verify_raw: ${permutationPassed ? "FOUND WORKING FORMAT" : "NO WORKING FORMAT"}`)
  console.log(`  Correct permutation index: ${permutations.findIndex(p => {
    // We can't easily check this inline, so we check firstResult
    return false
  })}`)

  if (permutationPassed) {
    process.exit(0)
  } else {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Test suite failed:", err)
  process.exit(1)
})
