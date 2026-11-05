"use client"

import { useStellarWallet } from "@/lib/stellar-wallet"
import { Wallet, Loader2, Copy } from "lucide-react"
import { toast } from "@/components/ui/toast"
import { truncateHash } from "@/lib/utils"

export function StellarWalletButton({ variant = "header" }: { variant?: "header" | "card" }) {
  const { address, connecting, error, connect, disconnect } = useStellarWallet()

  function copyAddress() {
    if (!address) return
    navigator.clipboard.writeText(address)
    toast.success("Address copied to clipboard")
  }

  if (address) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <span className="bg-accent/10 text-accent flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs">
          <Wallet size={12} />
          {truncateHash(address, 6)}
        </span>
        <button
          onClick={copyAddress}
          className="text-muted hover:text-foreground rounded p-1 transition-colors"
          title="Copy address"
        >
          <Copy size={12} />
        </button>
        <button
          onClick={disconnect}
          className="text-muted rounded p-1 text-xs transition-colors hover:text-red-400"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={connect}
        disabled={connecting}
        className={`inline-flex items-center gap-2 rounded font-medium transition-colors ${
          variant === "card"
            ? "bg-accent text-void hover:bg-accent/90 px-4 py-2 text-sm"
            : "border-surface-border text-muted hover:text-foreground border px-3 py-1.5 text-xs"
        }`}
      >
        {connecting ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
        {connecting ? "Connecting..." : "Connect Freighter"}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
