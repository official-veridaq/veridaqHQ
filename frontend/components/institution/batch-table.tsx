/**
 * Table of credential batches for the institution portal.
 */
import { api } from "@/lib/api"
import { toast } from "@/components/ui/toast"
import { format } from "date-fns"

type Batch = {
  id: string
  status: string
  studentCount: number
  graduationYear: number
  createdAt: string
  txHash?: string
  errorReport?: Array<{
    row?: number
    error?: string
    txRef?: string
    txHash?: string
    userOpHash?: string
    institutionTier?: number
    sponsoredPool?: string
    institutionBalance?: string
    entryPointDeposit?: string
    maxCostEstimate?: string
    availableFundsWei?: string
    availableFundsEth?: string
    fundingShortfallWei?: string
    fundingShortfallEth?: string
    hasEnoughFunds?: boolean
    hasEnoughEntryPointDeposit?: boolean
  }>
}

const statusClass: Record<string, string> = {
  CONFIRMED: "badge-green",
  PROCESSING: "badge-blue",
  PENDING: "badge-yellow",
  FAILED: "badge-red",
}

export function BatchTable({ batches, onDismiss }: { batches: Batch[]; onDismiss?: () => void }) {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "trin404nex@gmail.com"

  if (batches.length === 0) {
    return (
      <div className="text-muted py-10 text-center text-sm">
        No batches yet. Upload your first Excel file.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-surface-border border-b text-left">
            <th className="text-muted pb-3 font-medium">Date</th>
            <th className="text-muted pb-3 font-medium">Students</th>
            <th className="text-muted hidden pb-3 font-medium sm:table-cell">Year</th>
            <th className="text-muted pb-3 font-medium">Status</th>
            <th className="text-muted hidden pb-3 font-medium lg:table-cell">Tx Hash</th>
            <th className="text-muted pb-3 font-medium">Issues</th>
            <th className="text-muted pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => (
            <tr key={b.id} className="table-row">
              <td className="text-muted py-3">{format(new Date(b.createdAt), "dd MMM yyyy")}</td>
              <td className="py-3 text-foreground">{b.studentCount}</td>
              <td className="hidden py-3 text-foreground sm:table-cell">{b.graduationYear}</td>
              <td className="py-3">
                <span className={statusClass[b.status] ?? "badge-muted"}>{b.status}</span>
              </td>
              <td className="text-muted hidden py-3 font-mono text-xs lg:table-cell">
                {b.txHash ? (
                  <a
                    href={`https://sepolia.basescan.org/tx/${b.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {b.txHash.slice(0, 10)}…
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="text-muted py-3 text-xs">
                {b.status === "FAILED" && b.errorReport?.length ? (
                  <details className="group">
                    <summary className="cursor-pointer text-red-400 hover:text-red-300">
                      View details
                    </summary>
                    <div className="glass-panel shimmer-sweep border-surface-border bg-void mt-2 rounded border p-3 text-xs text-foreground">
                      <div className="text-muted mb-2">Batch ID: {b.id}</div>
                      <div className="space-y-2">
                        {b.errorReport.map((err, i) => (
                          <div
                            key={i}
                            className="border-surface-border/60 border-b pb-2 last:border-b-0"
                          >
                            <div className="text-red-300">{err.error || "Unknown error"}</div>
                            {err.txRef && <div className="text-muted">Tx Ref: {err.txRef}</div>}
                            {err.userOpHash && (
                              <div className="text-muted">UserOp: {err.userOpHash}</div>
                            )}
                            {err.txHash && <div className="text-muted">Tx Hash: {err.txHash}</div>}
                            {typeof err.institutionTier === "number" && (
                              <div className="text-muted">
                                Institution Tier: {err.institutionTier}
                              </div>
                            )}
                            {err.sponsoredPool && (
                              <div className="text-muted">Sponsored Pool: {err.sponsoredPool}</div>
                            )}
                            {err.institutionBalance && (
                              <div className="text-muted">
                                Institution Balance: {err.institutionBalance}
                              </div>
                            )}
                            {err.entryPointDeposit && (
                              <div className="text-muted">
                                EntryPoint Deposit: {err.entryPointDeposit}
                              </div>
                            )}
                            {err.maxCostEstimate && (
                              <div className="text-muted">
                                Max Cost Estimate: {err.maxCostEstimate}
                              </div>
                            )}
                            {err.availableFundsEth && (
                              <div className="text-muted">
                                Available Funds: {err.availableFundsEth}
                              </div>
                            )}
                            {err.fundingShortfallEth && err.fundingShortfallEth !== "0" && (
                              <div className="text-red-300">
                                Funding Shortfall: {err.fundingShortfallEth}
                              </div>
                            )}
                            {typeof err.hasEnoughFunds === "boolean" && (
                              <div className="text-muted">
                                Funding Status: {err.hasEnoughFunds ? "Enough" : "Insufficient"}
                              </div>
                            )}
                            {typeof err.hasEnoughEntryPointDeposit === "boolean" && (
                              <div className="text-muted">
                                EntryPoint Status:{" "}
                                {err.hasEnoughEntryPointDeposit ? "Enough" : "Insufficient"}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <a
                        className="btn-ghost mt-3 inline-flex text-xs"
                        href={`mailto:${supportEmail}?subject=Batch%20failure%20${b.id}&body=Batch%20${b.id}%20failed.%20Please%20review%20the%20on-chain%20logs%20and%20error%20report.`}
                      >
                        Contact Admin
                      </a>
                    </div>
                  </details>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-3">
                {b.status === "FAILED" && (
                  <button
                    className="btn-ghost text-xs"
                    onClick={async () => {
                      try {
                        await api.delete(`/institution/batch/${b.id}`)
                        toast.success("Batch dismissed")
                        onDismiss?.()
                      } catch (err: any) {
                        toast.error(err?.response?.data?.error ?? "Failed to dismiss batch")
                      }
                    }}
                  >
                    Dismiss
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
