"use client"
import { AdminLayout } from "@/components/admin/layout"
import { api } from "@/lib/api"
import { toast } from "@/components/ui/toast"
import { useEffect, useState } from "react"

type PaymentRecord = {
  id: string
  referenceId: string
  type: string
  method: string | null
  status: string
  amountWei: string
  amountFiat: string | null
  fiatCurrency: string | null
  payerId: string
  payerRole: string
  txHash: string | null
  description: string | null
  createdAt: string
  completedAt: string | null
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("ALL")

  useEffect(() => {
    api
      .get("/admin/payments", { params: { status: filter !== "ALL" ? filter : undefined } })
      .then(({ data }) => setPayments(data.items ?? []))
      .catch(() => toast.error("Failed to load payments"))
      .finally(() => setLoading(false))
  }, [filter])

  const statusColor: Record<string, string> = {
    PENDING: "text-amber-500 bg-amber-500/10",
    COMPLETED: "text-green-500 bg-green-500/10",
    FAILED: "text-red-500 bg-red-500/10",
    REFUNDED: "text-orange-500 bg-orange-500/10",
  }

  return (
    <AdminLayout title="Payment History">
      {loading ? (
        <div className="text-muted flex h-64 items-center justify-center text-sm">Loading…</div>
      ) : (
          <div className="animate-fade-in space-y-6">
          {/* Filters — bento styled */}
          <div className="bg-surface-card border-surface-border flex flex-wrap items-center gap-2 rounded-lg border p-4">
            <span className="font-display text-muted mr-2 text-xs font-semibold tracking-wide uppercase">Filter</span>
            {["ALL", "PENDING", "COMPLETED", "FAILED", "REFUNDED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === s
                    ? "bg-accent text-void"
                    : "text-muted bg-surface-card border-surface-border border hover:text-foreground"
                }`}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-surface-card border-surface-border group [perspective:500px] hover:[transform:rotateX(0.5deg)] rounded-xl border transition-all duration-500 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-surface-border border-b text-xs text-muted">
                  <th className="p-3 font-medium">Reference</th>
                  <th className="p-3 font-medium hidden md:table-cell">Type</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium hidden lg:table-cell">Amount</th>
                  <th className="p-3 font-medium hidden lg:table-cell">Method</th>
                  <th className="p-3 font-medium hidden md:table-cell">Payer</th>
                  <th className="p-3 font-medium hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-muted p-6 text-center text-sm">
                      No payments found
                    </td>
                  </tr>
                )}
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-surface-border/50 border-b last:border-0 hover:bg-white/5"
                  >
                    <td className="p-3">
                      <code className="text-foreground break-all text-xs">{p.referenceId}</code>
                    </td>
                    <td className="p-3 text-foreground hidden md:table-cell">
                      {p.type.replace(/_/g, " ")}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusColor[p.status] ?? "text-muted"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-foreground hidden lg:table-cell">
                      {p.amountFiat
                        ? `${p.amountFiat} ${p.fiatCurrency ?? "USD"}`
                        : `${(Number(p.amountWei) / 1e18).toFixed(4)} ETH`}
                    </td>
                    <td className="p-3 text-muted hidden lg:table-cell">{p.method ?? "—"}</td>
                    <td className="p-3 text-muted hidden md:table-cell">
                      {p.payerRole} / {p.payerId.slice(0, 8)}...
                    </td>
                    <td className="p-3 text-muted hidden md:table-cell">
                      {new Date(p.createdAt).toLocaleDateString()}
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
