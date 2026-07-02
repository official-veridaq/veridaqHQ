"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { isConnected as checkFreighterConnected, getPublicKey, requestAccess } from "@/lib/stellar"

type WalletContextType = {
  isConnected: boolean
  publicKey: string | null
  connect: () => Promise<void>
  isAvailable: boolean
}

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  publicKey: null,
  connect: async () => {},
  isAvailable: false,
})

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)

  const detectAndConnect = useCallback(async () => {
    try {
      const { isConnected: connected } = await checkFreighterConnected()
      setIsAvailable(true)
      if (connected) {
        const pk = await getPublicKey()
        setPublicKey(pk)
      }
    } catch {
      setIsAvailable(false)
    }
  }, [])

  useEffect(() => {
    detectAndConnect()
  }, [detectAndConnect])

  const connect = useCallback(async () => {
    try {
      const { address } = await requestAccess()
      setPublicKey(address)
    } catch {
      // Freighter not available or rejected
    }
  }, [])

  return (
    <WalletContext.Provider
      value={{
        isConnected: !!publicKey,
        publicKey,
        connect,
        isAvailable,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
