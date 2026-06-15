"use client"
import { AdminLayout } from "@/components/admin/layout"
import { StatCard } from "@/components/ui/stat-card"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Activity, Settings, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "@/components/ui/toast"

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    // Initial fetch to paint the DOM quickly
    api
      .get("/admin/stats")
      .then(({ data }) => setStats(data))
      .catch((err: any) => {
        const msg = err?.response?.data?.error ?? "Failed to load admin stats"
        toast.error(msg)
      })
      .finally(() => setLoading(false))

    // Server-Sent Events for realtime updates from /api/stats/streaming
    const evtSource = new EventSource("http://localhost:4000/api/stats/streaming")

    evtSource.addEventListener("stats_update", (e) => {
      try {
        const liveStats = JSON.parse(e.data)
        setStats(liveStats)
      } catch {
        toast.error("Live stats stream failed to parse")
      }
    })

    return () => {
      evtSource.close()
    }
  }, [user])

  const adminBalanceEth = parseFloat(stats?.adminWalletBalance ?? "0")
  const isLowBalance = adminBalanceEth < 0.05

  return (
    <AdminLayout title="Platform Operator Dashboard">
      {loading ? (
        <div className="text-muted py-12 text-center text-sm">Loading telemetry...</div>
      ) : (
          <div className="animate-fade-in space-y-8">
          {/* Bento grid — Main Key Stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="group [perspective:500px] hover:[transform:rotateX(0.5deg)] transition-transform duration-300">
              <StatCard label="Total Institutions" value={stats?.institutions ?? 0} />
            </div>
            <div className="group [perspective:500px] hover:[transform:rotateX(0.5deg)] transition-transform duration-300">
              <StatCard label="Total Employers" value={stats?.employers ?? 0} />
            </div>
            <div className="group [perspective:500px] hover:[transform:rotateX(0.5deg)] transition-transform duration-300">
              <StatCard label="Confirmed Batches" value={stats?.confirmedBatches ?? 0} />
            </div>
            <div className="group [perspective:500px] hover:[transform:rotateX(0.5deg)] transition-transform duration-300">
              <StatCard
                label="Total Verified Proofs"
                value={stats?.successfulVerifications ?? 0}
                accent
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="group [perspective:500px] hover:[transform:rotateX(0.5deg)] transition-transform duration-300">
              <StatCard label="Total Credentials" value={stats?.totalCredentials ?? 0} />
            </div>
            <div className="group [perspective:500px] hover:[transform:rotateX(0.5deg)] transition-transform duration-300">
              <StatCard label="Revoked Credentials" value={stats?.revokedCredentials ?? 0} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Wallet Info — glass card with 3D tilt */}
            <div
              className={`group [perspective:500px] hover:[transform:rotateX(1deg)] overflow-hidden border transition-all duration-500 ${
                isLowBalance ? 'border-red-500/50 bg-red-500/5' : 'bg-surface-card border-surface-border'
              } relative flex flex-col justify-center p-6`}
            >
              <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent" />
              </div>
              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground">
                    <ShieldCheck className="text-accent h-4 w-4" />
                    Admin Wallet
                  </h3>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">BASE SEPOLIA</span>
                </div>
                <p className="mb-2 font-mono text-3xl tracking-tight">
                  {adminBalanceEth.toFixed(4)} <span className="text-muted text-sm">ETH</span>
                </p>
                {isLowBalance && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-red-400">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
                    Balance low — operations may fail without gas.
                  </p>
                )}
              </div>
            </div>

            {/* Paymaster Info — glass card with 3D tilt */}
            <div className="group [perspective:500px] hover:[transform:rotateX(1deg)] bg-surface-card border-surface-border relative overflow-hidden border p-6 transition-all duration-500">
              <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.03] to-transparent" />
              </div>
              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground">
                    <Activity className="h-4 w-4 text-orange-400" />
                    Paymaster Vault
                  </h3>
                </div>
                <div className="mb-2 space-y-1.5">
                  <div className="flex items-baseline justify-between rounded bg-black/20 px-3 py-2">
                    <span className="text-muted text-xs">Sponsored Pool</span>
                    <span className="font-mono text-xl tracking-tight">
                      {stats?.sponsoredPoolEth ? parseFloat(stats.sponsoredPoolEth).toFixed(4) : "0"}{" "}
                      <span className="text-muted text-xs">ETH</span>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between rounded bg-black/20 px-3 py-2">
                    <span className="text-muted text-xs">EntryPoint Deposit</span>
                    <span className="font-mono text-sm">
                      {stats?.entryPointDepositEth ? parseFloat(stats.entryPointDepositEth).toFixed(4) : "0"}{" "}
                      <span className="text-muted text-xs">ETH</span>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between rounded bg-black/20 px-3 py-2">
                    <span className="text-muted text-xs">Contract Balance</span>
                    <span className="font-mono text-sm text-muted">
                      {stats?.paymasterBalance ? parseFloat(stats.paymasterBalance).toFixed(4) : "0"}{" "}
                      <span className="text-xs">ETH</span>
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-muted relative text-xs">
                Sponsors gas fees for Institution transactions via ERC-4337.
              </p>
            </div>
          </div>

          {/* Active Institutions — bento pill display */}
          {stats?.activeInstitutionNames?.length > 0 && (
            <div className="bg-surface-card border-surface-border group [perspective:500px] hover:[transform:rotateX(0.5deg)] overflow-hidden rounded-lg border p-6 transition-all duration-500">
              <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/[0.02] to-transparent" />
              </div>
              <h3 className="font-display mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground">
                <Activity className="h-4 w-4 text-green-400" />
                Active Institutions ({stats.activeInstitutionNames.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.activeInstitutionNames.map((name: string) => (
                  <span
                    key={name}
                    className="bg-accent/10 text-accent rounded-full border border-accent/20 px-3 py-1 text-xs font-medium"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Links — 3D tilt bento grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/admin/institutions"
              className="group [perspective:500px] hover:[transform:rotateX(1deg)] border-surface-border bg-void hover:bg-surface-card block rounded border p-6 transition-all duration-300"
            >
              <h3 className="font-display group-hover:text-accent mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground transition-colors">
                <Settings className="h-4 w-4" /> Institutions
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                Review pending KYCs, approve registrations, and manage subscription tiers.
              </p>
            </Link>

            <Link
              href="/admin/employers"
              className="group [perspective:500px] hover:[transform:rotateX(1deg)] border-surface-border bg-void hover:bg-surface-card block rounded border p-6 transition-all duration-300"
            >
              <h3 className="font-display group-hover:text-accent mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground transition-colors">
                <Settings className="h-4 w-4" /> Employers
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                Review employer signups and monitor verification history.
              </p>
            </Link>

            <Link
              href="/admin/payments"
              className="group [perspective:500px] hover:[transform:rotateX(1deg)] border-surface-border bg-void hover:bg-surface-card block rounded border p-6 transition-all duration-300"
            >
              <h3 className="font-display group-hover:text-accent mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground transition-colors">
                <Settings className="h-4 w-4" /> Payments
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                View all payment transactions across institutions and employers.
              </p>
            </Link>

            <Link
              href="/admin/audit"
              className="group [perspective:500px] hover:[transform:rotateX(1deg)] border-surface-border bg-void hover:bg-surface-card block rounded border p-6 transition-all duration-300"
            >
              <h3 className="font-display group-hover:text-accent mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground transition-colors">
                <Settings className="h-4 w-4" /> Audit
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                Transparent audit trail for all platform operations and financial actions.
              </p>
            </Link>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
