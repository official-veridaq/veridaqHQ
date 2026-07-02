"use client"
import { DashboardLayout } from "@/components/institution/layout"
import { GuardKyc } from "@/components/ui/guard-kyc"
import { StatCard } from "@/components/ui/stat-card"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { AlertCircle, ArrowRight, FileCheck2, RefreshCcw, ShieldCheck, Upload, Sparkles } from "lucide-react"
import { toast } from "@/components/ui/toast"
import Link from "next/link"
import { useEffect, useState } from "react"
import { formatStellarBalance } from "@/lib/utils"

export default function InstitutionDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!user) return
    api
      .get("/institution/dashboard")
      .then((res) => setStats(res.data))
      .catch((err: any) => {
        const msg = err?.response?.data?.error ?? "Failed to load dashboard"
        toast.error(msg)
      })
      .finally(() => setLoading(false))
  }, [user])

  async function syncBalance() {
    setSyncing(true)
    try {
      const { data } = await api.post("/institution/billing/sync")
      const balance = formatStellarBalance(data.paymasterBalance || 0)
      setStats((prev: any) => ({
        ...prev,
        paymasterBalance: data.paymasterBalance,
        paymasterBalanceValue: balance,
      }))
    } catch {
      toast.error("Failed to sync paymaster balance")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <DashboardLayout title="Dashboard">
      {loading ? (
        <div className="text-muted flex h-64 items-center justify-center text-sm">Loading…</div>
      ) : (
        <GuardKyc>
          <div className="animate-fade-in space-y-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <h1 className="text-2xl font-semibold text-foreground">
                Welcome back, {stats?.name || "Institution"}!
              </h1>

              <div className="flex gap-2">
                <Link
                  href="/institution/batches"
                  className="bg-surface-border hover:bg-surface-border/80 flex items-center gap-2 rounded px-4 py-2 text-sm font-medium text-foreground transition-colors"
                >
                  <Upload size={16} /> Upload Batch
                </Link>
                <Link
                  href="/institution/claims"
                  className="bg-accent text-void hover:bg-accent/90 flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors"
                >
                  <ShieldCheck size={16} /> Claim Specs
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Credentials" value={stats?.totalCredentials ?? 0} />
              <StatCard label="Requests (This Month)" value={stats?.requestsThisMonth ?? 0} />

              <div className="card bg-surface-card border-surface-border flex flex-col justify-between rounded-xl border p-4">
                <p className="text-muted text-sm">Pending Manual Reviews</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-2xl font-semibold text-foreground">{stats?.pendingManual ?? 0}</p>
                  {stats?.pendingManual > 0 && (
                    <Link
                      href="/institution/verifications?status=AWAITING_INSTITUTION"
                      className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-500 hover:underline"
                    >
                      Review Now
                    </Link>
                  )}
                </div>
              </div>

              <div className="card from-surface-card to-void border-surface-border flex flex-col justify-between rounded-xl border bg-gradient-to-br p-4">
                <div className="flex items-start justify-between">
                  <p className="text-muted text-sm">Your Paymaster Credit</p>
                  <span className="text-muted font-mono text-xs">STELLAR</span>
                </div>
                <div className="mt-2">
                  <p
                    className={`text-2xl font-semibold ${Number(stats?.paymasterBalanceValue) < 0.01 ? "text-red-400" : "text-foreground"}`}
                  >
                    {Number(stats?.paymasterBalanceValue || 0).toFixed(4)}{" "}
                    <span className="text-muted text-sm">XLM</span>
                  </p>
                  {stats?.promoActive ? (
                    <p className="text-accent mt-1 text-xs">
                      Promo active, gas sponsored for up to 999 records
                    </p>
                  ) : Number(stats?.paymasterBalanceValue) < 0.01 ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle size={12} /> Low balance
                    </p>
                  ) : (
                    <p className="text-muted mt-1 text-xs">
                      Use this balance for paid batch submissions
                    </p>
                  )}
                </div>
                <button
                  onClick={syncBalance}
                  disabled={syncing}
                  className="text-muted mt-3 inline-flex items-center gap-2 text-xs transition-colors hover:text-foreground"
                >
                  <RefreshCcw size={12} className={syncing ? "animate-spin" : ""} />
                  {syncing ? "Syncing" : "Sync balance"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-surface-border bg-surface-card/50 p-3">
              <Sparkles className="text-muted h-4 w-4" />
              <span className="text-muted text-xs">Earnings & analytics coming soon</span>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card ">
                <h3 className="mb-4 flex items-center gap-2 font-medium text-foreground">
                  <FileCheck2 size={18} className="text-accent" /> Subscription & Last Batch
                </h3>
                <div className="space-y-4">
                  <div className="border-surface-border/50 flex items-center justify-between border-b py-2">
                    <span className="text-muted text-sm">Current Tier</span>
                    <span className="text-sm font-medium text-foreground">{stats?.tier ?? "FREE"}</span>
                  </div>
                  <div className="border-surface-border/50 flex items-center justify-between border-b py-2">
                    <span className="text-muted text-sm">Account Created</span>
                    <span className="text-sm font-medium text-foreground">
                      {stats?.createdAt ? new Date(stats.createdAt).toLocaleDateString() : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted text-sm">Last Upload Status</span>
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {stats?.lastBatch ? (
                        <>
                          <span
                            className={`h-2 w-2 rounded-full ${stats.lastBatch.status === "CONFIRMED" ? "bg-green-500" : stats.lastBatch.status === "FAILED" ? "bg-red-500" : "bg-yellow-500"}`}
                          ></span>
                          {stats.lastBatch.status} (
                          {new Date(stats.lastBatch.createdAt).toLocaleDateString()})
                        </>
                      ) : (
                        "No batches yet"
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card bg-accent/5 border-accent/20 relative flex max-h-64 flex-col items-center justify-center overflow-hidden border p-8 text-center backdrop-blur-sm">
                <div className="bg-accent/10 pointer-events-none absolute right-0 top-0 -mr-10 -mt-10 min-h-[200px] min-w-[200px] rounded-full p-12 blur-3xl"></div>
                <h3 className="z-10 mb-2 text-lg font-semibold text-foreground">
                  Verification Requests
                </h3>
                <p className="text-muted z-10 mb-6 max-w-sm text-sm">
                  Manage recent academic verification requests from employers manually or let the
                  Auto-claims process proofs securely.
                </p>
                <Link
                  href="/institution/verifications"
                  className="btn-primary z-10 flex items-center gap-2"
                >
                  View Verifications <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </GuardKyc>
      )}
    </DashboardLayout>
  )
}
