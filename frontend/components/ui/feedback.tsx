import * as React from "react"
import { cn } from "@/lib/utils"

// ─── Spinner ─────────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("text-accent animate-spin", className ?? "h-5 w-5")}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// ─── Page-level loading state ─────────────────────────────────────────────────

export function LoadingScreen() {
  return (
    <div className="text-muted flex h-64 items-center justify-center gap-2 text-sm">
      <Spinner className="h-4 w-4" />
      <span>Loading…</span>
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="bg-surface border-surface-border mb-2 flex h-12 w-12 items-center justify-center rounded-xl border">
        <div className="bg-muted-subtle h-2 w-2 rounded-full" />
      </div>
      <p className="text-foreground text-sm font-medium">{title}</p>
      <p className="text-muted max-w-xs text-xs leading-relaxed">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-error-bg border-error/20 text-error rounded-lg border px-4 py-3 text-sm">
      {message}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-foreground text-base font-semibold">{title}</h2>
        {description && <p className="text-muted mt-0.5 text-sm">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
