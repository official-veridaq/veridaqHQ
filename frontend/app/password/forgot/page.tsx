"use client"
import { api } from "@/lib/api"
import Link from "next/link"
import { useState } from "react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"institution" | "employer" | "admin">("employer")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await api.post("/auth/password/forgot", { email, role })
      setSuccess(true)
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null
          ? ((err as Record<string, unknown>)["response"] as Record<string, unknown> | undefined)
              ?.["data"] as Record<string, unknown> | undefined
          : null
      setError(
        (typeof msg?.["error"] === "string" ? msg["error"] : null) ||
          "Failed to process request"
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-void flex min-h-screen flex-col items-center justify-center p-4">
        <div className="bg-surface-card border-surface-border animate-fade-in w-full max-w-md rounded-xl border p-8 text-center shadow-lg">
          <h2 className="mb-4 text-2xl font-bold text-foreground">Check Your Email</h2>
          <p className="text-muted mb-6 text-sm">
            If an account exists for that email, we have sent a reset link to it. The link will
            expire in 15 minutes.
          </p>
          <Link href="/" className="text-accent text-sm hover:underline">
            Return home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-void flex min-h-screen flex-col items-center justify-center p-4">
      <div className="bg-surface-card border-surface-border animate-fade-in w-full max-w-md rounded-xl border p-8 shadow-lg">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Reset Password</h2>
        <p className="text-muted mb-6 text-sm">
          Enter your email and select your portal to receive a reset link.
        </p>

        {error && (
          <div className="mb-4 rounded bg-red-400/10 p-3 text-sm text-red-400">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Email Code</label>
            <input
              type="email"
              required
              className="border-surface-border placeholder-muted focus:border-accent w-full rounded border bg-[#0a0a0f] p-2 text-foreground outline-none"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Portal</label>
            <select
              className="border-surface-border focus:border-accent w-full rounded border bg-[#0a0a0f] p-2 text-foreground outline-none"
              value={role}
              onChange={(e) => setRole(e.target.value as "institution" | "employer" | "admin")}
            >
              <option value="employer">Employer</option>
              <option value="institution">Institution</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-void mt-2 w-full rounded py-2 font-semibold transition hover:bg-[#00e699] disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-muted text-xs transition hover:text-foreground">
            &larr; Back to login selection
          </Link>
        </div>
      </div>
    </div>
  )
}
