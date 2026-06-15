/**
 * Stellar Freighter API stub.
 *
 * Wraps Freighter (Stellar browser wallet) in try-catch so the app never
 * crashes when the extension is not installed.  Replace the inner calls
 * with the real @stellar/freighter-api functions once the package is added.
 */

async function getFreighter(): Promise<StellarProvider | null> {
  try {
    if (typeof window !== "undefined" && (window as any).stellar) {
      return (window as any).stellar as StellarProvider
    }
    // Dynamically try the freighter-api module in case it gets installed later
    const freighter = await import("@stellar/freighter-api")
    return {
      isConnected: () => freighter.isConnected(),
      getPublicKey: () => freighter.getPublicKey(),
      getAddress: async () => {
        const pk = await freighter.getPublicKey()
        return { address: pk }
      },
    } as StellarProvider
  } catch {
    return null
  }
}

export async function isConnected(): Promise<{ isConnected: boolean }> {
  const freighter = await getFreighter()
  if (freighter) {
    try {
      return await freighter.isConnected()
    } catch {
      // fall through
    }
  }
  return { isConnected: false }
}

export async function getPublicKey(): Promise<string> {
  const freighter = await getFreighter()
  if (freighter) {
    try {
      return await freighter.getPublicKey()
    } catch {
      // fall through
    }
  }
  throw new Error("Freighter not available")
}

export async function getAddress(): Promise<{ address: string }> {
  const publicKey = await getPublicKey()
  return { address: publicKey }
}

export type StellarProvider = {
  isConnected: () => Promise<{ isConnected: boolean }>
  getPublicKey: () => Promise<string>
  getAddress: () => Promise<{ address: string }>
}
