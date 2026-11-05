/**
 * Registers the Groth16 VK on the verifier contract using register_vk_raw.
 * Run from workspace root:
 *   ADMIN_SECRET="$(grep PLATFORM_ADMIN_SECRET_KEY .env | cut -d= -f2)" npx tsx tools/register-vk-raw.ts
 *
 * Uses CAP-74/EIP-197 byte encoding for G2 points.
 */
import { readFileSync, createHash } from "crypto"
import { execSync } from "child_process"

const VERIFIER_ID = "CDV5XY4N3E7NPEVHK7ZARVOYQJ4VF3VCYPR7NRX64JMGO74GHY54ZA24"

function g1Hex(x: string, y: string): string {
  return BigInt(x).toString(16).padStart(64, "0") + BigInt(y).toString(16).padStart(64, "0")
}

function g2Hex(coords: string[][]): string {
  // SnarkJS G2 format: [[x_re, x_im], [y_re, y_im], [1, 0]]
  // CAP-74/EIP-197 format: x_c1 || x_c0 || y_c1 || y_c0 = x_im || x_re || y_im || y_re
  return (
    BigInt(coords[0][1]).toString(16).padStart(64, "0") +
    BigInt(coords[0][0]).toString(16).padStart(64, "0") +
    BigInt(coords[1][1]).toString(16).padStart(64, "0") +
    BigInt(coords[1][0]).toString(16).padStart(64, "0")
  )
}

function main() {
  const vkPath = process.argv[2] || "circuits/build/verification_key.json"
  const vkJson = JSON.parse(readFileSync(vkPath, "utf8"))

  const alpha = g1Hex(vkJson.vk_alpha_1[0], vkJson.vk_alpha_1[1])
  const beta = g2Hex(vkJson.vk_beta_2)
  const gamma = g2Hex(vkJson.vk_gamma_2)
  const delta = g2Hex(vkJson.vk_delta_2)
  const ic = vkJson.IC.map((p: string[]) => g1Hex(p[0], p[1]))

  // Compute VK hash: keccak256 of the file contents
  const vkJsonStr = readFileSync(vkPath, "utf8")
  const vkHash = createHash("sha256").update(vkJsonStr).digest("hex")

  console.log("VK hash:", vkHash)
  console.log("Alpha:", alpha)
  console.log("Beta:", beta.slice(0, 64) + "...")
  console.log("Gamma:", gamma.slice(0, 64) + "...")
  console.log("Delta:", delta.slice(0, 64) + "...")
  console.log("IC count:", ic.length)

  const lines = [
    "#!/usr/bin/env bash",
    `VERIFIER_ID="${VERIFIER_ID}"`,
    `ADMIN_KEY="$(stellar keys address veridaq-admin)"`,
    "",
    `stellar contract invoke \\`,
    `  --id "$VERIFIER_ID" \\`,
    `  --source-account veridaq-admin \\`,
    `  --rpc-url https://soroban-testnet.stellar.org \\`,
    `  --network-passphrase "Test SDF Network ; September 2015" \\`,
    `  -- register_vk_raw \\`,
    `  --caller "$ADMIN_KEY" \\`,
    `  --vk_hash "${vkHash}" \\`,
    `  --alpha "${alpha}" \\`,
    `  --beta "${beta}" \\`,
    `  --gamma "${gamma}" \\`,
    `  --delta "${delta}" \\`,
    `  --ic '${JSON.stringify(ic)}'`,
  ]

  const fname = "/tmp/register-vk-cmd.sh"
  require("fs").writeFileSync(fname, lines.join("\n"), "utf8")
  execSync(`chmod +x "${fname}"`, { stdio: "inherit" })
  execSync(fname, { stdio: "inherit" })
}

main()
