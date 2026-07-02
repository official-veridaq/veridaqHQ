import { readFileSync } from "fs"

const vk = JSON.parse(readFileSync(process.argv[2] || "circuits/build/verification_key.json", "utf8"))

function g1Hex(x, y) {
  return BigInt(x).toString(16).padStart(64, "0") + BigInt(y).toString(16).padStart(64, "0")
}

function g2Hex(coords) {
  const x0 = BigInt(coords[0][0]).toString(16).padStart(64, "0")
  const x1 = BigInt(coords[0][1]).toString(16).padStart(64, "0")
  const y0 = BigInt(coords[1][0]).toString(16).padStart(64, "0")
  const y1 = BigInt(coords[1][1]).toString(16).padStart(64, "0")
  return x0 + x1 + y0 + y1
}

const alpha = g1Hex(vk.vk_alpha_1[0], vk.vk_alpha_1[1])
const beta = g2Hex(vk.vk_beta_2)
const gamma = g2Hex(vk.vk_gamma_2)
const delta = g2Hex(vk.vk_delta_2)
const ic = vk.IC.map(p => g1Hex(p[0], p[1]))

const vkJson = JSON.stringify({
  alpha,
  beta,
  gamma,
  delta,
  ic,
})

console.log(vkJson)
