"use client"
import { api } from "@/lib/api"
import { toast } from "@/components/ui/toast"
import { CrossmintCheckout } from "@/components/payment/crossmint-checkout"
import { Wallet, Loader2, CheckCircle2, ArrowUpCircle, Copy } from "lucide-react"
import { useState } from "react"
import { useWallet } from "@/lib/wallet-provider"

type DepositModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const PREDEFINED_AMOUNTS = [
  { usd: 25, eth: "0.0125" },
  { usd: 50, eth: "0.025" },
  { usd: 100, eth: "0.05" },
  { usd: 200, eth: "0.1" },
  { usd: 500, eth: "0.25" },
]

export function DepositModal({ open, onClose, onSuccess }: DepositModalProps) {
  const [step, setStep] = useState<"choose" | "amount" | "crypto" | "fiat" | "success" | "error">("choose")
  const [selectedUsd, setSelectedUsd] = useState(50)
  const [selectedEth, setSelectedEth] = useState("0.025")
  const [paymentRef, setPaymentRef] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customUsd, setCustomUsd] = useState("")

  const { isConnected, publicKey, connect } = useWallet()
  const [isWriting, setIsWriting] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  if (!open) return null

  const effectiveUsd = customUsd ? parseInt(customUsd) : selectedUsd
  const effectiveEth = customUsd ? (parseInt(customUsd) * 0.0005).toFixed(4) : selectedEth

  async function handleCrypto() {
    if (!isConnected) {
      connect()
      return
    }
    setLoading(true)
    setIsWriting(true)
    try {
      const { data: payment } = await api.post("/payment/create", {
        type: "INSTITUTION_FUNDING",
        method: "CRYPTO",
        amountWei: effectiveEth,
        amountFiat: String(effectiveUsd),
        fiatCurrency: "USD",
        description: `Deposit $${effectiveUsd} worth of XLM`,
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
        toast.success(`Deposit of ${effectiveEth} ETH confirmed!`)
        setStep("success")
        onSuccess()
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Verification failed")
      setError(err?.response?.data?.error ?? "Verification failed")
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
            <ArrowUpCircle className="h-5 w-5 text-accent" />
            Deposit Funds
          </h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">&times;</button>
        </div>

        {step === "choose" && (
          <div className="space-y-4">
            <p className="text-muted text-sm">
              Choose how to fund your institution&apos;s Paymaster balance. Select a preset amount or enter a custom value.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {PREDEFINED_AMOUNTS.map((a) => (
                <button
                  key={a.usd}
                  onClick={() => {
                    setSelectedUsd(a.usd)
                    setSelectedEth(a.eth)
                    setCustomUsd("")
                    setStep("amount")
                  }}
                  className="border-surface-border bg-void hover:border-accent/50 rounded-lg border p-3 text-center transition-colors"
                >
                  <p className="text-foreground text-sm font-semibold">${a.usd}</p>
                    <p className="text-muted text-xs">{a.eth} XLM</p>
                </button>
              ))}
            </div>

            <div className="relative">
              <div className="border-surface-border absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-surface-card text-muted px-2">or custom amount</span>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label">USD Amount</label>
                <input
                  type="number"
                  min="10"
                  className="input"
                  placeholder="e.g. 75"
                  value={customUsd}
                  onChange={(e) => setCustomUsd(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="label">Est. XLM</label>
                <input
                  type="text"
                  className="input"
                  value={customUsd ? (parseInt(customUsd || "0") * 0.0005).toFixed(4) : ""}
                  readOnly
                  placeholder="~0.0375"
                />
              </div>
            </div>

            {customUsd && parseInt(customUsd) >= 10 && (
              <button
                onClick={() => {
                  setSelectedUsd(parseInt(customUsd))
                  setSelectedEth((parseInt(customUsd) * 0.0005).toFixed(4))
                  setStep("amount")
                }}
                className="bg-accent text-void hover:bg-accent/90 w-full rounded px-4 py-2.5 text-sm font-medium transition-colors"
              >
                Continue with ${customUsd}
              </button>
            )}

            <p className="text-muted text-center text-xs">
              Rates are estimates. Actual amounts may vary at time of purchase.
            </p>
          </div>
        )}

        {step === "amount" && (
          <div className="space-y-5">
            <div className="bg-void border-surface-border rounded-lg border p-4 text-center">
              <p className="text-muted text-xs">You are depositing</p>
              <p className="text-3xl font-bold text-foreground">${effectiveUsd}</p>
              <p className="text-muted text-sm">≈ {effectiveEth} XLM</p>
            </div>

            <div className="space-y-3">
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
                {isConnected ? `Pay with Crypto (${effectiveEth} XLM)` : "Connect Wallet to Pay"}
              </button>

              <div className="relative">
                <div className="border-surface-border absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-surface-card text-muted px-2">or</span>
                </div>
              </div>

              <CrossmintCheckout
                amountUsd={effectiveUsd}
                paymentType="INSTITUTION_FUNDING"
                onSuccess={onSuccess}
                onClose={() => setStep("choose")}
              />
            </div>

            <button
              onClick={() => setStep("choose")}
              className="text-muted hover:text-foreground w-full text-xs transition-colors"
            >
              Back
            </button>
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
                <p className="text-muted text-xs">Sending {effectiveEth} XLM equivalent</p>
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
                  Confirm & Apply Deposit
                </button>
              </div>
            )}
          </div>
        )}

        {step === "fiat" && (
          <CrossmintCheckout
            amountUsd={effectiveUsd}
            paymentType="INSTITUTION_FUNDING"
            onSuccess={() => { setStep("success"); onSuccess() }}
            onClose={() => setStep("amount")}
          />
        )}

        {step === "success" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold text-foreground">Deposit Successful!</p>
            <p className="text-muted text-sm text-center">
              ${effectiveUsd} has been credited to your institution.
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
