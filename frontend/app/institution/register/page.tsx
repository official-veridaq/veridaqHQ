"use client"

import { toast } from "@/components/ui/toast"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Building2, ArrowRight, Eye, EyeOff, Key, Shield } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LogoMark } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/theme-toggle"

export default function InstitutionRegisterPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    publicKey: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.role === "INSTITUTION") router.push("/institution/dashboard")
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post("/auth/register/institution", formData)
      toast.success("Registration submitted! Awaiting KYC approval.")
      router.push("/institution/login?registered=true")
    } catch (err: unknown) {
      const resp =
        typeof err === "object" && err !== null
          ? (err as Record<string, unknown>)["response"] as Record<string, unknown> | undefined
          : undefined
      const data = resp?.["data"] as Record<string, unknown> | undefined
      toast.error(
        (typeof data?.["error"] === "string" ? data["error"] : null) ||
          "Registration failed. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  const generateKeys = () => {
    const key = "0x04" + Array.from({ length: 128 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
    setFormData({ ...formData, publicKey: key })
    toast.success("Cryptographic keys generated!")
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-accent/[0.04] blur-[120px]" />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" />
            <span className="text-sm font-bold tracking-widest">VERIDAQ</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="border-surface-border bg-surface-card/80 rounded-2xl border p-8 shadow-elevated backdrop-blur-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Building2 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Institution Registration</h1>
              <p className="text-xs text-muted">
                Register to issue Zero-Knowledge credentials on Base
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Institution Name</label>
              <input
                type="text"
                required
                className="input-elevated"
                placeholder="Federal University of Technology"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Official Email</label>
              <input
                type="email"
                required
                className="input-elevated"
                placeholder="registrar@university.edu.ng"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Institution Public Key</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  readOnly
                  className="input-elevated min-w-0 flex-1 font-mono text-xs text-muted"
                  value={formData.publicKey || "Click generate to create keys"}
                />
                <button
                  type="button"
                  onClick={generateKeys}
                  className="border-surface-border hover:bg-surface flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-foreground transition-colors"
                >
                  <Key className="h-3 w-3" />
                  Generate
                </button>
              </div>
              {formData.publicKey && (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-success">
                  <Shield className="h-3 w-3" /> Cryptographic keys attached
                </p>
              )}
            </div>
            <div>
              <label className="label">Secure Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  className="input-elevated pr-10"
                  placeholder="Min 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="bg-accent mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-void transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              disabled={loading || !formData.publicKey}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-void/30 border-t-void" />
                  Registering…
                </span>
              ) : (
                <>
                  Submit Registration
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="border-surface-border mt-6 border-t pt-5">
            <p className="text-center text-xs text-muted">
              Already have an account?{" "}
              <Link
                href="/institution/login"
                className="font-medium text-foreground transition-colors hover:text-accent"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
