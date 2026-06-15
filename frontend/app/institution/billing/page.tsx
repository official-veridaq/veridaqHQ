"use client"
import { DashboardLayout } from "@/components/institution/layout"
import { GuardKyc } from "@/components/ui/guard-kyc"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { toast } from "@/components/ui/toast"
import { UpgradeModal } from "@/components/institution/upgrade-modal"
import { DepositModal } from "@/components/institution/deposit-modal"
import { ArrowUpCircle, CreditCard, RefreshCcw, Shield, Wallet, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

type BillingData = {
  paymasterBalance: string
  tier: "FREE" | "PAID"
  sponsoredPoolBalance?: string
  institutionBalance?: string
}

export default function InstitutionBilling() {
  const { user } = useAuth()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [showDeposit, setShowDeposit] = useState(false)

  function load() {
    if (!user) return
    api.get("/institution/billing")
      .then((res) => setData(res.data))
      .catch(() => toast.error("Failed to load billing data"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [user])

  async function syncBalance() {
    setSyncing(true)
    try {
      const { data: res } = await api.post("/institution/billing/sync")
      setData((prev) => prev ? { ...prev, paymasterBalance: res.paymasterBalance ?? prev.paymasterBalance } : prev)
      toast.success("Paymaster balance synced from chain")
    } catch {
      toast.error("Failed to sync paymaster balance")
    } finally {
      setSyncing(false)
    }
  }

  const currentBalance = Number(data?.paymasterBalance || 0)
  const isLowBalance = data?.tier === "PAID" && currentBalance < 0.01

  return (
    <DashboardLayout title="Billing">
      {loading ? (
        <div className="text-muted flex h-64 items-center justify-center text-sm">Loading…</div>
      ) : (
        <GuardKyc>
          <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} onSuccess={load} />
          <DepositModal open={showDeposit} onClose={() => setShowDeposit(false)} onSuccess={load} />

          <div className="animate-fade-in space-y-6">
            {/* Tier Status */}
            <div className="relative overflow-hidden rounded-xl border border-surface-border bg-gradient-to-br from-surface-card to-void p-6">
              <div className="bg-accent/5 pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full blur-3xl" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                    <Shield className="h-7 w-7 text-accent" />
                  </div>
                  <div>
                    <p className="text-muted text-sm">Current Tier</p>
                    <p className="text-2xl font-bold text-foreground">{data?.tier ?? "FREE"}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                    data?.tier === "PAID"
                      ? "bg-accent/10 text-accent"
                      : "bg-amber-500/10 text-amber-500"
                  }`}
                >
                  {data?.tier === "PAID" ? "Active" : "Free Tier"}
                </span>
              </div>

              {data?.tier === "FREE" ? (
                <div className="mt-6 border-t border-surface-border pt-4">
                  <p className="text-muted mb-3 text-sm">
                    Upgrade to PAID tier to deposit ETH and enable sponsored gas for batch submissions.
                    Pay with crypto or fiat via Crossmint.
                  </p>
                  <button
                    onClick={() => setShowUpgrade(true)}
                    className="bg-accent text-void hover:bg-accent/90 inline-flex items-center gap-2 rounded px-5 py-2.5 text-sm font-medium transition-colors"
                  >
                    <CreditCard size={16} /> Upgrade to PAID — $75
                  </button>
                </div>
              ) : (
                <div className="mt-6 border-t border-surface-border pt-4">
                  <p className="text-muted mb-3 text-sm">
                    Your institution is on the PAID tier. Deposit ETH to fund batch submissions
                    and sponsored gas via Crossmint or direct crypto transfer.
                  </p>
                  <button
                    onClick={() => setShowDeposit(true)}
                    className="bg-accent text-void hover:bg-accent/90 inline-flex items-center gap-2 rounded px-5 py-2.5 text-sm font-medium transition-colors"
                  >
                    <ArrowUpCircle size={16} /> Deposit ETH
                  </button>
                </div>
              )}
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative overflow-hidden rounded-xl border border-surface-border bg-surface-card p-5">
                <div className="flex items-start justify-between">
                  <p className="text-muted text-sm">Paymaster Credit</p>
                  <Wallet className="h-4 w-4 text-accent" />
                </div>
                <p className={`mt-2 text-3xl font-bold ${isLowBalance ? "text-error" : "text-foreground"}`}>
                  {currentBalance.toFixed(4)}
                  <span className="text-muted ml-1 text-sm font-normal">ETH</span>
                </p>
                {isLowBalance && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-error">
                    Low balance — deposit ETH to continue batch submissions
                  </p>
                )}
                <button
                  onClick={syncBalance}
                  disabled={syncing}
                  className="text-muted mt-3 inline-flex items-center gap-2 text-xs transition-colors hover:text-foreground"
                >
                  <RefreshCcw size={12} className={syncing ? "animate-spin" : ""} />
                  {syncing ? "Syncing" : "Sync from chain"}
                </button>
              </div>

              <div className="rounded-xl border border-surface-border bg-surface-card p-5">
                <div className="flex items-start justify-between">
                  <p className="text-muted text-sm">Institution Balance (On-Chain)</p>
                  <ArrowUpCircle className="h-4 w-4 text-accent" />
                </div>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {Number(data?.institutionBalance || 0).toFixed(4)}
                  <span className="text-muted ml-1 text-sm font-normal">ETH</span>
                </p>
                {data?.tier === "PAID" && (
                  <button
                    onClick={() => setShowDeposit(true)}
                    className="bg-accent text-void hover:bg-accent/90 mt-3 inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                    <ArrowUpCircle size={12} /> Deposit ETH
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-surface-border bg-surface-card p-5">
                <div className="flex items-start justify-between">
                  <p className="text-muted text-sm">Sponsored Pool</p>
                  <Shield className="h-4 w-4 text-accent" />
                </div>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {Number(data?.sponsoredPoolBalance || 0).toFixed(4)}
                  <span className="text-muted ml-1 text-sm font-normal">ETH</span>
                </p>
                <p className="text-muted mt-1 text-xs">Platform-sponsored gas pool</p>
              </div>
            </div>

            {/* Payment History Link */}
            <div className="rounded-xl border border-surface-border bg-surface-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Payments accepted</p>
                    <p className="text-muted text-xs">Crossmint — Card, Bank Transfer, Apple Pay</p>
                  </div>
                </div>
                <a
                  href="/institution/payments"
                  className="text-accent text-xs font-medium hover:underline"
                >
                  View history
                </a>
              </div>
            </div>
          </div>
        </GuardKyc>
      )}
    </DashboardLayout>
  )
}
