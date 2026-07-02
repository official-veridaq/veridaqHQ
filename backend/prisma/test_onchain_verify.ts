import "dotenv/config"
import { BlockchainService } from "../src/services/blockchain.service.js"
import { ProofService } from "../src/services/proof.service.js"
import { hexToField } from "../src/utils/field.js"
import { createDecipheriv } from "crypto"

const KEY = Buffer.from("8fc4a34ea583018208afbf4581630e9d1eb6999a6e0715b0ee83126fe1a1cbd3", "hex")
function decrypt(encryptedData: string, encryptedIv: string, encryptedTag: string): string {
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(encryptedIv, "hex"))
  decipher.setAuthTag(Buffer.from(encryptedTag, "hex"))
  return decipher.update(Buffer.from(encryptedData, "hex"), undefined, "utf8") + decipher.final("utf8")
}

async function main() {
  const proofSvc = new ProofService()
  const bcSvc = new BlockchainService()

  // Institution key from DB — same flow as verification.service.ts
  const institutionKeyHex = decrypt(
    "b43d86cb47cc7d6fca9d1178ba9a2bf035e47a41be187dea1d9752ff9211d6cbbfa0b1a2db3071dfb8da75aac1dbd46a86917dae8920d27c4d9a4b6f37952783",
    "d63a73ed55b28dd9b21958f7",
    "fc1fd587aeaa97bdc6f67dcc5777ca2a",
  )
  const institutionKey = hexToField(institutionKeyHex).toString()

  // Credential 1 from DB
  const cred = {
    encryptedData: "3a8e3540e7bbc097b4a0d83787fc42e3063cff3b01df73af3078ddd3494ee29965661822f729e3873a4ae95e4b3acfc3c5bfc1e28058fc796e8afa99a4374a0387c8e0fff80c570b8ab25ed8306121af18f95e54b531b0046c7b0ed8c78b9302658c31adf6b889fabea13dda3633a436d3e34185073b15df1d5bc2b49afbea1c99833726528f8f1db0f745002e5ddd3b344bb29f25a4c4864e87c0b701bcc83cfa59dbd8b5aef354690e018a39e8d245c778300e3175006c0d4e4f6e2deb1bdfd97a6da10d32b41599b853034fa6e2f20e425973a068cce3d04d709611ecd2b30202a00b57f75e447d07d649216b9c5935aba924e78abe4454d590f2f03e9ad7df639af4e16a7b7bb85e9d2f5ecbc1384c3183e513f6da4fcb37da248473a18d47155e27831a444d91cb97ff9428618676d65421deb12da2240f19a6dd82b51ff85d271511721ebbdb1a438b881bb19eb905d068ede13c95e04daa229f8e0292c54feebac175d8db2ae785c070408b61b8130b8c519b0263de9d02b653c3c70a193731",
    encryptedIv: "a4fd6610c6e6924266bfafa2",
    encryptedTag: "13d53e7d7ebe7f537e112db52e72cfdd",
    commitment: "0x261ed0a8d7650f5b38aa1ff432be078854932d5a66cd83e0f32eb2eede63db53",
    nullifier: "0x069efee9139bbb52187af93e3248892f268363a6029cc788d95580c2720f2d37",
  }

  console.log("Generating proof...")
  const { proof, publicSignals } = await proofSvc.generateProof(
    cred.encryptedData,
    cred.encryptedIv,
    cred.encryptedTag,
    institutionKey,
    {
      commitment: cred.commitment,
      nullifier: cred.nullifier,
      claimType: 1,
      threshold: 0,
    }
  )
  console.log("Proof generated, pi_a[0]:", proof.pi_a[0].slice(0, 30), "...")
  console.log("publicSignals:", publicSignals)

  const a = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])] as [bigint, bigint]
  const b = [
    [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
    [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
  ] as [[bigint, bigint], [bigint, bigint]]
  const c = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])] as [bigint, bigint]
  const pubArgs: [bigint, bigint, bigint, bigint] = [
    BigInt(publicSignals[0]),
    BigInt(publicSignals[1]),
    BigInt(publicSignals[2]),
    BigInt(publicSignals[3]),
  ]

  console.log("Calling verifyProof (simulation, all G2 orderings)...")
  const result = await bcSvc.verifyProof(a, b, c, pubArgs)
  console.log("verifyProof result:", result)
}

main().catch((err) => {
  console.error("FAILED:", err)
  process.exit(1)
})
