"use client"
/**
 * Toast notification system.
 * Uses a simple Zustand store so any component can trigger a toast without
 * prop-drilling. The ToastContainer must be rendered once near the root.
 */

import * as React from "react"
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { create } from "zustand"
import { cn } from "@/lib/utils"

// ─── Store ────────────────────────────────────────────────────────────────────

type ToastVariant = "success" | "error" | "info"

type Toast = {
  id: string
  message: string
  variant: ToastVariant
}

type ToastStore = {
  toasts: Toast[]
  add: (message: string, variant?: ToastVariant) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add(message, variant = "info") {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }))
    // Auto-dismiss after 5 seconds
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5000)
  },
  remove(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

/** Convenience helpers for common use. */
export const toast = {
  success: (msg: string) => useToastStore.getState().add(msg, "success"),
  error: (msg: string) => useToastStore.getState().add(msg, "error"),
  info: (msg: string) => useToastStore.getState().add(msg, "info"),
}

// ─── UI ───────────────────────────────────────────────────────────────────────

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="text-accent h-4 w-4 shrink-0" />,
  error: <AlertCircle className="text-error h-4 w-4 shrink-0" />,
  info: <Info className="text-info h-4 w-4 shrink-0" />,
}

const styles: Record<ToastVariant, string> = {
  success: "bg-surface-card border-accent/20 text-foreground",
  error: "bg-surface-card border-error/20 text-foreground",
  info: "bg-surface-card border-info/20 text-foreground",
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove(): void }) {
  return (
    <div
      className={cn(
        "animate-fade-in flex w-80 items-start gap-3 rounded-xl border px-4 py-3 shadow-xl",
        styles[toast.variant]
      )}
    >
      {icons[toast.variant]}
      <p className="flex-1 text-sm leading-snug">{toast.message}</p>
      <button
        onClick={onRemove}
        className="text-muted hover:text-foreground mt-0.5 shrink-0 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/** Render this once in the root layout. */
export function ToastContainer() {
  const { toasts, remove } = useToastStore()

  return (
    <div className="pointer-events-none fixed right-5 top-5 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={() => remove(t.id)} />
        </div>
      ))}
    </div>
  )
}
