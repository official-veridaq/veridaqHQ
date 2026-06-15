"use client"
import { api, downloadReport } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { toast } from "@/components/ui/toast"
import { CreditPurchaseModal } from "./credit-purchase-modal"
import { motion } from "framer-motion"
import { Loader2, CheckCircle2, XCircle, FileText, Sparkles, AlertTriangle } from "lucide-react"
import { useEffect, useState } from "react"

type Institution = {
  id: string
  onChainId: string
  name: string
  claims: { id: string; label: string; claimCode: number; threshold: number }[]
}

type Result = { id: string; status: string; result: string | null }

export function VerifyButton({ onComplete }: { onComplete(): void }) {
  const { user } = useAuth()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [selectedInst, setSelectedInst] = useState("")
  const [matric, setMatric] = useState("")
  const [claimType, setClaimType] = useState(1)
  const [threshold] = useState(0)
  const [courseName, setCourseName] = useState("")
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState("")
  const [freeRemaining, setFreeRemaining] = useState(3)
  const [credits, setCredits] = useState(0)
  const [showPurchase, setShowPurchase] = useState(false)

  useEffect(() => {
    if (!user) return
    api
      .get("/verify/institutions")
      .then(({ data }) => setInstitutions(data))
      .catch((err: any) => toast.error(err?.response?.data?.error ?? "Failed to load institutions"))

    api
      .get("/payment/info")
      .then(({ data }) => {
        setFreeRemaining(data.freeRemaining ?? 3)
        setCredits(data.credits ?? 0)
      })
      .catch(() => {})
  }, [user])

  const inst = institutions.find((i) => i.onChainId === selectedInst)
  const claims = inst?.claims ?? []
  const totalAvailable = freeRemaining + credits

  async function handleVerify() {
    if (!selectedInst || !matric) return

    if (totalAvailable <= 0) {
      setShowPurchase(true)
      return
    }

    setLoading(true)
    setError("")
    setResult(null)
    try {
      const { data } = await api.post("/verify/request", {
        institutionOnChainId: selectedInst,
        matricNumber: matric,
        claimType,
        threshold,
        courseName: claimType === 6 ? courseName : undefined,
      })

      setProcessing(true)
      setLoading(false)

      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const { data: r } = await api.get(`/verify/request/${data.requestId}`)
        if (r.status === "COMPLETED" || r.status === "FAILED") {
          clearInterval(poll)
          setProcessing(false)
          setResult(r)
          onComplete()
          if (r.result === "VERIFIED") {
            toast.success("Credential verified!")
            setFreeRemaining((prev) => Math.max(0, prev - 1))
            setCredits((prev) => Math.max(0, prev - 1))
          } else {
            toast.error("Credential not satisfied")
          }
        }
        if (attempts > 20) {
          clearInterval(poll)
          setError("Verification timed out. Please try again.")
          setProcessing(false)
        }
      }, 2000)
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? "Request failed."
      setError(msg)
      toast.error(msg)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CreditPurchaseModal
        open={showPurchase}
        onClose={() => setShowPurchase(false)}
        onSuccess={() => {
          setShowPurchase(false)
          api.get("/payment/info").then(({ data }) => {
            setFreeRemaining(data.freeRemaining ?? 3)
            setCredits(data.credits ?? 0)
          }).catch(() => {})
        }}
      />

      {/* Credit Indicator */}
      <div className="bg-surface-card border-surface-border flex items-center justify-between rounded-lg border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-muted text-sm">
            {totalAvailable > 0 ? (
              <>Available: <strong className="text-foreground">{totalAvailable}</strong> verification{totalAvailable !== 1 ? "s" : ""}</>
            ) : (
              <span className="text-error">No verifications remaining</span>
            )}
          </span>
        </div>
        {totalAvailable <= 3 && (
          <button
            onClick={() => setShowPurchase(true)}
            className="text-accent hover:bg-accent/10 rounded px-2 py-1 text-xs font-medium transition-colors"
          >
            Buy more
          </button>
        )}
      </div>

      {totalAvailable <= 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-error-bg border-error/20 text-error flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>You&apos;ve used all free verifications. Purchase credits to continue.</span>
        </motion.div>
      )}

      {freeRemaining > 0 && (
        <div className="bg-accent/5 border-accent/10 rounded-lg border px-3 py-2 text-xs text-muted">
          {freeRemaining} free trial{freeRemaining !== 1 ? "s" : ""} remaining
        </div>
      )}

      <div>
        <label className="label">Institution</label>
        <select className="input" value={selectedInst} onChange={(e) => setSelectedInst(e.target.value)}>
          <option value="">Select institution…</option>
          {institutions.map((i) => (
            <option key={i.id} value={i.onChainId}>{i.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Matriculation Number</label>
        <input className="input" value={matric} onChange={(e) => setMatric(e.target.value)} placeholder="FUT/MIN/2020/001" />
      </div>

      <div>
        <label className="label">Academic Claim</label>
        <select className="input" value={claimType} onChange={(e) => setClaimType(Number(e.target.value))}>
          {claims.map((c) => (
            <option key={c.id} value={c.claimCode}>{c.label}</option>
          ))}
          {claims.length === 0 && <option value={1}>Programme Completion</option>}
        </select>
      </div>

      {claimType === 6 && (
        <div className="animate-fade-in">
          <label className="label">Course Name</label>
          <input className="input" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. Computer Science" />
        </div>
      )}

      {processing && (
        <motion.div className="bg-surface-card border-accent/20 flex items-center gap-3 rounded-lg border px-4 py-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <div>
            <p className="text-sm font-medium text-foreground">Verifying Credential...</p>
            <p className="text-muted text-xs">Generating zero-knowledge proof</p>
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div className="bg-error-bg border-error/20 text-error rounded-lg border px-3 py-2 text-xs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {error}
        </motion.div>
      )}

      {result && (
        <motion.div className={`rounded-lg px-4 py-3 text-sm font-medium ${result.result === "VERIFIED" ? "bg-accent-muted text-accent border-accent/20 border" : "bg-error-bg text-error border-error/20 border"}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2">
            {result.result === "VERIFIED" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <span>{result.result === "VERIFIED" ? "Verified: claim is satisfied." : `Not satisfied: ${result.result?.replace(/_/g, " ")}`}</span>
          </div>
          <div className="mt-3">
            <button onClick={() => downloadReport(result.id).catch(() => toast.error("Failed to download report"))} className="btn-ghost inline-flex items-center gap-1 text-xs">
              <FileText className="h-3 w-3" /> Download PDF report
            </button>
          </div>
        </motion.div>
      )}

      <button
        className={`btn-primary justify-center disabled:opacity-50 ${totalAvailable <= 0 ? "border-error/50 bg-error-bg text-error hover:bg-error/20 border" : ""}`}
        onClick={totalAvailable <= 0 ? () => setShowPurchase(true) : handleVerify}
        disabled={loading || processing || !selectedInst || !matric}
      >
        {totalAvailable <= 0 ? (
          <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" /> Purchase Credits</span>
        ) : loading ? (
          <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</span>
        ) : processing ? (
          <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processing...</span>
        ) : (
          "Verify Credential"
        )}
      </button>
    </div>
  )
}
