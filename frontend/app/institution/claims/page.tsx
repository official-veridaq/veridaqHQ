"use client"
import { DashboardLayout } from "@/components/institution/layout"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Edit, Info, Plus, Settings, X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "@/components/ui/toast"

export default function ClaimsPage() {
  const { user } = useAuth()
  const [claims, setClaims] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClaim, setEditingClaim] = useState<any>(null)

  // Form State
  const [label, setLabel] = useState("")
  const [claimCode, setClaimCode] = useState(1)
  const [threshold, setThreshold] = useState(0)
  const [reviewType, setReviewType] = useState("AUTO")
  const [active, setActive] = useState(true)
  const [description, setDescription] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const fetchClaims = () => {
    setLoading(true)
    api
      .get("/institution/claims")
      .then(({ data }) => setClaims(data))
      .catch((err: any) => {
        const msg = err?.response?.data?.error ?? "Failed to load claims"
        toast.error(msg)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user) return
    fetchClaims()
  }, [user])

  const autoGenerateCode = (text: string) => {
    const l = text.toLowerCase()
    if (l.includes("first class")) return 1
    if (l.includes("upper second")) return 2
    if (l.includes("lower second")) return 3
    if (l.includes("third class")) return 4
    if (l.includes("cgpa")) return 5
    if (l.includes("graduated")) return 6
    return 1
  }

  const handleLabelChange = (e: any) => {
    const val = e.target.value
    setLabel(val)
    if (!editingClaim) {
      setClaimCode(autoGenerateCode(val))
    }
  }

  const openCreateModal = () => {
    setEditingClaim(null)
    setLabel("")
    setClaimCode(1)
    setThreshold(0)
    setReviewType("AUTO")
    setActive(true)
    setDescription("")
    setIsModalOpen(true)
  }

  const openEditModal = (c: any) => {
    setEditingClaim(c)
    setLabel(c.label)
    setClaimCode(c.claimCode)
    setThreshold(c.threshold)
    setReviewType(c.reviewType)
    setActive(c.active)
    setDescription(c.description || "")
    setIsModalOpen(true)
  }

  const saveClaim = async () => {
    if (!label) return
    // Frontend duplicate check
    const duplicate = claims.find(
      (c) =>
        c.claimCode === Number(claimCode) &&
        c.threshold === Number(threshold) &&
        (!editingClaim || c.id !== editingClaim.id)
    )
    if (duplicate) {
      toast.error("A claim with this claim code and threshold already exists for your institution")
      return
    }
    setIsSaving(true)
    try {
      const payload = {
        label,
        claimCode: Number(claimCode),
        threshold: Number(threshold),
        reviewType,
        active,
        description,
      }
      if (editingClaim) {
        await api.patch(`/institution/claims/${editingClaim.id}`, payload)
      } else {
        await api.post("/institution/claims", payload)
      }
      setIsModalOpen(false)
      fetchClaims()

      toast.success(editingClaim ? "Claim updated" : "Claim created")
    } catch (err: any) {
      const msg = err?.response?.data?.error
        ?? err?.response?.data?.details?.[0]?.message
        ?? "Failed to save claim"
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleActive = async (c: any) => {
    try {
      await api.patch(`/institution/claims/${c.id}`, { active: !c.active })
      toast.success(c.active ? "Claim deactivated" : "Claim activated")
      fetchClaims()
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Failed to toggle claim"
      toast.error(msg)
    }
  }

  return (
    <DashboardLayout title="Claim Definitions">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted max-w-2xl text-sm">
          Claim definitions are the academic assertions employers can verify through ZK Proofs.
        </p>
        <button
          onClick={openCreateModal}
          className="bg-accent text-void flex items-center gap-2 px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Claim
        </button>
      </div>

      {loading ? (
        <div className="text-muted py-12 text-center text-sm">Loading claims...</div>
      ) : claims.length === 0 ? (
        <div className="border-surface-border bg-surface-card flex flex-col items-center border p-12 text-center">
          <Settings className="text-muted mb-4 h-12 w-12 opacity-50" />
          <h3 className="mb-2 text-lg font-medium text-foreground">No Claims Defined</h3>
          <p className="text-muted mb-6 max-w-md text-sm">
            You have not defined any queryable claims yet. Create claims to allow employers to
            request verifications.
          </p>
          <button
            onClick={openCreateModal}
            className="bg-surface-border px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-opacity-80"
          >
            Create Your First Claim
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {claims.map((c) => (
            <div
              key={c.id}
              className="bg-surface-card border-surface-border group relative flex flex-col border p-5"
            >
              <div className="mb-3 flex items-start justify-between">
                <h3 className="line-clamp-2 pr-4 text-base font-medium text-foreground">{c.label}</h3>

                {/* Status Indicator */}
                <div
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.active ? "bg-accent" : "bg-red-500"}`}
                  title={c.active ? "Active" : "Inactive"}
                />
              </div>

              <p className="text-muted mb-4 line-clamp-2 h-8 text-xs">
                {c.description ? c.description : "No description provided."}
              </p>

              <div className="mb-6 flex items-center gap-2">
                <span
                  className={`border px-2 py-0.5 text-xs font-medium ${c.reviewType === "AUTO" ? "bg-accent/10 text-accent border-accent/20" : "border-orange-500/20 bg-orange-500/10 text-orange-400"}`}
                >
                  {c.reviewType}
                </span>
                <span className="text-muted border-surface-border border px-2 py-0.5 text-xs">
                  Code: {c.claimCode}
                </span>
              </div>

              <div className="border-surface-border mt-auto flex items-center justify-between border-t pt-4">
                <button
                  onClick={() => toggleActive(c)}
                  className={`px-3 py-1 text-xs font-medium ${c.active ? "text-red-400 hover:bg-red-400/10" : "text-accent hover:bg-accent/10"} transition-colors`}
                >
                  {c.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => openEditModal(c)}
                  className="hover:text-accent p-1 text-foreground transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="bg-void/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface-card border-surface-border animate-fade-in relative w-full max-w-md border p-6 shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-muted absolute right-4 top-4 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-6 text-xl font-semibold text-foreground">
              {editingClaim ? "Edit Claim" : "Create Claim"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Claim Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={handleLabelChange}
                  placeholder="e.g. Minimum Upper Second Class"
                  className="bg-void border-surface-border focus:border-accent w-full border px-3 py-2 text-sm text-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Shown to employers when they request verification..."
                  className="bg-void border-surface-border focus:border-accent h-20 w-full resize-none border px-3 py-2 text-sm text-foreground focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block flex items-center gap-1 text-sm font-medium text-foreground">
                    Claim Type
                    <span title="AUTO is processed instantly via ZK. MANUAL enters a queue.">
                      <Info className="text-muted h-3 w-3" />
                    </span>
                  </label>
                  <select
                    value={reviewType}
                    onChange={(e) => setReviewType(e.target.value)}
                    className="bg-void border-surface-border focus:border-accent w-full appearance-none border px-3 py-2 text-sm text-foreground focus:outline-none disabled:opacity-50"
                    disabled={!!editingClaim}
                  >
                    <option value="AUTO">Automated (ZK Proof)</option>
                    <option value="MANUAL">Manual Review</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Circuit Code
                  </label>
                  <input
                    type="number"
                    value={claimCode}
                    readOnly
                    className="bg-void border-surface-border text-muted w-full cursor-not-allowed border px-3 py-2 text-sm opacity-70"
                  />
                </div>
              </div>

              {editingClaim && (
                <div className="border-surface-border mt-2 flex items-center gap-2 border-t pt-2">
                  <input
                    type="checkbox"
                    id="active-toggle"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="accent-accent"
                  />
                  <label
                    htmlFor="active-toggle"
                    className="cursor-pointer select-none text-sm text-foreground"
                  >
                    Claim is active and visible to employers
                  </label>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="border-surface-border hover:bg-surface-elevated border px-4 py-2 text-sm font-medium text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveClaim}
                disabled={isSaving || !label}
                className="bg-accent text-void px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : editingClaim ? "Save Changes" : "Create Claim"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
