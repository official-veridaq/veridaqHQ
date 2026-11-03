"use client"
import { AdminLayout } from "@/components/admin/layout"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { RefreshCcw, ShieldAlert, ShieldCheck, Wallet, X } from "lucide-react"
import { toast } from "@/components/ui/toast"
import { useEffect, useState } from "react"
import { formatStellarBalance } from "@/lib/utils"

export default function InstitutionsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [fundTarget, setFundTarget] = useState<any>(null)
  const [fundAmount, setFundAmount] = useState("")
  const [fundError, setFundError] = useState("")
  const [fundTxHash, setFundTxHash] = useState("")
  const [syncingId, setSyncingId] = useState<string | null>(null)

  async function load(page = 1) {
    try {
      setLoading(true)
      const { data: d } = await api.get(`/admin/institutions?page=${page}`)
      setData(d)
    } catch {
      toast.error("Failed to load institutions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      load()
    }
  }, [user])

  async function approve(id: string) {
    setApprovingId(id)
    try {
      await api.post(`/admin/institutions/${id}/approve`)
      toast.success("Institution approved and registered on-chain")
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Approval failed")
    } finally {
      setApprovingId(null)
    }
  }

  async function syncBalance(id: string) {
    setSyncingId(id)
    try {
      await api.post(`/admin/institutions/${id}/sync-balance`)
      toast.success("Balance synced from chain")
      load()
    } catch {
      toast.error("Failed to sync balance")
    } finally {
      setSyncingId(null)
    }
  }

  async function fundInstitution() {
    if (!fundTarget) return
    setFundError("")
    setFundTxHash("")

    try {
      const { data: res } = await api.post(`/admin/institutions/${fundTarget.id}/fund`, {
        amountEth: fundAmount,
      })
      setFundTxHash(res.txHash || "")
      toast.success("Institution funded successfully")
      load()
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Funding failed"
      setFundError(msg)
      toast.error(msg)
    }
  }

  return (
    <AdminLayout title="Institution Management">
      <p className="text-muted mb-6 max-w-2xl text-sm">
        Review pending KYC requests. Approving an institution triggers the backend to submit their
        public key to the InstitutionRegistry smart contract on Stellar.
      </p>

      {loading ? (
        <div className="text-muted py-12 text-center text-sm">Loading institutions...</div>
      ) : data?.items?.length === 0 ? (
        <div className="border-surface-border bg-surface-card flex flex-col items-center border p-12 text-center">
          <h3 className="text-foreground mb-2 text-lg font-medium">No Institutions Found</h3>
        </div>
      ) : (
        <div className="bg-surface-card border-surface-border group overflow-x-auto rounded-xl border transition-all duration-500 [perspective:500px] hover:[transform:rotateX(0.5deg)]">
          <table className="text-foreground w-full text-left text-sm">
            <thead className="text-muted border-surface-border border-b text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Wallet (Admin)</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Credit</th>
                <th className="px-4 py-3 font-medium">KYC Status</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Date Joined</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-surface-border divide-y">
              {data?.items?.map((inst: any) => (
                <tr key={inst.id} className="hover:bg-void/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-foreground font-medium">{inst.name}</div>
                    <div className="text-muted text-xs">{inst.email}</div>
                  </td>
                  <td className="text-muted hidden max-w-[200px] truncate px-4 py-3 font-mono text-xs lg:table-cell">
                    {inst.adminWallet}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`${inst.tier === "FREE" ? "border-orange-500/20 bg-orange-500/10 text-orange-400" : "border-blue-500/20 bg-blue-500/10 text-blue-400"} inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium`}
                    >
                      {inst.tier}
                    </span>
                  </td>
                  <td className="text-muted hidden px-4 py-3 font-mono text-xs md:table-cell">
                    {formatStellarBalance(inst.paymasterBalance || "0")} XLM
                  </td>
                  <td className="px-4 py-3">
                    {inst.kycApproved ? (
                      <span className="text-accent flex items-center gap-1 text-xs font-medium">
                        <ShieldCheck className="h-3 w-3" /> VERIFIED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-orange-400">
                        <ShieldAlert className="h-3 w-3" /> PENDING
                      </span>
                    )}
                  </td>
                  <td className="text-muted hidden whitespace-nowrap px-4 py-3 text-xs md:table-cell">
                    {new Date(inst.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!inst.kycApproved ? (
                        <button
                          onClick={() => approve(inst.id)}
                          disabled={approvingId === inst.id}
                          className="bg-accent text-void px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {approvingId === inst.id ? "Submitting TX..." : "Approve KYC"}
                        </button>
                      ) : (
                        <span className="text-muted text-xs">On-Chain</span>
                      )}
                      <button
                        onClick={() => syncBalance(inst.id)}
                        className="btn-ghost text-xs"
                        disabled={syncingId === inst.id}
                      >
                        <RefreshCcw
                          className={`h-3 w-3 ${syncingId === inst.id ? "animate-spin" : ""}`}
                        />
                      </button>
                      <button
                        onClick={() => {
                          setFundTarget(inst)
                          setFundAmount("")
                          setFundError("")
                          setFundTxHash("")
                        }}
                        className="bg-surface-border hover:bg-surface-border/80 text-foreground rounded px-2 py-1.5 text-xs"
                      >
                        Fund
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {fundTarget && (
        <div className="bg-void/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="group w-full max-w-lg [perspective:500px]">
            <div className="border-surface-border bg-surface-card shadow-elevated relative overflow-hidden rounded-xl border p-6 transition-all duration-500 hover:[transform:rotateX(0.5deg)]">
              <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div className="from-accent/[0.03] absolute inset-0 bg-gradient-to-br to-transparent" />
              </div>
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="text-foreground flex items-center gap-2">
                    <Wallet className="text-accent h-4 w-4" />
                    <span className="font-display text-sm font-semibold tracking-wide">
                      Fund Institution
                    </span>
                  </div>
                  <button
                    onClick={() => setFundTarget(null)}
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-muted mt-2 text-xs">{fundTarget.name}</p>

                <div className="mt-4">
                  <label className="text-muted text-xs">Amount in XLM</label>
                  <input
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    className="border-surface-border bg-void text-foreground focus:border-accent mt-2 w-full rounded border px-3 py-2 text-sm transition-colors focus:outline-none"
                    placeholder="0.01"
                  />
                </div>

                {fundError && <p className="mt-3 text-xs text-red-400">{fundError}</p>}
                {fundTxHash && (
                  <p className="text-muted mt-3 font-mono text-xs">
                    Tx: {fundTxHash.slice(0, 42)}...
                  </p>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setFundTarget(null)}
                    className="border-surface-border text-foreground hover:bg-surface rounded border px-3 py-2 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={fundInstitution}
                    className="bg-accent text-void rounded px-4 py-2 text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                  >
                    Send Funds
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
