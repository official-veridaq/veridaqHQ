/**
 * Type declarations for Stellar ecosystem integrations.
 * These modules are not yet installed — they are stubs for future wiring.
 */

declare module "@stellar/freighter-api" {
  export function isConnected(): Promise<{ isConnected: boolean }>
  export function getPublicKey(): Promise<string>
  export function signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string }
  ): Promise<{ signedTxXdr: string }>
}

interface StellarProvider {
  isConnected: () => Promise<{ isConnected: boolean }>
  getPublicKey: () => Promise<string>
  getAddress: () => Promise<{ address: string }>
}

declare global {
  interface Window {
    stellar?: StellarProvider
  }
}
