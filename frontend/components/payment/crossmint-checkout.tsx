"use client"
import { api } from "@/lib/api"
import { toast } from "@/components/ui/toast"
import { CreditCard, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useState, useRef, useEffect } from "react"

type CrossmintCheckoutProps = {
  amountUsd: number
  paymentType: "INSTITUTION_UPGRADE" | "INSTITUTION_FUNDING" | "EMPLOYER_TOPUP"
  onSuccess: () => void
  onClose: () => void
  label?: string
}

export function CrossmintCheckout({ amountUsd, paymentType, onSuccess, onClose, label }: CrossmintCheckoutProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"init" | "waiting" | "completed" | "failed">("init")
  const [referenceId, setReferenceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function startCheckout() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post("/crossmint/create-order", {
        amountUsd,
        type: paymentType,
      })

      setReferenceId(data.referenceId)
      setStep("waiting")

      const width = 480
      const height = 750
      const left = window.screenX + (window.innerWidth - width) / 2
      const top = window.screenY + (window.innerHeight - height) / 2
      const popup = window.open(
        data.checkoutUrl,
        "crossmint-checkout",
        `width=${width},height=${height},left=${left},top=${top},popup=1`,
      )

      if (!popup || popup.closed) {
        toast.error("Popup blocked. Please allow popups for this site.")
        setError("Popup blocked")
        setStep("failed")
        setLoading(false)
        return
      }

      let attempts = 0
      pollRef.current = setInterval(async () => {
        attempts++
        try {
          const { data: payment } = await api.get(`/payment/${data.referenceId}`)
          if (payment.status === "COMPLETED") {
            clearInterval(pollRef.current!)
            setStep("completed")
            toast.success("Payment completed successfully!")
            onSuccess()
          } else if (payment.status === "FAILED") {
            clearInterval(pollRef.current!)
            setStep("failed")
            setError("Payment failed. Please try again.")
            toast.error("Payment failed")
          }
        } catch {
          // Continue polling
        }
        if (attempts > 60) {
          clearInterval(pollRef.current!)
          setStep("failed")
          setError("Payment confirmation timed out. Check your Crossmint transaction status.")
          toast.error("Payment timed out")
        }
      }, 5000)

      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup)
          setLoading(false)
        }
      }, 1000)
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Failed to initiate payment"
      toast.error(msg)
      setError(msg)
      setStep("failed")
      setLoading(false)
    }
  }

  if (step === "waiting") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="text-foreground font-medium">Waiting for payment...</p>
        <p className="text-muted text-sm text-center">
          Complete your purchase in the Crossmint window.
          <br />
          This page will update automatically once confirmed.
        </p>
        <p className="text-muted mt-2 text-xs">
          Reference: <span className="font-mono">{referenceId}</span>
        </p>
        <button
          onClick={() => {
            setStep("init")
            setError(null)
          }}
          className="text-muted hover:text-foreground text-xs transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (step === "completed") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <p className="text-lg font-semibold text-foreground">Payment Confirmed!</p>
        <p className="text-muted text-sm text-center">
          Your payment of ${amountUsd} has been processed.
        </p>
        <button
          onClick={onClose}
          className="bg-accent text-void hover:bg-accent/90 mt-2 rounded px-6 py-2 text-sm font-medium transition-colors"
        >
          Done
        </button>
      </div>
    )
  }

  if (step === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <XCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg font-semibold text-foreground">Payment Failed</p>
        <p className="text-muted text-sm text-center">{error ?? "An error occurred"}</p>
        <div className="flex gap-3">
          <button
            onClick={startCheckout}
            className="bg-accent text-void hover:bg-accent/90 rounded px-6 py-2 text-sm font-medium transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onClose}
            className="border-surface-border text-muted hover:text-foreground rounded border px-6 py-2 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button
        onClick={startCheckout}
        disabled={loading}
        className="bg-accent text-void hover:bg-accent/90 flex w-full items-center justify-center gap-2 rounded px-4 py-3 font-medium transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        {label ?? `Pay $${amountUsd} with Card`}
      </button>
      <p className="text-muted text-center text-xs">
        Powered by Crossmint &middot; Pay with card, bank transfer, or Apple Pay
      </p>
      {amountUsd > 0 && (
        <p className="text-muted text-center text-xs">
          You will be charged ${amountUsd} USD
        </p>
      )}
    </div>
  )
}
