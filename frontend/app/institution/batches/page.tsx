"use client"
import { BatchTable } from "@/components/institution/batch-table"
import { DashboardLayout } from "@/components/institution/layout"
import { UploadModal } from "@/components/institution/upload-modal"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { toast } from "@/components/ui/toast"
import { useEffect, useState } from "react"

export default function BatchesPage() {
  const { user } = useAuth()
  const [batches, setBatches] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  async function load(page = 1) {
    try {
      setLoading(true)
      const { data } = await api.get(`/institution/batch?page=${page}&limit=10`)
      setBatches(data)
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to load batches")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      load()
    }
  }, [user])

  async function downloadTemplate() {
    try {
      const response = await api.get("/institution/batch/template", {
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement("a")
      a.href = url
      a.download = "veridaq_template.xlsx"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error("Failed to download template")
    }
  }

  return (
    <DashboardLayout title="Credential Batches">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-muted max-w-lg text-sm">
          Upload Excel files to register student credentials on-chain. Required columns: MATRIC
          NUMBER, STUDENT NAME, CGPA, CLASSIFICATION, COURSE NAME, GRADUATION YEAR.
        </p>
        <div className="flex gap-3">
          <button className="btn-ghost" onClick={downloadTemplate}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Template
          </button>
          <button className="btn-primary" onClick={() => setShowUpload(true)}>
            Upload Batch
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted py-12 text-center text-sm">Loading…</div>
      ) : (
        <BatchTable batches={batches?.items ?? []} onDismiss={load} />
      )}

      {showUpload && (
        <UploadModal
          onDismiss={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false)
            load()
          }}
        />
      )}
    </DashboardLayout>
  )
}
