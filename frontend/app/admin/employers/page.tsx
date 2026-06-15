"use client"
import { AdminLayout } from "@/components/admin/layout"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { toast } from "@/components/ui/toast"
import { useEffect, useState } from "react"

export default function EmployersPage() {
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [deactivateReason, setDeactivateReason] = useState("")

  async function load() {
    try {
      setLoading(true)
      const { data: d } = await api.get("/admin/employers?page=1")
      setData(d)
    } catch {
      toast.error("Failed to load employers")
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
    try {
      await api.post(`/admin/employers/${id}/approve`)
      toast.success("Employer approved")
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to approve employer")
    }
  }

  async function submitDeactivate(id: string) {
    if (!deactivateReason || deactivateReason.length < 10) {
      toast.error("Please provide a valid reason (min 10 chars)")
      return
    }
    try {
      await api.post(`/admin/employers/${id}/deactivate`, { reason: deactivateReason })
      toast.success("Employer deactivated")
      setDeactivatingId(null)
      setDeactivateReason("")
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Error deactivating employer")
    }
  }

  return (
    <AdminLayout title="Employers">
      {loading ? (
        <div className="text-muted py-12 text-center text-sm">Loading…</div>
      ) : (
        <div className="bg-surface-card border-surface-border group [perspective:500px] hover:[transform:rotateX(0.5deg)] rounded-xl border transition-all duration-500 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-surface-border border-b text-left">
                <th className="text-muted p-3 font-medium">Name</th>
                <th className="text-muted hidden p-3 font-medium md:table-cell">Email</th>
                <th className="text-muted hidden p-3 font-medium lg:table-cell">CAC</th>
                <th className="text-muted p-3 font-medium">Free Verifications</th>
                <th className="text-muted p-3 font-medium">Status / KYC</th>
                <th className="text-muted p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((emp: any) => (
                <tr key={emp.id} className="table-row">
                  <td className="py-3 text-foreground">{emp.name}</td>
                  <td className="text-muted hidden py-3 md:table-cell">{emp.email}</td>
                  <td className="text-muted hidden py-3 font-mono text-xs lg:table-cell">{emp.cacNumber}</td>
                  <td className="py-3 text-foreground">{emp.freeVerificationsRemaining}</td>
                  <td className="py-3">
                    {!emp.active ? (
                      <span className="inline-block rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">Deactivated</span>
                    ) : emp.kycApproved ? (
                      <span className="inline-block rounded-full border border-accent/20 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">Approved</span>
                    ) : (
                      <span className="inline-block rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-400">Pending</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center space-x-3">
                      {!emp.kycApproved && emp.active && (
                        <button
                          className="text-accent rounded bg-accent/10 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent/20"
                          onClick={() => approve(emp.id)}
                        >
                          Approve
                        </button>
                      )}
                      {emp.kycApproved && emp.active && (
                        <button
                          className="rounded bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                          onClick={() => setDeactivatingId(emp.id)}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                    {deactivatingId === emp.id && (
                      <div className="group mt-2 rounded-lg border border-red-500/20 bg-red-500/[0.02] p-4 transition-all">
                        <p className="text-muted mb-2 text-xs">
                          A valid reason is required. This will email the employer.
                        </p>
                        <input
                          type="text"
                          placeholder="Reason (min 10 chars)..."
                          className="border-surface-border bg-void mb-3 w-full rounded border px-3 py-2 text-xs text-foreground transition-colors focus:border-red-400 focus:outline-none"
                          value={deactivateReason}
                          onChange={(e) => setDeactivateReason(e.target.value)}
                        />
                        <div className="flex space-x-3">
                          <button
                            onClick={() => submitDeactivate(emp.id)}
                            className="rounded bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-600 active:scale-[0.97]"
                          >
                            Confirm Closure
                          </button>
                          <button
                            onClick={() => setDeactivatingId(null)}
                            className="text-muted rounded px-3 py-1.5 text-xs transition-colors hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
