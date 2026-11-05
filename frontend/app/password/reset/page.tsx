"use client"
import { api } from "@/lib/api"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function ResetPasswordPage() {
  const [token, setToken] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Next.js useSearchParams can sometimes be tricky with strict types if not wrappred in Suspense
    // A simple window.location fallback is reliable here for unauthenticated public routes without layout nesting.
    const urlParams = new URLSearchParams(window.location.search)
    const t = urlParams.get("token")
    if (t) setToken(t)
    else setError("No reset token provided in URL.")
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      return setError("Passwords do not match")
    }
    if (password.length < 8) {
      return setError("Password must be at least 8 characters")
    }

    setLoading(true)

    try {
      await api.post("/auth/password/reset", { token, newPassword: password })
      setSuccess(true)
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null
          ? ((
              (err as Record<string, unknown>)["response"] as Record<string, unknown> | undefined
            )?.["data"] as Record<string, unknown> | undefined)
          : null
      setError(
        (typeof msg?.["error"] === "string" ? msg["error"] : null) ||
          "Failed to reset password. Token might be invalid or expired."
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-void flex min-h-screen flex-col items-center justify-center p-4">
        <div className="bg-surface-card border-surface-border animate-fade-in w-full max-w-md rounded-xl border p-8 text-center shadow-lg">
          <h2 className="text-foreground mb-4 text-2xl font-bold">Password Reset Successful</h2>
          <p className="text-muted mb-6 text-sm">
            Your password has been changed successfully. You can now log in to your account.
          </p>
          <Link
            href="/"
            className="bg-accent text-void rounded px-4 py-2 font-semibold transition hover:bg-[#00e699]"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-void flex min-h-screen flex-col items-center justify-center p-4">
      <div className="bg-surface-card border-surface-border animate-fade-in w-full max-w-md rounded-xl border p-8 shadow-lg">
        <h2 className="text-foreground mb-2 text-2xl font-bold">Choose New Password</h2>
        <p className="text-muted mb-6 text-sm">Enter a strong password for your account.</p>

        {error && (
          <div className="mb-4 rounded bg-red-400/10 p-3 text-sm text-red-400">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">New Password</label>
            <input
              type="password"
              required
              className="border-surface-border focus:border-accent text-foreground w-full rounded border bg-[#0a0a0f] p-2 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">
              Confirm Password
            </label>
            <input
              type="password"
              required
              className="border-surface-border focus:border-accent text-foreground w-full rounded border bg-[#0a0a0f] p-2 outline-none"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="bg-accent text-void mt-2 w-full rounded py-2 font-semibold transition hover:bg-[#00e699] disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-muted hover:text-foreground text-xs transition">
            &larr; Back to login selection
          </Link>
        </div>
      </div>
    </div>
  )
}
