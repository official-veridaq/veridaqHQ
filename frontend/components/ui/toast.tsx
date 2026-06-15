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
  id:      string
  message: string
  variant: ToastVariant
}

type ToastStore = {
  toasts:  Toast[]
  add:     (message: string, variant?: ToastVariant) => void
  remove:  (id: string) => void
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
  error:   (msg: string) => useToastStore.getState().add(msg, "error"),
  info:    (msg: string) => useToastStore.getState().add(msg, "info"),
}

// ─── UI ───────────────────────────────────────────────────────────────────────

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />,
  error:   <AlertCircle  className="w-4 h-4 text-error shrink-0" />,
  info:    <Info         className="w-4 h-4 text-info shrink-0" />,
}

const styles: Record<ToastVariant, string> = {
  success: "bg-surface-card border-accent/20 text-foreground",
  error:   "bg-surface-card border-error/20 text-foreground",
  info:    "bg-surface-card border-info/20 text-foreground",
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove(): void }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 w-80 rounded-xl border px-4 py-3 shadow-xl animate-fade-in",
        styles[toast.variant]
      )}
    >
      {icons[toast.variant]}
      <p className="flex-1 text-sm leading-snug">{toast.message}</p>
      <button
        onClick={onRemove}
        className="text-muted hover:text-foreground transition-colors mt-0.5 shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

/** Render this once in the root layout. */
export function ToastContainer() {
  const { toasts, remove } = useToastStore()

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={() => remove(t.id)} />
        </div>
      ))}
    </div>
  )
}
