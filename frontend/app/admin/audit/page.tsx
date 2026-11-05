"use client"
import { AdminLayout } from "@/components/admin/layout"
import { api } from "@/lib/api"
import { toast } from "@/components/ui/toast"
import { Activity } from "lucide-react"
import { useEffect, useState } from "react"

type AuditEntry = {
  id: string
  action: string
  details: Record<string, unknown>
  institutionId: string | null
  employerId: string | null
  adminId: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get("/admin/audit")
      .then(({ data }) => setLogs(data.items ?? []))
      .catch(() => toast.error("Failed to load audit log"))
      .finally(() => setLoading(false))
  }, [])

  const actionColor: Record<string, string> = {
    INSTITUTION_REGISTERED: "text-blue-500 bg-blue-500/10",
    EMPLOYER_REGISTERED: "text-cyan-500 bg-cyan-500/10",
    TIER_CHANGED: "text-purple-500 bg-purple-500/10",
    PAYMENT_INSTITUTION_UPGRADE: "text-green-500 bg-green-500/10",
    PAYMENT_INSTITUTION_FUNDING: "text-emerald-500 bg-emerald-500/10",
    PAYMENT_EMPLOYER_TOPUP: "text-teal-500 bg-teal-500/10",
    BATCH_CONFIRMED: "text-accent bg-accent/10",
    CREDENTIAL_REVOKED: "text-red-500 bg-red-500/10",
    INSTITUTION_DEACTIVATED: "text-orange-500 bg-orange-500/10",
    EMPLOYER_DEACTIVATED: "text-orange-500 bg-orange-500/10",
  }

  function getActionBadge(action: string) {
    const color = actionColor[action] ?? "text-muted bg-muted/10"
    return (
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
        {action.replace(/_/g, " ")}
      </span>
    )
  }

  return (
    <AdminLayout title="Audit Log">
      {loading ? (
        <div className="text-muted flex h-64 items-center justify-center text-sm">Loading…</div>
      ) : (
        <div className="animate-fade-in space-y-6">
          <div className="bg-surface-card border-surface-border group rounded-lg border p-5 transition-all duration-500 [perspective:500px] hover:[transform:rotateX(0.5deg)]">
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 flex h-8 w-8 items-center justify-center rounded-lg">
                <Activity className="text-accent h-4 w-4" />
              </div>
              <div>
                <p className="font-display text-foreground text-sm font-semibold tracking-wide">
                  Audit Trail
                </p>
                <p className="text-muted text-xs">
                  Every financial transaction, administrative action, and system event is recorded
                  immutably.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface-card border-surface-border group overflow-x-auto rounded-xl border transition-all duration-500 [perspective:500px] hover:[transform:rotateX(0.5deg)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-surface-border text-muted border-b text-xs">
                  <th className="p-3 font-medium">Action</th>
                  <th className="hidden p-3 font-medium md:table-cell">Details</th>
                  <th className="hidden p-3 font-medium lg:table-cell">Entity</th>
                  <th className="p-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-muted p-6 text-center text-sm">
                      No audit logs yet
                    </td>
                  </tr>
                )}
                {logs.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-surface-border/50 border-b last:border-0 hover:bg-white/5"
                  >
                    <td className="p-3">{getActionBadge(entry.action)}</td>
                    <td className="text-muted hidden max-w-xs truncate p-3 text-xs md:table-cell">
                      {entry.action.startsWith("PAYMENT")
                        ? `Amount: ${(Number((entry.details as any)?.amount ?? 0) / 1e7).toFixed(4)} XLM`
                        : entry.action.startsWith("BATCH")
                          ? `${(entry.details as any)?.count ?? "?"} credentials`
                          : entry.action.startsWith("TIER")
                            ? `→ ${(entry.details as any)?.newTier ?? "?"}`
                            : JSON.stringify(entry.details).slice(0, 80)}
                    </td>
                    <td className="text-muted hidden p-3 text-xs lg:table-cell">
                      {entry.institutionId
                        ? `Inst: ${entry.institutionId.slice(0, 8)}...`
                        : entry.employerId
                          ? `Emp: ${entry.employerId.slice(0, 8)}...`
                          : entry.adminId
                            ? `Admin: ${entry.adminId.slice(0, 8)}...`
                            : "System"}
                    </td>
                    <td className="text-muted p-3 text-xs">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
