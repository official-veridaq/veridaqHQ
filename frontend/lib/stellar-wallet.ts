"use client"

import { useState, useEffect, useCallback } from "react"

let freighterModule: any = null

export async function getFreighterApi(): Promise<any> {
  if (typeof window === "undefined") return null
  if (!freighterModule) {
    try {
      const mod = await import("@stellar/freighter-api")
      freighterModule = mod.default ?? mod
    } catch {
      return null
    }
  }
  return freighterModule
}

export function useStellarWallet() {
  const [address, setAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [installed, setInstalled] = useState<boolean | null>(null)

  const checkConnection = useCallback(async () => {
    const api = await getFreighterApi()
    if (!api) {
      setInstalled(false)
      return
    }
    setInstalled(true)
    try {
      const res = await api.isConnected()
      if (res.isConnected) {
        const addrRes = await api.getAddress()
        if (addrRes.error) {
          throw new Error(addrRes.error.message ?? "Failed to get address")
        }
        setAddress(addrRes.address)
      }
    } catch {
      // not connected or error
    }
  }, [])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  const connect = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      const api = await getFreighterApi()
      if (!api) {
        throw new Error(
          "Freighter wallet not detected. Please install the Freighter browser extension."
        )
      }
      setInstalled(true)

      const allowedRes = await api.setAllowed()
      if (!allowedRes.isAllowed) {
        throw new Error("Wallet connection was rejected.")
      }
      const addrRes = await api.getAddress()
      if (addrRes.error) {
        throw new Error(addrRes.error.message ?? "Failed to retrieve address")
      }
      setAddress(addrRes.address)
    } catch (err: any) {
      const msg = err?.message ?? "Failed to connect wallet"
      setError(msg)
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
  }, [])

  return {
    address,
    connecting,
    error,
    connect,
    disconnect,
    isInstalled: installed,
  }
}
