"use client"
import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { api } from "@/lib/api"
import { CheckCircle2, LockKeyhole } from "lucide-react"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    setError("")
    setLoading(true)
    
    try {
      await api.post("/auth/password/reset", {
        token,
        newPassword: password,
        role: "ADMIN"
      })
      setSuccess(true)
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null
          ? ((err as Record<string, unknown>)["response"] as Record<string, unknown> | undefined)
              ?.["data"] as Record<string, unknown> | undefined
          : null
      setError(
        (typeof msg?.["error"] === "string" ? msg["error"] : null) ||
          "Failed to reset password. The link might be expired."
      )
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">Invalid Link</h1>
          <p className="text-muted">This password reset link is invalid or missing the token.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-surface-border bg-surface-card p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-border text-muted">
            <LockKeyhole size={24} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Reset Password</h2>
          <p className="mt-2 text-sm text-muted">Enter your new password below</p>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 size={48} className="text-green-500" />
            <p className="font-medium text-foreground">Password successfully reset!</p>
            <button onClick={() => router.push("/admin/login")} className="btn-primary mt-4 w-full justify-center">
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-error/20 bg-error/5 p-3 text-sm text-red-400">{error}</div>
            )}
            <div>
              <label className="label">New Password</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary mt-2 w-full justify-center">
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
