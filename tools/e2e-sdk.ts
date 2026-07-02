import { readFileSync } from "fs"
import * as snarkjs from "snarkjs"
import { buildPoseidon } from "circomlibjs"
import { rpc, scValToNative, Contract, Keypair, TransactionBuilder, BASE_FEE, xdr, Account } from "@stellar/stellar-sdk"

const VERIFIER_ID = "CDMHFJNHJCUI2A54LY4LMVYBE7IO3BDDIH4STNJGMU2PQIMNVXJOXMI3"
const ADMIN_SECRET = "SDSKZUKLQRBWOU4QCSNU4PZDPMW37M7WWC2MXDWVZXXSNUDVMZPKYFRL"
const RPC_URL = "https://soroban-testnet.stellar.org"
const NETWORK = "Test SDF Network ; September 2015"
const FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n

const WASM = "circuits/build/credential_js/credential.wasm"
const ZKEY = "circuits/build/credential_final.zkey"
const VKEY = "circuits/build/verification_key.json"

function toBytesBE(v: bigint, n: number): Buffer {
  return Buffer.from(v.toString(16).padStart(n * 2, "0"), "hex")
}

function permute4(arr: Buffer[]): Buffer[][] {
  const r: Buffer[][] = []
  const used = new Array(arr.length).fill(false)
  function bt(path: Buffer[]) {
    if (path.length === arr.length) { r.push([...path]); return }
    for (let i = 0; i < arr.length; i++) {
      if (used[i]) continue
      used[i] = true; path.push(arr[i]!); bt(path); path.pop(); used[i] = false
    }
  }
  bt([])
  return r
}

