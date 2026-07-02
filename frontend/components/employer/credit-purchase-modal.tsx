"use client"
import { api } from "@/lib/api"
import { toast } from "@/components/ui/toast"
import { CrossmintCheckout } from "@/components/payment/crossmint-checkout"
import { Wallet, Loader2, CheckCircle2, Sparkles, Copy } from "lucide-react"
import { useState, useEffect } from "react"
import { useWallet } from "@/lib/wallet-provider"

const CREDIT_PACKS = [
  { label: "10 Verifications", credits: 10, usd: 15, xlm: "0.01" },
  { label: "25 Verifications", credits: 25, usd: 30, xlm: "0.02" },
  { label: "50 Verifications", credits: 50, usd: 50, xlm: "0.05" },
  { label: "100 Verifications", credits: 100, usd: 90, xlm: "0.10" },
]

type CreditPurchaseModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreditPurchaseModal({ open, onClose, onSuccess }: CreditPurchaseModalProps) {
  const [step, setStep] = useState<"choose" | "crypto" | "fiat" | "success" | "error">("choose")
  const [selectedPack, setSelectedPack] = useState<typeof CREDIT_PACKS[number] | null>(null)
  const [paymentRef, setPaymentRef] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { isConnected, publicKey, connect } = useWallet()
  const [isWriting, setIsWriting] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  useEffect(() => {
    if (step === "choose" && isConnected && selectedPack) {
      setStep("choose")
    }
  }, [isConnected])

  if (!open) return null

  async function handleCrypto() {
    if (!isConnected) {
      connect()
      return
    }
    if (!selectedPack) return
    setLoading(true)
    setIsWriting(true)
    try {
      const { data: payment } = await api.post("/payment/create", {
        type: "EMPLOYER_TOPUP",
        method: "CRYPTO",
        amount: selectedPack.xlm,
        amountFiat: String(selectedPack.usd),
        fiatCurrency: "USD",
        description: `Top-up ${selectedPack.credits} verification credits`,
      })
      setPaymentRef(payment.referenceId)
      setTxHash("simulated-" + Date.now())
      setIsWriting(false)
      setIsConfirmed(true)
      setStep("crypto")
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to create payment")
      setError(err?.response?.data?.error ?? "Failed to create payment")
      setStep("error")
    } finally {
      setLoading(false)
    }
  }

  async function confirmOnChain() {
    if (!txHash || !paymentRef) return
    setLoading(true)
    try {
      const { data } = await api.post("/payment/complete/crypto", {
        referenceId: paymentRef,
        txHash,
      })
      if (data.completed) {
        toast.success(`${selectedPack?.credits} verification credits added!`)
        setStep("success")
        onSuccess()
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Verification failed")
      setStep("error")
    } finally {
      setLoading(false)
    }
  }

  const txPending = isWriting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border-surface-border mx-4 w-full max-w-md rounded-xl border p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Sparkles className="h-5 w-5 text-accent" />
            Buy Verification Credits
          </h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">&times;</button>
        </div>

        {step === "choose" && (
          <div className="space-y-4">
            <p className="text-muted text-sm">
              Purchase verification credits to continue verifying credentials. Credits never expire.
            </p>

            <div className="space-y-2">
              {CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.credits}
                  onClick={() => { setSelectedPack(pack); setStep("choose") }}
                  className={`border-surface-border hover:border-accent/50 flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                    selectedPack?.credits === pack.credits ? "border-accent bg-accent/5" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium text-foreground">{pack.label}</p>
                    <p className="text-muted text-xs">${pack.usd} USD</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted">{pack.xlm} XLM</p>
                    <p className="text-accent text-xs">${(pack.usd / pack.credits).toFixed(2)}/credit</p>
                  </div>
                </button>
              ))}
            </div>

            {selectedPack && (
              <div className="space-y-3 pt-2">
                {isConnected && publicKey && (
                  <div className="bg-void border-surface-border flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-muted">
                    <Wallet className="h-3 w-3 shrink-0" />
                    <span className="truncate font-mono">{publicKey}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(publicKey); toast.success("Address copied") }}
                      className="ml-auto shrink-0 hover:text-foreground transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <button
                  onClick={handleCrypto}
                  disabled={loading}
                  className="bg-accent text-void hover:bg-accent/90 flex w-full items-center justify-center gap-2 rounded px-4 py-3 font-medium transition-colors disabled:opacity-50"
                >
                  <Wallet className="h-4 w-4" />
                  {isConnected ? `Pay with Crypto (${selectedPack.xlm} XLM)` : "Connect Wallet to Pay"}
                </button>

                <div className="relative">
                  <div className="border-surface-border absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-surface-card text-muted px-2">or</span>
                  </div>
                </div>

                <CrossmintCheckout
                  amountUsd={selectedPack.usd}
                  paymentType="EMPLOYER_TOPUP"
                  onSuccess={onSuccess}
                  onClose={() => setStep("choose")}
                  label={`Pay $${selectedPack.usd} with Card`}
                />
              </div>
            )}
          </div>
        )}

        {step === "crypto" && (
          <div className="space-y-4">
            {publicKey && (
              <div className="bg-void border-surface-border flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-muted">
                <Wallet className="h-3 w-3 shrink-0" />
                <span className="truncate font-mono">{publicKey}</span>
              </div>
            )}
            {txPending && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="text-muted text-sm">Processing payment...</p>
                <p className="text-muted text-xs">Sending {selectedPack?.xlm} XLM equivalent</p>
              </div>
            )}
            {isConfirmed && !loading && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                  <p className="text-foreground font-medium">Payment Recorded</p>
                  {txHash && (
                    <p className="text-muted max-w-full truncate px-4 text-xs font-mono">{txHash}</p>
                  )}
                </div>
                <button
                  onClick={confirmOnChain}
                  disabled={loading}
                  className="bg-accent text-void hover:bg-accent/90 flex w-full items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Apply Credits
                </button>
              </div>
            )}
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold text-foreground">Credits Added!</p>
            <p className="text-muted text-sm text-center">
              {selectedPack?.credits} verification credits have been added to your account.
            </p>
            <button
              onClick={onClose}
              className="bg-accent text-void hover:bg-accent/90 mt-2 rounded px-6 py-2 text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="text-error flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <span className="text-2xl">!</span>
            </div>
            <p className="text-lg font-semibold text-foreground">Transaction Failed</p>
            <p className="text-muted text-sm text-center">{error ?? "An error occurred"}</p>
            <button
              onClick={() => { setStep("choose"); setError(null) }}
              className="bg-accent text-void hover:bg-accent/90 rounded px-6 py-2 text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
