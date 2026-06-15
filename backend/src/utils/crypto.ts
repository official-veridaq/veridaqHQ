/**
 * AES-256-GCM encryption and decryption helpers.
 *
 * The encryption key is a 32-byte hex string loaded from the ENCRYPTION_KEY
 * environment variable. It is used to protect the plaintext student credential
 * attributes stored in the database.
 *
 * Each encryption call generates a fresh 12-byte IV to ensure that identical
 * plaintexts produce different ciphertexts.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"
import { config } from "../config/index.js"

const ALGORITHM = "aes-256-gcm"
const KEY = Buffer.from(config.ENCRYPTION_KEY, "hex")

export function encrypt(plaintext: string): {
  encryptedData: string
  encryptedIv:   string
  encryptedTag:  string
} {
  const iv     = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])

  return {
    encryptedData: encrypted.toString("hex"),
    encryptedIv:   iv.toString("hex"),
    encryptedTag:  cipher.getAuthTag().toString("hex"),
  }
}

export function decrypt(
  encryptedData: string,
  encryptedIv:   string,
  encryptedTag:  string
): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(encryptedIv, "hex")
  )

  decipher.setAuthTag(Buffer.from(encryptedTag, "hex"))

  return (
    decipher.update(Buffer.from(encryptedData, "hex"), undefined, "utf8") +
    decipher.final("utf8")
  )
}
