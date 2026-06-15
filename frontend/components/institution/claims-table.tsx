type Claim = { id: string; label: string; claimCode: number; threshold: number; reviewType: string; active: boolean }

export function ClaimsTable({ claims }: { claims: Claim[] }) {
  if (claims.length === 0) {
    return <div className="text-muted text-sm py-10 text-center">No claim definitions yet.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left">
            <th className="pb-3 text-muted font-medium">Label</th>
            <th className="pb-3 text-muted font-medium">Claim Code</th>
            <th className="pb-3 text-muted font-medium">Threshold</th>
            <th className="pb-3 text-muted font-medium">Review</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => (
            <tr key={c.id} className="table-row">
              <td className="py-3 text-foreground">{c.label}</td>
              <td className="py-3 text-muted font-mono">{c.claimCode}</td>
              <td className="py-3 text-muted">{c.threshold > 0 ? c.threshold : "—"}</td>
              <td className="py-3"><span className={c.reviewType === "AUTO" ? "badge-green" : "badge-blue"}>{c.reviewType}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
