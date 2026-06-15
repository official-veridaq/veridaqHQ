"use client"
import { HistoryTable } from "@/components/employer/history-table"
import { EmployerLayout } from "@/components/employer/layout"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { toast } from "@/components/ui/toast"
import { useEffect, useState } from "react"

export default function HistoryPage() {
  const { user } = useAuth()
  const [history, setHistory] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    api
      .get(`/verify/history?page=${page}&limit=20`)
      .then(({ data }) => setHistory(data))
      .catch(() => toast.error("Failed to load verification history"))
      .finally(() => setLoading(false))
  }, [page, user])

  return (
    <EmployerLayout title="Verification History">
      {loading ? (
        <div className="text-muted py-12 text-center text-sm">Loading…</div>
      ) : (
        <>
          <HistoryTable items={history?.items ?? []} />
          <div className="mt-6 flex justify-end gap-3">
            <button
              className="btn-ghost text-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="text-muted py-2 text-sm">Page {page}</span>
            <button
              className="btn-ghost text-sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={history?.items.length < 20}
            >
              Next
            </button>
          </div>
        </>
      )}
    </EmployerLayout>
  )
}
