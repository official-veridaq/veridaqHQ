import { buildPoseidon } from "circomlibjs"
import { hexToField } from "../src/utils/field.js"
import { createDecipheriv } from "crypto"

const KEY = Buffer.from("8fc4a34ea583018208afbf4581630e9d1eb6999a6e0715b0ee83126fe1a1cbd3", "hex")
function decrypt(encryptedData: string, encryptedIv: string, encryptedTag: string): string {
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(encryptedIv, "hex"))
  decipher.setAuthTag(Buffer.from(encryptedTag, "hex"))
  return (
    decipher.update(Buffer.from(encryptedData, "hex"), undefined, "utf8") + decipher.final("utf8")
  )
}

async function main() {
  const poseidon = await buildPoseidon()
  const F = poseidon.F

  const institutionKeyHex = decrypt(
    "b43d86cb47cc7d6fca9d1178ba9a2bf035e47a41be187dea1d9752ff9211d6cbbfa0b1a2db3071dfb8da75aac1dbd46a86917dae8920d27c4d9a4b6f37952783",
    "d63a73ed55b28dd9b21958f7",
    "fc1fd587aeaa97bdc6f67dcc5777ca2a"
  )
  const institutionKey = hexToField(institutionKeyHex)
  console.log("institutionKey bigint:", institutionKey.toString())

  const matricHash = 14138555770481240467563626914703615982114597917212125810070897345320162729640n

  const rawNullifier = poseidon([matricHash, institutionKey])
  const computedNullifier = "0x" + F.toString(rawNullifier, 16).padStart(64, "0")
  console.log("Computed:", computedNullifier)
  console.log("Stored:  0x069efee9139bbb52187af93e3248892f268363a6029cc788d95580c2720f2d37")
  console.log(
    "Match:",
    computedNullifier === "0x069efee9139bbb52187af93e3248892f268363a6029cc788d95580c2720f2d37"
  )
}

main().catch(console.error)
