/**
 * StatCard — clean metric card. No 3D tilt, no shimmer sweep.
 */
export function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div
      className={[
        "bg-surface-card border-surface-border flex flex-col gap-1 border p-4",
        accent ? "border-l-2 border-l-accent" : "",
      ].join(" ")}
    >
      <span className="text-muted text-xs font-medium uppercase tracking-wider">{label}</span>
      <span className={["text-2xl font-bold", accent ? "text-accent" : "text-foreground"].join(" ")}>{value}</span>
    </div>
  )
}
