/**
 * Stellar Freighter API wrapper.
 *
 * Provides a consistent interface over @stellar/freighter-api v6.
 * Returns safe defaults when the extension is not installed.
 */

let freighterApi: any = null

async function getFreighter(): Promise<any> {
  if (freighterApi) return freighterApi
  try {
    if (typeof window === "undefined") return null
    const mod = await import("@stellar/freighter-api")
    freighterApi = mod.default ?? mod
    return freighterApi
  } catch {
    return null
  }
}

export async function isConnected(): Promise<{ isConnected: boolean }> {
  const api = await getFreighter()
  if (!api) return { isConnected: false }
  try {
    const res = await api.isConnected()
    return { isConnected: !!res.isConnected }
  } catch {
    return { isConnected: false }
  }
}

export async function getPublicKey(): Promise<string> {
  const api = await getFreighter()
  if (!api) throw new Error("Freighter wallet not available")
  const res = await api.getAddress()
  if (res.error) throw new Error(res.error.message ?? "Failed to get address")
  return res.address
}

export async function getAddress(): Promise<{ address: string }> {
  const address = await getPublicKey()
  return { address }
}

export async function requestAccess(): Promise<{ address: string }> {
  const api = await getFreighter()
  if (!api) throw new Error("Freighter wallet not available")
  const allowed = await api.setAllowed()
  if (!allowed.isAllowed) throw new Error("Wallet connection was rejected")
  const res = await api.getAddress()
  if (res.error) throw new Error(res.error.message ?? "Failed to get address")
  return { address: res.address }
}
