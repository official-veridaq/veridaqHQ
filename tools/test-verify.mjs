import { readFileSync } from "fs"
import snarkjs from "snarkjs"

// Load circuit
const wasm = readFileSync("circuits/build/credential_js/credential.wasm")
const zkey = readFileSync("circuits/build/credential_final.zkey")

// Use actual values from the batch processor for a sample credential
// Student: FUT/19/001, John Doe, CGPA 4.52, First Class (4), Computer Science, 2024
const nameHash = "0x" + Buffer.from("John Doe").toString("hex")
const matricHash = "0x" + Buffer.from("FUT/19/001").toString("hex")
const cgpa = Math.round(4.52 * 100).toString() // 452
const classification = "4"
const courseHash = "0x" + Buffer.from("Computer Science").toString("hex")
const graduationYear = "2024"
const blindingFactor = "1234567890123456"
const institutionKey = "0xdeadbeef"

// Compute poseidon to get commitment
import { buildPoseidon } from "circomlibjs"
const poseidon = await buildPoseidon()
const F = poseidon.F

const nameF = F.e(nameHash)
const matricF = F.e(matricHash)
const cgpaF = F.e(cgpa)
const classF = F.e(classification)
const courseF = F.e(courseHash)
const yearF = F.e(graduationYear)
const blindF = F.e(blindingFactor)

const rawCommitment = poseidon([nameF, matricF, cgpaF, classF, courseF, yearF, blindF])
const commitment = "0x" + F.toString(rawCommitment, 16).padStart(64, "0")
console.log("Computed commitment:", commitment)

const keyF = F.e(institutionKey)
const rawNullifier = poseidon([matricF, keyF])
const nullifier = "0x" + F.toString(rawNullifier, 16).padStart(64, "0")
console.log("Computed nullifier:", nullifier)

// Generate proof
const { proof, publicSignals } = await snarkjs.groth16.fullProve({
  nameHash: F.toString(nameF),
  matricHash: F.toString(matricF),
  cgpa: cgpa,
  classification: classification,
  courseHash: F.toString(courseF),
  graduationYear: graduationYear,
  blindingFactor: blindingFactor,
  institutionKey: F.toString(keyF),
  commitment: commitment,
  nullifier: nullifier,
  claimType: "1",
  threshold: "3",
}, wasm, zkey)

console.log("Proof generated successfully")
console.log("Public signals:", publicSignals)
console.log("pi_a:", proof.pi_a.map(x => x.toString().slice(0, 20)))
console.log("pi_b:", proof.pi_b.map(x => x.map(y => y.toString().slice(0, 20))))
console.log("pi_c:", proof.pi_c.map(x => x.toString().slice(0, 20)))

// Verify locally
const vk = JSON.parse(readFileSync("circuits/build/verification_key.json", "utf8"))
const localOk = await snarkjs.groth16.verify(vk, publicSignals, proof)
console.log("Local verification:", localOk ? "OK" : "FAILED")
