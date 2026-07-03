import { readFileSync } from "fs"
import * as snarkjs from "snarkjs"
import { rpc, xdr, nativeToScVal, scValToNative, Contract, TransactionBuilder, BASE_FEE, Keypair } from "@stellar/stellar-sdk"

const RPC_URL = "https://soroban-testnet.stellar.org"
const NETWORK = "Test SDF Network ; September 2015"
const VERIFIER_ID = "CDV5XY4N3E7NPEVHK7ZARVOYQJ4VF3VCYPR7NRX64JMGO74GHY54ZA24"
const VK_HASH = "af5344e4fd29508aecb2e8e04569dba315866142a350394408aa026e760c694a"

function bigintToBytesBE(value: bigint, length: number): Buffer {
  const hex = value.toString(16).padStart(length * 2, "0")
  return Buffer.from(hex, "hex")
}

function permute4(arr: Buffer[]): Buffer[][] {
  const result: Buffer[][] = []
  const used = new Array(arr.length).fill(false)
  function backtrack(path: Buffer[]) {
    if (path.length === arr.length) {
      result.push([...path])
      return
    }
    for (let i = 0; i < arr.length; i++) {
      if (used[i]) continue
      used[i] = true
      path.push(arr[i])
      backtrack(path)
      path.pop()
      used[i] = false
    }
  }
  backtrack([])
  return result
}

