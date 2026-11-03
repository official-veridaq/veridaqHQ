import { readFileSync } from "fs"
import * as snarkjs from "snarkjs"
import { buildPoseidon } from "circomlibjs"

const WASM = "circuits/build/credential_js/credential.wasm"
const ZKEY = "circuits/build/credential_final.zkey"
const VKEY = "circuits/build/verification_key.json"
const FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n

async function main() {
  const poseidon = await buildPoseidon()

  const nameHash = 12345678901234567890n % FIELD
  const matricHash = 98765432109876543210n % FIELD
  const cgpa = 450n
  const classification = 4n
  const courseHash = 42n % FIELD
  const graduationYear = 2024n
  const blindingFactor = BigInt("0x1234567890abcdef1234567890abcdef") % FIELD
  const institutionKey = BigInt("0xdeadbeefcafebabedeadbeefcafebabe") % FIELD

  const commitmentBig = poseidon([
    nameHash,
    matricHash,
    cgpa,
    classification,
    courseHash,
    graduationYear,
    blindingFactor,
  ])
  const commitment = poseidon.F.toString(commitmentBig)
  const nullifierBig = poseidon([matricHash, institutionKey])
  const nullifier = poseidon.F.toString(nullifierBig)

  const inputs = {
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
    claimType: "4",
    threshold: "0",
  }

  const wasm = new Uint8Array(readFileSync(WASM))
  const zkey = new Uint8Array(readFileSync(ZKEY))
  const { proof: rawProof, publicSignals } = await snarkjs.groth16.fullProve(inputs, wasm, zkey)

  // Local verification
  const vkey = JSON.parse(readFileSync(VKEY, "utf8"))
  const localOk = await snarkjs.groth16.verify(vkey, publicSignals, rawProof)
  if (!localOk) {
    console.error("LOCAL_VERIFY_FAILED")
    process.exit(1)
  }

  const proof = rawProof
  const a0 = BigInt(proof.pi_a[0]),
    a1 = BigInt(proof.pi_a[1])
  const [x_re, x_im] = [BigInt(proof.pi_b[0][0]), BigInt(proof.pi_b[0][1])]
  const [y_re, y_im] = [BigInt(proof.pi_b[1][0]), BigInt(proof.pi_b[1][1])]
  const c0 = BigInt(proof.pi_c[0]),
    c1 = BigInt(proof.pi_c[1])

  const toHex = (v: bigint, n: number) => v.toString(16).padStart(n * 2, "0")

  const aHex = toHex(a0, 32) + toHex(a1, 32)
  // CAP-74: x_im || x_re || y_im || y_re
  const bHex = toHex(x_im, 32) + toHex(x_re, 32) + toHex(y_im, 32) + toHex(y_re, 32)
  const cHex = toHex(c0, 32) + toHex(c1, 32)
  const pubHex = publicSignals.map((s: string) => toHex(BigInt(s), 32))

  const b0 = toHex(x_im, 32)
  const b1 = toHex(x_re, 32)
  const b2 = toHex(y_im, 32)
  const b3 = toHex(y_re, 32)

  console.log(
    JSON.stringify({
      aHex,
      bHex,
      cHex,
      pubHex,
      components: { b0, b1, b2, b3 },
      localOk,
    })
  )
}

main().catch((e: Error) => {
  console.error(e.message)
  process.exit(1)
})
