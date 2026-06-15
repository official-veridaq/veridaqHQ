/**
 * Tests for AES-256-GCM encrypt/decrypt utilities.
 * These run without a database — pure unit tests.
 */

import { describe, expect, it } from "vitest"
import { decrypt, encrypt } from "../utils/crypto.js"

describe("encrypt / decrypt", () => {
  it("round-trips a short string", () => {
    const plaintext = "hello world"
    const { encryptedData, encryptedIv, encryptedTag } = encrypt(plaintext)
    const result = decrypt(encryptedData, encryptedIv, encryptedTag)
    expect(result).toBe(plaintext)
  })

  it("round-trips a JSON payload", () => {
    const payload = JSON.stringify({
      nameHash: "12345678901234567890",
      matricHash: "98765432109876543210",
      cgpa: 420,
      classification: 3,
      courseHash: "11111111111111111111",
      graduationYear: 2023,
      blindingFactor: "99999999999999999999",
    })
    const { encryptedData, encryptedIv, encryptedTag } = encrypt(payload)
    const result = decrypt(encryptedData, encryptedIv, encryptedTag)
    expect(JSON.parse(result)).toEqual(JSON.parse(payload))
  })

  it("produces different ciphertexts for the same plaintext (fresh IV each call)", () => {
    const plaintext = "same input"
    const first = encrypt(plaintext)
    const second = encrypt(plaintext)
    // IVs must differ
    expect(first.encryptedIv).not.toBe(second.encryptedIv)
    // Ciphertexts must differ because the IV is different
    expect(first.encryptedData).not.toBe(second.encryptedData)
    // But both must decrypt to the same value
    expect(decrypt(first.encryptedData, first.encryptedIv, first.encryptedTag)).toBe(plaintext)
    expect(decrypt(second.encryptedData, second.encryptedIv, second.encryptedTag)).toBe(plaintext)
  })

  it("throws when the auth tag is tampered", () => {
    const { encryptedData, encryptedIv } = encrypt("sensitive data")
    const badTag = "00".repeat(16) // 16 zero bytes — wrong tag
    expect(() => decrypt(encryptedData, encryptedIv, badTag)).toThrow()
  })

  it("throws when the ciphertext is tampered", () => {
    const { encryptedData, encryptedIv, encryptedTag } = encrypt("sensitive data")
    // Flip the first byte of the ciphertext
    const tampered =
      (parseInt(encryptedData.slice(0, 2), 16) ^ 0xff).toString(16).padStart(2, "0") +
      encryptedData.slice(2)
    expect(() => decrypt(tampered, encryptedIv, encryptedTag)).toThrow()
  })

  it("round-trips an empty string", () => {
    const { encryptedData, encryptedIv, encryptedTag } = encrypt("")
    expect(decrypt(encryptedData, encryptedIv, encryptedTag)).toBe("")
  })

  it("round-trips a unicode string", () => {
    const plaintext = "Ünïcödé tëxt 🎓"
    const { encryptedData, encryptedIv, encryptedTag } = encrypt(plaintext)
    expect(decrypt(encryptedData, encryptedIv, encryptedTag)).toBe(plaintext)
  })
})
