const { readFileSync } = require("fs")
const snarkjs = require("snarkjs")
const { buildPoseidon } = require("circomlibjs")

const WASM = "circuits/build/credential_js/credential.wasm"
const ZKEY = "circuits/build/credential_final.zkey"
const VKEY = "circuits/build/verification_key.json"
const FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n

async function main() {
  const poseidon = await buildPoseidon()

  const nameHash = 12345678901234567890n % FIELD
  const matricHash = 98765432109876543210n % FIELD
  const cgpa = 450n
  const classification = 4n // First Class
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
  const b00 = BigInt(proof.pi_b[0][0]),
    b01 = BigInt(proof.pi_b[0][1]) // [[x_re, x_im], [y_re, y_im]]
  const b10 = BigInt(proof.pi_b[1][0]),
    b11 = BigInt(proof.pi_b[1][1])
  const c0 = BigInt(proof.pi_c[0]),
    c1 = BigInt(proof.pi_c[1])

  function toHex(v, n) {
    return v.toString(16).padStart(n * 2, "0")
  }

  const aHex = toHex(a0, 32) + toHex(a1, 32)
  // CAP-74: x_im || x_re || y_im || y_re = b01 || b00 || b11 || b10
  const bHex = toHex(b01, 32) + toHex(b00, 32) + toHex(b11, 32) + toHex(b10, 32)
  const cHex = toHex(c0, 32) + toHex(c1, 32)
  const pubHex = publicSignals.map((s) => toHex(BigInt(s), 32))

  // B components for permutation testing
  const b0 = toHex(b01, 32) // x_im (c1)
  const b1 = toHex(b00, 32) // x_re (c0)
  const b2 = toHex(b11, 32) // y_im (c1)
  const b3 = toHex(b10, 32) // y_re (c0)

  // SnarkJS raw format (unswapped) for reference
  const bRawHex = toHex(b00, 32) + toHex(b01, 32) + toHex(b10, 32) + toHex(b11, 32)

  console.log(
    JSON.stringify({
      aHex,
      bHex,
      cHex,
      pubHex,
      components: { b0, b1, b2, b3 },
      localOk,
      srcProof: {
        pi_a: [proof.pi_a[0], proof.pi_a[1]],
        pi_b: [
          [proof.pi_b[0][0], proof.pi_b[0][1]],
          [proof.pi_b[1][0], proof.pi_b[1][1]],
        ],
        pi_c: [proof.pi_c[0], proof.pi_c[1]],
      },
      publicSignals,
      bFormats: {
        snarkjsRaw: bRawHex, // x_re||x_im||y_re||y_im
        cap74: bHex, // x_im||x_re||y_im||y_re
      },
    })
  )
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
