/**
 * Tests for field element utilities used in ZKP commitment/nullifier derivation.
 */

import { describe, expect, it } from "vitest"
import { FIELD_MODULUS, hashToField, hexToField, randomFieldElement } from "../utils/field.js"

describe("FIELD_MODULUS", () => {
  it("is the BN254 scalar field prime", () => {
    // The BN254 (alt_bn128) scalar field prime used by Circom / SnarkJS
    expect(FIELD_MODULUS).toBe(
      21888242871839275222246405745257275088548364400416034343698204186575808495617n
    )
  })
})

describe("hashToField", () => {
  it("returns a bigint less than FIELD_MODULUS", () => {
    const result = hashToField("FUTMinna/2020/CS/001")
    expect(typeof result).toBe("bigint")
    expect(result).toBeGreaterThanOrEqual(0n)
    expect(result).toBeLessThan(FIELD_MODULUS)
  })

  it("is deterministic — same input always gives same output", () => {
    const a = hashToField("matric-number-123")
    const b = hashToField("matric-number-123")
    expect(a).toBe(b)
  })

  it("produces different outputs for different inputs", () => {
    const a = hashToField("student-A")
    const b = hashToField("student-B")
    expect(a).not.toBe(b)
  })

  it("handles empty string without throwing", () => {
    const result = hashToField("")
    expect(typeof result).toBe("bigint")
    expect(result).toBeLessThan(FIELD_MODULUS)
  })
})

describe("hexToField", () => {
  it("converts a 0x-prefixed hex string to a field element", () => {
    const hex = "0x" + "ff".repeat(32) // 256-bit all-ones
    const result = hexToField(hex)
    expect(result).toBeLessThan(FIELD_MODULUS)
  })

  it("handles hex without 0x prefix", () => {
    const hex = "deadbeef"
    const result = hexToField(hex)
    expect(result).toBe(BigInt("0xdeadbeef"))
  })

  it("returns 0n for an empty string", () => {
    expect(hexToField("")).toBe(0n)
  })

  it("reduces values larger than FIELD_MODULUS via mod", () => {
    // A value that is exactly FIELD_MODULUS should reduce to 0
    const modulusHex = FIELD_MODULUS.toString(16)
    expect(hexToField(modulusHex)).toBe(0n)
  })
})

describe("randomFieldElement", () => {
  it("returns a bigint less than FIELD_MODULUS", () => {
    const r = randomFieldElement()
    expect(typeof r).toBe("bigint")
    expect(r).toBeLessThan(FIELD_MODULUS)
  })

  it("produces different values on successive calls (probabilistic)", () => {
    const values = new Set(Array.from({ length: 10 }, () => randomFieldElement()))
    // With 128-bit randomness the probability of any collision is negligible
    expect(values.size).toBe(10)
  })

  it("accepts a custom byte length", () => {
    const r = randomFieldElement(8) // 64-bit
    expect(r).toBeLessThan(FIELD_MODULUS)
  })
})
