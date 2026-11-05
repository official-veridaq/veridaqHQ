import { readFileSync } from "fs"
import {
  rpc,
  nativeToScVal,
  scValToNative,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  Keypair,
  xdr,
} from "@stellar/stellar-sdk"

const RPC_URL = "https://soroban-testnet.stellar.org"
const NETWORK = "Test SDF Network ; September 2015"
const VERIFIER_ID = "CDV5XY4N3E7NPEVHK7ZARVOYQJ4VF3VCYPR7NRX64JMGO74GHY54ZA24"
const ADMIN_SECRET = process.env.ADMIN_SECRET!
const VK_HASH_HEX = "af5344e4fd29508aecb2e8e04569dba315866142a350394408aa026e760c694a"

function g1Bytes(x: string, y: string): Buffer {
  return Buffer.concat([
    Buffer.from(BigInt(x).toString(16).padStart(64, "0"), "hex"),
    Buffer.from(BigInt(y).toString(16).padStart(64, "0"), "hex"),
  ])
}

function g2Bytes(coords: string[][]): Buffer {
  const xImBuf = Buffer.from(BigInt(coords[0][1]).toString(16).padStart(64, "0"), "hex")
  const xReBuf = Buffer.from(BigInt(coords[0][0]).toString(16).padStart(64, "0"), "hex")
  const yImBuf = Buffer.from(BigInt(coords[1][1]).toString(16).padStart(64, "0"), "hex")
  const yReBuf = Buffer.from(BigInt(coords[1][0]).toString(16).padStart(64, "0"), "hex")
  return Buffer.concat([xImBuf, xReBuf, yImBuf, yReBuf])
}

async function main() {
  const vkJson = JSON.parse(
    readFileSync(process.argv[2] || "circuits/build/verification_key.json", "utf8")
  )
  const alpha = g1Bytes(vkJson.vk_alpha_1[0], vkJson.vk_alpha_1[1])
  const beta = g2Bytes(vkJson.vk_beta_2)
  const gamma = g2Bytes(vkJson.vk_gamma_2)
  const delta = g2Bytes(vkJson.vk_delta_2)
  const ic = vkJson.IC.map((p: string[]) => g1Bytes(p[0], p[1]))

  console.log("Alpha:", alpha.toString("hex"))
  console.log("Beta:", beta.toString("hex").slice(0, 64) + "...")
  console.log("IC count:", ic.length)

  const keypair = Keypair.fromSecret(ADMIN_SECRET)
  const source = keypair.publicKey()

  const auth = nativeToScVal(source, { type: "address" })
  const vkHash = xdr.ScVal.scvBytes(Buffer.from(VK_HASH_HEX, "hex"))

  const contract = new Contract(VERIFIER_ID)

  // Get account via Horizon (RpcServer.getAccount may fail)
  const horizonRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${source}`)
  const accData = (await horizonRes.json()) as { id: string; sequence: string }
  const account = new Account(accData.id, accData.sequence)

  const server = new rpc.Server(RPC_URL, { allowHttp: true })

  // Step 1: Simulate register_vk_raw
  console.log("\n=== Simulating register_vk_raw ===")
  const tx1 = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(
      contract.call(
        "register_vk_raw",
        auth,
        vkHash,
        xdr.ScVal.scvBytes(alpha),
        xdr.ScVal.scvBytes(beta),
        xdr.ScVal.scvBytes(gamma),
        xdr.ScVal.scvBytes(delta),
        xdr.ScVal.scvVec(ic.map((b) => xdr.ScVal.scvBytes(b)))
      )
    )
    .setTimeout(30)
    .build()

  const sim1 = await server.simulateTransaction(tx1)
  if (rpc.Api.isSimulationError(sim1)) {
    console.error("Simulation FAILED:", sim1.error)
    if (sim1.events) console.error("Events:", JSON.stringify(sim1.events, null, 2))
    process.exit(1)
  }
  console.log("Simulation OK")

  // Step 2: Send transaction
  console.log("\n=== Sending transaction ===")
  const prep1 = rpc.assembleTransaction(tx1, sim1)
  prep1.sign(keypair)
  const send1 = await server.sendTransaction(prep1)
  console.log("Tx hash:", send1.hash)
  if (send1.status === "ERROR") {
    console.error("Send FAILED:", JSON.stringify(send1.errorResult))
    process.exit(1)
  }

  // Step 3: Poll
  for (let i = 0; i < 30; i++) {
    const r = await server.getTransaction(send1.hash!)
    if (r.status === "SUCCESS") {
      console.log("VK registered!")
      break
    }
    if (r.status === "FAILED") {
      console.error("Tx FAILED:", JSON.stringify(r))
      process.exit(1)
    }
    await new Promise((r) => setTimeout(r, 1000))
  }

  // Step 4: Test verify_raw with all-zero proof
  console.log("\n=== Testing verify_raw with all-zero proof ===")
  const Z64 = Buffer.alloc(64)
  const Z128 = Buffer.alloc(128)
  const Z32 = Buffer.alloc(32)

  // Re-fetch account with updated sequence
  const horizonRes2 = await fetch(`https://horizon-testnet.stellar.org/accounts/${source}`)
  const accData2 = (await horizonRes2.json()) as { id: string; sequence: string }
  const account2 = new Account(accData2.id, accData2.sequence)

  const tx2 = new TransactionBuilder(account2, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(
      contract.call(
        "verify_raw",
        vkHash,
        xdr.ScVal.scvBytes(Z64),
        xdr.ScVal.scvBytes(Z128),
        xdr.ScVal.scvBytes(Z64),
        xdr.ScVal.scvVec([Z32, Z32, Z32, Z32].map((b) => xdr.ScVal.scvBytes(b)))
      )
    )
    .setTimeout(30)
    .build()

  const sim2 = await server.simulateTransaction(tx2)
  if (rpc.Api.isSimulationError(sim2)) {
    console.error("verify_raw FAILED:", sim2.error)
    if (sim2.events) console.error("Events:", JSON.stringify(sim2.events, null, 2))
  } else if (rpc.Api.isSimulationSuccess(sim2)) {
    const r = sim2.result?.retval ? scValToNative(sim2.result.retval) : null
    console.log("verify_raw result:", r)
  } else {
    console.error("Unexpected:", JSON.stringify(sim2).slice(0, 200))
  }
}

main().catch(console.error)
