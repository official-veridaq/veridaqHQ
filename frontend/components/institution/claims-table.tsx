type Claim = {
  id: string
  label: string
  claimCode: number
  threshold: number
  reviewType: string
  active: boolean
}

export function ClaimsTable({ claims }: { claims: Claim[] }) {
  if (claims.length === 0) {
    return <div className="text-muted py-10 text-center text-sm">No claim definitions yet.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-surface-border border-b text-left">
            <th className="text-muted pb-3 font-medium">Label</th>
            <th className="text-muted pb-3 font-medium">Claim Code</th>
            <th className="text-muted pb-3 font-medium">Threshold</th>
            <th className="text-muted pb-3 font-medium">Review</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => (
            <tr key={c.id} className="table-row">
              <td className="text-foreground py-3">{c.label}</td>
              <td className="text-muted py-3 font-mono">{c.claimCode}</td>
              <td className="text-muted py-3">{c.threshold > 0 ? c.threshold : "—"}</td>
              <td className="py-3">
                <span className={c.reviewType === "AUTO" ? "badge-green" : "badge-blue"}>
                  {c.reviewType}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