async function main() {
  console.log("=== SDK-based E2E Test ===\n")

  // Setup
  const server = new rpc.Server(RPC_URL, { allowHttp: true })
  const keypair = Keypair.fromSecret(ADMIN_SECRET)
  const source = keypair.publicKey()
  const horizonRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${source}`)
  const horizonData = await horizonRes.json() as { id: string; sequence: string }
  const account = new Account(horizonData.id, horizonData.sequence)

  // Generate proof
  console.log("Generating proof...")
  const poseidon = await buildPoseidon()
  const nameHash = 12345678901234567890n % FIELD
  const matricHash = 98765432109876543210n % FIELD
  const cgpa = 450n
  const classification = 4n
  const courseHash = 42n % FIELD
  const graduationYear = 2024n
  const blindingFactor = BigInt("0x1234567890abcdef1234567890abcdef") % FIELD
  const institutionKey = BigInt("0xdeadbeefcafebabedeadbeefcafebabe") % FIELD

  const commitmentBig = poseidon([nameHash, matricHash, cgpa, classification, courseHash, graduationYear, blindingFactor])
  const commitment = poseidon.F.toString(commitmentBig)
  const nullifierBig = poseidon([matricHash, institutionKey])
  const nullifier = poseidon.F.toString(nullifierBig)

  const inputs = {
    nameHash: nameHash.toString(), matricHash: matricHash.toString(),
    cgpa: cgpa.toString(), classification: classification.toString(),
    courseHash: courseHash.toString(), graduationYear: graduationYear.toString(),
    blindingFactor: blindingFactor.toString(), institutionKey: institutionKey.toString(),
    commitment, nullifier, claimType: "4", threshold: "0",
  }

  const wasm = new Uint8Array(readFileSync(WASM))
  const zkey = new Uint8Array(readFileSync(ZKEY))
  const { proof: rawProof, publicSignals } = await snarkjs.groth16.fullProve(inputs, wasm, zkey)

  const vkey = JSON.parse(readFileSync(VKEY, "utf8"))
  const localOk = await snarkjs.groth16.verify(vkey, publicSignals, rawProof)
  console.log(`Local verification: ${localOk ? "PASS" : "FAIL"}`)
  if (!localOk) process.exit(1)

  const proof = rawProof
  const a = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])] as [bigint, bigint]
  const b = [[BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])], [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])]] as [[bigint, bigint], [bigint, bigint]]
  const c = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])] as [bigint, bigint]
  const pubs = publicSignals.map(s => BigInt(s)) as [bigint, bigint, bigint, bigint]

  const aBytes = Buffer.concat([toBytesBE(a[0], 32), toBytesBE(a[1], 32)])
  const b0 = toBytesBE(b[0][0], 32)
  const b1 = toBytesBE(b[0][1], 32)
  const b2 = toBytesBE(b[1][0], 32)
  const b3 = toBytesBE(b[1][1], 32)
  const cBytes = Buffer.concat([toBytesBE(c[0], 32), toBytesBE(c[1], 32)])
  const pubBytes = pubs.map(p => toBytesBE(p, 32))

  console.log("A:", aBytes.toString("hex").slice(0, 32) + "...")
  console.log("B: x_im||x_re||y_im||y_re (CAP-74)")
  console.log("C:", cBytes.toString("hex").slice(0, 32) + "...")
  console.log("Pubs:", pubBytes.map(b => "0x" + b.toString("hex").slice(0, 16) + "...").join(", "))
  console.log()

  // Test all permutations
  const perms = permute4([b0, b1, b2, b3])

  const simulate = async (bPerm: Buffer): Promise<boolean | null | string> => {
    const contract = new Contract(VERIFIER_ID)
    const args = [
      xdr.ScVal.scvBytes(Buffer.from("0000000000000000000000000000000000000000000000000000000000000002", "hex")),
      xdr.ScVal.scvBytes(aBytes),
      xdr.ScVal.scvBytes(bPerm),
      xdr.ScVal.scvBytes(cBytes),
      xdr.ScVal.scvVec(pubBytes.map(b => xdr.ScVal.scvBytes(b))),
    ]
    const op = contract.call("verify_raw", ...args)
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK })
      .addOperation(op).setTimeout(30).build()
    const sim = await server.simulateTransaction(tx)

    if (rpc.Api.isSimulationError(sim)) {
      const errStr = typeof sim.error === "string" ? sim.error : JSON.stringify(sim.error)
      if (errStr.includes("point not on curve") || errStr.includes("bn254")) {
        return "POINT_NOT_ON_CURVE"
      }
      if (errStr.includes("MalformedVerifyingKey")) return "MALFORMED_VK"
      if (errStr.includes("PublicSignalCountMismatch")) return "SIGNAL_MISMATCH"
      return `ERROR: ${errStr.slice(0, 100)}`
    }
    if (!sim.result?.retval) return "NO_RESULT"
    const val = scValToNative(sim.result.retval)
    return typeof val === "boolean" ? val : `UNEXPECTED: ${val}`
  }

  console.log("Testing all 24 G2 permutations...")
  for (let i = 0; i < perms.length; i++) {
    const bPerm = Buffer.concat(perms[i]!)
    const result = await simulate(bPerm)
    const label = result === true ? "TRUE ✔" : result === false ? "false" : String(result).slice(0, 40)
    console.log(`  perm #${i} [${perms[i]!.map(b => b.toString("hex").slice(0, 8)).join(",")}]: ${label}`)
    if (result === true) console.log("    *** FOUND CORRECT PERMUTATION ***")
  }

  // Edge cases
  console.log("\nEdge cases:")
  const bFirst = Buffer.concat(perms[0]!)

  console.log(`  Wrong VK hash: ${await simulate(Buffer.alloc(128))}`)
  
  // Wrong public signals
  const wrongPubBytes = pubBytes.map(() => toBytesBE(1n, 32))
  const contract = new Contract(VERIFIER_ID)
  const wrongPubArgs = [
    xdr.ScVal.scvBytes(Buffer.from("0000000000000000000000000000000000000000000000000000000000000002", "hex")),
    xdr.ScVal.scvBytes(aBytes),
    xdr.ScVal.scvBytes(bFirst),
    xdr.ScVal.scvBytes(cBytes),
    xdr.ScVal.scvVec(wrongPubBytes.map(b => xdr.ScVal.scvBytes(b))),
  ]
  const wrongOp = contract.call("verify_raw", ...wrongPubArgs)
  const wrongTx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(wrongOp).setTimeout(30).build()
  const wrongSim = await server.simulateTransaction(wrongTx)
  if (rpc.Api.isSimulationSuccess(wrongSim) && wrongSim.result?.retval) {
    console.log(`  Wrong pubs: ${scValToNative(wrongSim.result.retval)}`)
  } else {
    console.log(`  Wrong pubs: error simulation`)
  }

  console.log("\nDone!")
}

main().catch(e => console.error("FAILED:", e))
