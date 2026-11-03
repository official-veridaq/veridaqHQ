/**
 * BlockchainService factory — returns a real or mock instance
 * based on the USE_MOCK_BLOCKCHAIN env var.
 *
 * Import this file wherever you need a BlockchainService instance:
 *
 *   import { createBlockchainService } from "../services/blockchain-factory.service.js"
 *   const bSvc = await createBlockchainService()
 */

import { config } from "../config/index.js"
import type { BlockchainService as BlockchainServiceType } from "./blockchain.service.js"

let cachedInstance: BlockchainServiceType | null = null

export async function createBlockchainService(): Promise<BlockchainServiceType> {
  if (cachedInstance) return cachedInstance

  if (config.USE_MOCK_BLOCKCHAIN) {
    const { BlockchainService: Mock } = await import("./blockchain-mock.service.js")
    cachedInstance = new Mock() as unknown as BlockchainServiceType
    return cachedInstance
  }

  const { BlockchainService: Real } = await import("./blockchain.service.js")
  cachedInstance = new Real()
  return cachedInstance
}

export function resetBlockchainService(): void {
  cachedInstance = null
}
