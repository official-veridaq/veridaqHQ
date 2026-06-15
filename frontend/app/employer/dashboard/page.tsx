"use client"
import { HistoryTable } from "@/components/employer/history-table"
import { EmployerLayout } from "@/components/employer/layout"
import { CreditPurchaseModal } from "@/components/employer/credit-purchase-modal"
import { VerifyButton } from "@/components/employer/verify-button"
import { GuardKyc } from "@/components/ui/guard-kyc"
import { StatCard } from "@/components/ui/stat-card"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { toast } from "@/components/ui/toast"
import { Sparkles } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function EmployerDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [history, setHistory] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPurchase, setShowPurchase] = useState(false)

  function load() {
    if (!user) return
    Promise.all([api.get("/employer/profile"), api.get("/verify/history?page=1&limit=5")])
      .then(([p, h]) => {
        setProfile(p.data)
        setHistory(h.data)
      })
      .catch(() => toast.error("Failed to load dashboard data"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [user])

  const totalAvailable = (profile?.freeVerificationsRemaining ?? 0) + (profile?.verificationCredits ?? 0)

  return (
    <EmployerLayout title="Dashboard">
      {loading ? (
        <div className="text-muted flex h-64 items-center justify-center text-sm">Loading…</div>
      ) : (
        <GuardKyc>
          <CreditPurchaseModal
            open={showPurchase}
            onClose={() => setShowPurchase(false)}
            onSuccess={load}
          />
          <div className="animate-fade-in space-y-8">
            <h1 className="text-2xl font-semibold text-foreground">
              Welcome back, {profile?.name || "Employer"}!
            </h1>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <StatCard label="Free Trials Left" value={profile?.freeVerificationsRemaining ?? 0} />
              <StatCard label="Paid Credits" value={profile?.verificationCredits ?? 0} accent />
              <StatCard label="Total Available" value={totalAvailable} />
              <StatCard label="Account Status" value={profile?.kycApproved ? "Active" : "Pending"} />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPurchase(true)}
                className="bg-accent text-void hover:bg-accent/90 inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors"
              >
                <Sparkles size={16} /> Buy Credits
              </button>
            </div>

            <div className="bg-surface-border/20 border-surface-border rounded-lg border p-5">
              <h2 className="mb-2 flex items-center gap-2 font-medium text-foreground">Quick Guide</h2>
              <p className="text-muted mb-3 text-sm leading-relaxed">
                Veridaq uses Zero-Knowledge Proofs to verify student credentials mathematically
                without revealing their plain-text records.
              </p>
              <ul className="text-muted list-inside list-disc space-y-2 text-sm">
                <li>Select the graduating institution of the candidate.</li>
                <li>Enter their exact Registration / Matriculation number.</li>
                <li>Select the academic claim threshold you wish to verify.</li>
                <li>Click Verify. Note that each query consumes one verification credit.</li>
              </ul>
            </div>

            <div className="card">
              <h2 className="mb-4 font-medium text-foreground">New Verification</h2>
              <VerifyButton onComplete={load} />
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-medium text-foreground">Recent Verifications</h2>
                <Link href="/employer/history" className="text-accent text-sm hover:underline">View all</Link>
              </div>
              <HistoryTable items={history?.items ?? []} />
            </div>
          </div>
        </GuardKyc>
      )}
    </EmployerLayout>
  )
}
