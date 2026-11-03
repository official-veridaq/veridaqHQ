import { readFileSync } from "fs"
import {
  rpc,
  nativeToScVal,
  scValToNative,
  Contract,
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  xdr,
} from "@stellar/stellar-sdk"

const VERIFIER_ID = "CDMHFJNHJCUI2A54LY4LMVYBE7IO3BDDIH4STNJGMU2PQIMNVXJOXMI3"
const RPC_URL = "https://soroban-testnet.stellar.org"
const NETWORK = "Test SDF Network ; September 2015"
const ADMIN_SECRET = "SDSKZUKLQRBWOU4QCSNU4PZDPMW37M7WWC2MXDWVZXXSNUDVMZPKYFRL"

function g1Bytes(x, y) {
  const xHex = BigInt(x).toString(16).padStart(64, "0")
  const yHex = BigInt(y).toString(16).padStart(64, "0")
  return Buffer.concat([Buffer.from(xHex, "hex"), Buffer.from(yHex, "hex")])
}

function g2Bytes(coords) {
  // CAP-74 G2 encoding: x_c1 || x_c0 || y_c1 || y_c0
  // SnarkJS VK format: coords = [[c0, c1], [c0, c1]]
  const x0 = BigInt(coords[0][0]).toString(16).padStart(64, "0") // x_c0 (real)
  const x1 = BigInt(coords[0][1]).toString(16).padStart(64, "0") // x_c1 (imag)
  const y0 = BigInt(coords[1][0]).toString(16).padStart(64, "0") // y_c0 (real)
  const y1 = BigInt(coords[1][1]).toString(16).padStart(64, "0") // y_c1 (imag)
  return Buffer.concat([
    Buffer.from(x1, "hex"),
    Buffer.from(x0, "hex"),
    Buffer.from(y1, "hex"),
    Buffer.from(y0, "hex"),
  ])
}

async function main() {
  const vkJson = JSON.parse(
    readFileSync(process.argv[2] || "circuits/build/verification_key.json", "utf8")
  )

  const alphaBytes = g1Bytes(vkJson.vk_alpha_1[0], vkJson.vk_alpha_1[1])
  const betaBytes = g2Bytes(vkJson.vk_beta_2)
  const gammaBytes = g2Bytes(vkJson.vk_gamma_2)
  const deltaBytes = g2Bytes(vkJson.vk_delta_2)
  const icBytes = vkJson.IC.map((p) => g1Bytes(p[0], p[1]))

  const server = new rpc.Server(RPC_URL, { allowHttp: true })
  const keypair = Keypair.fromSecret(ADMIN_SECRET)
  const source = keypair.publicKey()

  const auth = nativeToScVal(source, { type: "address" })
  const vkHash = xdr.ScVal.scvBytes(
    Buffer.from("0000000000000000000000000000000000000000000000000000000000000002", "hex")
  )

  const vkStruct = xdr.ScVal.scvVec([
    xdr.ScVal.scvBytes(alphaBytes),
    xdr.ScVal.scvBytes(betaBytes),
    xdr.ScVal.scvBytes(gammaBytes),
    xdr.ScVal.scvBytes(deltaBytes),
    xdr.ScVal.scvVec(icBytes.map((b) => xdr.ScVal.scvBytes(b))),
  ])

  const contract = new Contract(VERIFIER_ID)
  const op = contract.call("register_vk", auth, vkHash, vkStruct)

  const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${source}`)
  const accData = (await res.json()) as { id: string; sequence: string }
  const { Account } = await import("@stellar/stellar-sdk")
  const account = new Account(accData.id, accData.sequence)

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(op)
    .setTimeout(30)
    .build()

  const sim = await server.simulateTransaction(tx)
  if (rpc.Api.isSimulationError(sim)) {
    console.error("Simulation failed:", JSON.stringify(sim.error))
    process.exit(1)
  }

  const prepared = rpc.assembleTransaction(tx, sim)
  const builtTx = prepared.build()
  builtTx.sign(keypair)

  const sendResult = await server.sendTransaction(builtTx)
  if (sendResult.status === "ERROR") {
    console.error("Send failed:", JSON.stringify(sendResult.errorResult))
    process.exit(1)
  }

  console.log("Sent tx:", sendResult.hash)

  for (let i = 0; i < 30; i++) {
    const result = await server.getTransaction(sendResult.hash!)
    if (result.status === "SUCCESS") {
      console.log("VK registered successfully!")
      process.exit(0)
    }
    if (result.status === "FAILED") {
      console.error("Transaction FAILED")
      process.exit(1)
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  console.error("Timeout")
  process.exit(1)
}

main()
