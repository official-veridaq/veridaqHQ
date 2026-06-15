"use client"

import { DashboardLayout } from "@/components/institution/layout"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { toast } from "@/components/ui/toast"
import { useEffect, useState } from "react"
import { Check, X, Clock, CheckCircle2, XCircle } from "lucide-react"

export default function VerificationsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchVerifications = () => {
    api.get("/institution/verifications")
      .then(({ data }) => setRequests(data?.items || []))
      .catch((err: any) => {
        const msg = err?.response?.data?.error ?? "Failed to load verification requests"
        toast.error(msg)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user) return
    fetchVerifications()
  }, [user])

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    try {
      await api.post(`/institution/verifications/${id}/approve`)
      toast.success("Verification approved")
      fetchVerifications()
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to approve")
    } finally {
      setProcessingId(null)
    }
  }

  const handleDecline = async (id: string) => {
    setProcessingId(id)
    try {
      await api.post(`/institution/verifications/${id}/decline`)
      toast.success("Verification declined")
      fetchVerifications()
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to decline")
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AWAITING_INSTITUTION":
        return <span className="flex items-center gap-1 text-orange-400 bg-orange-400/10 px-2 py-1 text-xs border border-orange-400/20"><Clock className="w-3 h-3" /> Manual Review</span>
      case "PROCESSING":
        return <span className="flex items-center gap-1 text-blue-400 bg-blue-400/10 px-2 py-1 text-xs border border-blue-400/20"><Clock className="w-3 h-3" /> Generating Proof</span>
      case "COMPLETED":
        return <span className="flex items-center gap-1 text-accent bg-accent/10 px-2 py-1 text-xs border border-accent/20"><CheckCircle2 className="w-3 h-3" /> Completed</span>
      case "FAILED":
        return <span className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-1 text-xs border border-red-500/20"><XCircle className="w-3 h-3" /> Failed/Rejected</span>
      default:
        return <span className="text-muted text-xs border border-surface-border px-2 py-1">{status}</span>
    }
  }

  return (
    <DashboardLayout title="Verification Requests">
      <p className="text-muted text-sm mb-6 max-w-2xl">
        Monitor incoming verification requests from employers. Claims configured for &quot;Manual Review&quot; require your explicit approval before the Zero-Knowledge Proof is generated.
      </p>

      {loading ? (
        <div className="text-muted py-12 text-center text-sm">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="border border-surface-border bg-surface-card p-12 text-center flex flex-col items-center">
          <Clock className="w-12 h-12 text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Requests Found</h3>
          <p className="text-muted text-sm mb-6 max-w-md">
            There are no verification requests associated with your institution yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-surface-border rounded bg-surface-card">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-void/50 text-xs uppercase text-muted border-b border-surface-border">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Employer</th>
                <th className="px-4 py-3 font-medium">Matric No.</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Claim Code</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-void/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.employer?.name || r.employerId.substring(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3 font-mono opacity-80">{r.matricNumber}</td>
                  <td className="hidden px-4 py-3 md:table-cell">Code {r.claimType}</td>
                  <td className="px-4 py-3">
                    {getStatusBadge(r.status)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "AWAITING_INSTITUTION" && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleApprove(r.id)}
                          disabled={processingId === r.id}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/10 border border-accent/20 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button
                          onClick={() => handleDecline(r.id)}
                          disabled={processingId === r.id}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-400/10 border border-red-400/20 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3 h-3" /> Decline
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  )
}
