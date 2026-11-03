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
    api
      .get("/institution/verifications")
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
        return (
          <span className="flex items-center gap-1 border border-orange-400/20 bg-orange-400/10 px-2 py-1 text-xs text-orange-400">
            <Clock className="h-3 w-3" /> Manual Review
          </span>
        )
      case "PROCESSING":
        return (
          <span className="flex items-center gap-1 border border-blue-400/20 bg-blue-400/10 px-2 py-1 text-xs text-blue-400">
            <Clock className="h-3 w-3" /> Generating Proof
          </span>
        )
      case "COMPLETED":
        return (
          <span className="text-accent bg-accent/10 border-accent/20 flex items-center gap-1 border px-2 py-1 text-xs">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </span>
        )
      case "FAILED":
        return (
          <span className="flex items-center gap-1 border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-500">
            <XCircle className="h-3 w-3" /> Failed/Rejected
          </span>
        )
      default:
        return (
          <span className="text-muted border-surface-border border px-2 py-1 text-xs">
            {status}
          </span>
        )
    }
  }

  return (
    <DashboardLayout title="Verification Requests">
      <p className="text-muted mb-6 max-w-2xl text-sm">
        Monitor incoming verification requests from employers. Claims configured for &quot;Manual
        Review&quot; require your explicit approval before the Zero-Knowledge Proof is generated.
      </p>

      {loading ? (
        <div className="text-muted py-12 text-center text-sm">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="border-surface-border bg-surface-card flex flex-col items-center border p-12 text-center">
          <Clock className="text-muted mb-4 h-12 w-12 opacity-50" />
          <h3 className="text-foreground mb-2 text-lg font-medium">No Requests Found</h3>
          <p className="text-muted mb-6 max-w-md text-sm">
            There are no verification requests associated with your institution yet.
          </p>
        </div>
      ) : (
        <div className="border-surface-border bg-surface-card overflow-x-auto rounded border">
          <table className="text-foreground w-full text-left text-sm">
            <thead className="bg-void/50 text-muted border-surface-border border-b text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Employer</th>
                <th className="px-4 py-3 font-medium">Matric No.</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Claim Code</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-surface-border divide-y">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-void/30 transition-colors">
                  <td className="text-muted whitespace-nowrap px-4 py-3">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {r.employer?.name || r.employerId.substring(0, 8)}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono opacity-80">{r.matricNumber}</td>
                  <td className="hidden px-4 py-3 md:table-cell">Code {r.claimType}</td>
                  <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "AWAITING_INSTITUTION" && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleApprove(r.id)}
                          disabled={processingId === r.id}
                          className="text-accent hover:bg-accent/10 border-accent/20 flex items-center gap-1 border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <Check className="h-3 w-3" /> Approve
                        </button>
                        <button
                          onClick={() => handleDecline(r.id)}
                          disabled={processingId === r.id}
                          className="flex items-center gap-1 border border-red-400/20 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/10 disabled:opacity-50"
                        >
                          <X className="h-3 w-3" /> Decline
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
