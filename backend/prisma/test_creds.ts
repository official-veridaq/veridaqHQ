import { PrismaClient } from "@prisma/client"
import { createDecipheriv } from "crypto"

const KEY = Buffer.from("8fc4a34ea583018208afbf4581630e9d1eb6999a6e0715b0ee83126fe1a1cbd3", "hex")

function decrypt(encryptedData: string, encryptedIv: string, encryptedTag: string): string {
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(encryptedIv, "hex"))
  decipher.setAuthTag(Buffer.from(encryptedTag, "hex"))
  return decipher.update(Buffer.from(encryptedData, "hex"), undefined, "utf8") + decipher.final("utf8")
}

const prisma = new PrismaClient()

async function main() {
  const credentials = await prisma.credential.findMany({
    where: { institutionId: "institution-futminna-001" },
    orderBy: { createdAt: "desc" },
  })

  for (const cred of credentials) {
    try {
      const plaintext = decrypt(cred.encryptedData, cred.encryptedIv, cred.encryptedTag)
      const attrs = JSON.parse(plaintext) as Record<string, unknown>
      console.log("Credential:", cred.id)
      console.log("  commitment:", cred.commitment)
      console.log("  nullifier:", cred.nullifier)
      console.log("  attrs:", JSON.stringify(attrs, null, 2))
      console.log("---")
    } catch (e) {
      console.log("FAILED:", cred.id, e)
    }
  }

  await prisma.$disconnect()
}

main()
