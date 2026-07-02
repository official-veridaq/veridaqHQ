import { readFileSync } from "fs"
import { execSync } from "child_process"

const VERIFIER_ID = "CDMHFJNHJCUI2A54LY4LMVYBE7IO3BDDIH4STNJGMU2PQIMNVXJOXMI3"
const ADMIN_SECRET = "SDSKZUKLQRBWOU4QCSNU4PZDPMW37M7WWC2MXDWVZXXSNUDVMZPKYFRL"

function g1Hex(x: string, y: string): string {
  return BigInt(x).toString(16).padStart(64, "0") + BigInt(y).toString(16).padStart(64, "0")
}

function g2Hex(coords: string[][]): string {
  // CAP-74: x_c1 || x_c0 || y_c1 || y_c0
  const x0 = coords[0][0], x1 = coords[0][1]
  const y0 = coords[1][0], y1 = coords[1][1]
  return (
    BigInt(x1).toString(16).padStart(64, "0") +
    BigInt(x0).toString(16).padStart(64, "0") +
    BigInt(y1).toString(16).padStart(64, "0") +
    BigInt(y0).toString(16).padStart(64, "0")
  )
}

function main() {
  const vkJson = JSON.parse(
    readFileSync(process.argv[2] || "packages/circuits/build/verification_key.json", "utf8"),
  )

  const alpha = g1Hex(vkJson.vk_alpha_1[0], vkJson.vk_alpha_1[1])
  const beta = g2Hex(vkJson.vk_beta_2)
  const gamma = g2Hex(vkJson.vk_gamma_2)
  const delta = g2Hex(vkJson.vk_delta_2)
  const ic = vkJson.IC.map((p: string[]) => g1Hex(p[0], p[1]))

  const fname = "/tmp/register-vk-cmd.sh"
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
    `  --vk_hash 0000000000000000000000000000000000000000000000000000000000000002 \\`,
    `  --alpha "${alpha}" \\`,
    `  --beta "${beta}" \\`,
    `  --gamma "${gamma}" \\`,
    `  --delta "${delta}" \\`,
    `  --ic '${JSON.stringify(ic)}'`,
  ]

  console.log(lines.join("\n"))

  // Write and execute
  require("fs").writeFileSync(fname, lines.join("\n"), "utf8")
  execSync(`chmod +x "${fname}"`, { stdio: "inherit" })
  execSync(fname, { stdio: "inherit" })
}

main()