async function main() {
  // Generate a test proof
  const wasmPath = process.argv[2] || "packages/circuits/build/credential_js/credential.wasm"
  const zkeyPath = process.argv[3] || "packages/circuits/build/credential_final.zkey"
  const vkPath = process.argv[4] || "packages/circuits/build/verification_key.json"

  const wasmBuffer = new Uint8Array(readFileSync(wasmPath))
  const zkeyBuffer = new Uint8Array(readFileSync(zkeyPath))
  const vkey = JSON.parse(readFileSync(vkPath, "utf8"))

  // Generate a proof with minimal inputs
  const { proof, publicSignals } = await snarkjs.groth16.fullProve({
    nameHash: "12345",
    matricHash: "67890",
    cgpa: "4",
    classification: "1",
    courseHash: "11111",
    graduationYear: "2025",
    blindingFactor: "99999",
    institutionKey: "123456789",
    commitment: "0x0000000000000000000000000000000000000000000000000000000000000001",
    nullifier: "0x0000000000000000000000000000000000000000000000000000000000000002",
    claimType: "1",
    threshold: "50",
  }, wasmBuffer, zkeyBuffer)

  console.log("=== Proof generated ===")
  console.log("pi_a:", proof.pi_a)
  console.log("pi_b:", JSON.stringify(proof.pi_b))
  console.log("pi_c:", proof.pi_c)
  console.log("publicSignals:", publicSignals)

  // Verify locally first
  const localOk = await snarkjs.groth16.verify(vkey, publicSignals, proof)
  console.log("\nLocal verification:", localOk ? "PASSED" : "FAILED")

  if (!localOk) {
    console.error("Local verification failed — not proceeding to on-chain")
    process.exit(1)
  }

  // Encode proof bytes as done in blockchain.service.ts
  const a: [bigint, bigint] = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])]

  // verification.service.ts swap:
  const b: [[bigint, bigint], [bigint, bigint]] = [
    [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
    [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
  ]
  const c: [bigint, bigint] = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])]

  const proofABytes = Buffer.concat([
    bigintToBytesBE(a[0], 32),
    bigintToBytesBE(a[1], 32),
  ])
  const proofCBytes = Buffer.concat([
    bigintToBytesBE(c[0], 32),
    bigintToBytesBE(c[1], 32),
  ])

  const b0 = bigintToBytesBE(b[0][0], 32) // x_im / x_c1
  const b1 = bigintToBytesBE(b[0][1], 32) // x_re / x_c0
  const b2 = bigintToBytesBE(b[1][0], 32) // y_im / y_c1
  const b3 = bigintToBytesBE(b[1][1], 32) // y_re / y_c0

  // Log all component bytes
  console.log("\n=== Proof bytes ===")
  console.log("A (G1):", proofABytes.toString("hex"))
  console.log("C (G1):", proofCBytes.toString("hex"))
  console.log("B components:")
  console.log("  b0 (x_im/x_c1):", b0.toString("hex"))
  console.log("  b1 (x_re/x_c0):", b1.toString("hex"))
  console.log("  b2 (y_im/y_c1):", b2.toString("hex"))
  console.log("  b3 (y_re/y_c0):", b3.toString("hex"))

  const allPerms = permute4([b0, b1, b2, b3])

  // Connect to Soroban RPC
  const server = new rpc.Server(RPC_URL, { allowHttp: true })

  // Get the VK from the contract first
  console.log("\n=== Checking VK on-chain ===")
  try {
    const vkHashBytes = xdr.ScVal.scvBytes(Buffer.from(VK_HASH, "hex"))
    const simResult = await server.simulateTransaction(
      new TransactionBuilder(
        await server.getAccount("GD73PRZI62RFIBJ47KM2SVIGMUA5EDZB7VM2FKXQGZBMQCHVZL6MHFPQ"),
        { fee: "100", networkPassphrase: NETWORK }
      )
        .addOperation(
          new Contract(VERIFIER_ID).call("is_vk_registered", vkHashBytes)
        )
        .setTimeout(30)
        .build()
    )
    if (!rpc.Api.isSimulationSuccess(simResult)) {
      console.error("is_vk_registered simulation failed:", JSON.stringify(simResult))
    } else {
      const raw = simResult.result?.retval ? scValToNative(simResult.result.retval) : null
      console.log("is_vk_registered:", raw)
    }
  } catch (e) {
    console.error("Error checking VK:", e)
  }

  // Test each permutation
  console.log(`\n=== Testing ${allPerms.length} G2 permutations ===`)
  const pubArgs = publicSignals.map((s: string) => bigintToBytesBE(BigInt(s), 32))

  for (let i = 0; i < allPerms.length; i++) {
    const perm = allPerms[i]
    const proofBBytes = Buffer.concat(perm)

    // Describe this permutation
    const names = ["x_im", "x_re", "y_im", "y_re"]
    const permNames = perm.map((_, idx) => {
      const origIdx = [b0, b1, b2, b3].indexOf(perm[idx])
      return names[origIdx]
    })
    console.log(`\nPermutation ${i}: [${permNames.join(", ")}]`)
    console.log(`  B bytes: ${proofBBytes.toString("hex").slice(0, 64)}...`)

    try {
      const simResult = await server.simulateTransaction(
        new TransactionBuilder(
          await server.getAccount("GD73PRZI62RFIBJ47KM2SVIGMUA5EDZB7VM2FKXQGZBMQCHVZL6MHFPQ"),
          { fee: "100", networkPassphrase: NETWORK }
        )
          .addOperation(
            new Contract(VERIFIER_ID).call(
              "verify_raw",
              xdr.ScVal.scvBytes(Buffer.from(VK_HASH, "hex")),
              xdr.ScVal.scvBytes(proofABytes),
              xdr.ScVal.scvBytes(proofBBytes),
              xdr.ScVal.scvBytes(proofCBytes),
              xdr.ScVal.scvVec(
                pubArgs.map((b: Buffer) => xdr.ScVal.scvBytes(b))
              )
            )
          )
          .setTimeout(30)
          .build()
      )

      if (rpc.Api.isSimulationSuccess(simResult)) {
        const result = simResult.result?.retval ? scValToNative(simResult.result.retval) : null
        console.log(`  ✅ SUCCESS — result: ${result}`)
        if (result === true) {
          console.log("\n🎉 VERIFICATION PASSED with permutation", i)
          process.exit(0)
        }
      } else if (rpc.Api.isSimulationError(simResult)) {
        console.log(`  ❌ ERROR: ${JSON.stringify(simResult.error).slice(0, 200)}`)
        if (simResult.events?.length) {
          console.log(`  Events: ${JSON.stringify(simResult.events).slice(0, 200)}`)
        }
      } else {
        console.log(`  ❌ UNKNOWN FAILURE: ${JSON.stringify(simResult).slice(0, 200)}`)
      }
    } catch (e) {
      console.log(`  ❌ EXCEPTION: ${e}`)
    }
  }

  console.log("\n❌ All permutations failed")
}

main().catch(console.error)
