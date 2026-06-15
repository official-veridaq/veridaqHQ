import * as React from "react"
import { cn } from "@/lib/utils"

// ─── Spinner ─────────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin text-accent", className ?? "w-5 h-5")}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
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
    <div className="flex items-center justify-center h-64 text-muted text-sm gap-2">
      <Spinner className="w-4 h-4" />
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
  title:       string
  description: string
  action?:     React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-surface border border-surface-border flex items-center justify-center mb-2">
        <div className="w-2 h-2 rounded-full bg-muted-subtle" />
      </div>
      <p className="text-foreground font-medium text-sm">{title}</p>
      <p className="text-muted text-xs max-w-xs leading-relaxed">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ─── Error state ──────────────────────────────────────────────────────────────

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-error-bg border border-error/20 rounded-lg px-4 py-3 text-error text-sm">
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
  title:       string
  description?: string
  action?:     React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-foreground font-semibold text-base">{title}</h2>
        {description && <p className="text-muted text-sm mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
