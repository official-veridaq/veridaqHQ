import { downloadReport } from "@/lib/api"
import { toast } from "@/components/ui/toast"
import { format } from "date-fns"
import { useState } from "react"

type Item = {
  id: string
  status: string
  result: string | null
  claimType: number
  createdAt: string
  completedAt?: string
  institution: { name: string }
}

const resultClass: Record<string, string> = {
  VERIFIED: "badge-green",
  CLAIM_NOT_SATISFIED: "badge-red",
  CREDENTIAL_REVOKED: "badge-red",
  RECORD_NOT_FOUND: "badge-red",
}

export function HistoryTable({ items }: { items: Item[] }) {
  const [downloading, setDownloading] = useState<string | null>(null)

  async function handleDownload(requestId: string) {
    setDownloading(requestId)
    try {
      await downloadReport(requestId)
    } catch {
      toast.error("Failed to download report")
    } finally {
      setDownloading(null)
    }
  }

  if (items.length === 0) {
    return <div className="text-muted py-10 text-center text-sm">No verification history yet.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-surface-border border-b text-left">
            <th className="text-muted pb-3 font-medium">Date</th>
            <th className="text-muted pb-3 font-medium">Institution</th>
            <th className="text-muted pb-3 font-medium">Claim</th>
            <th className="text-muted pb-3 font-medium">Result</th>
            <th className="text-muted pb-3 font-medium">Report</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="table-row">
              <td className="text-muted py-3">{format(new Date(item.createdAt), "dd MMM yyyy")}</td>
              <td className="py-3 text-foreground">{item.institution.name}</td>
              <td className="text-muted py-3">Type {item.claimType}</td>
              <td className="py-3">
                {item.result ? (
                  <span className={resultClass[item.result] ?? "badge-muted"}>
                    {item.result.replace(/_/g, " ")}
                  </span>
                ) : (
                  <span className="badge-yellow">{item.status}</span>
                )}
              </td>
              <td className="py-3">
                {item.result ? (
                  <button
                    onClick={() => handleDownload(item.id)}
                    disabled={downloading === item.id}
                    className="btn-ghost text-xs disabled:opacity-50"
                  >
                    {downloading === item.id ? "Downloading..." : "Download PDF"}
                  </button>
                ) : (
                  <span className="text-muted text-xs">Unavailable</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
