"use client"
import { toast } from "@/components/ui/toast"
import { useAuth } from "@/lib/auth"
import { Briefcase, ArrowRight, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LogoMark } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/theme-toggle"

export default function EmployerLogin() {
  const router = useRouter()
  const { login, user } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.role === "EMPLOYER") router.push("/employer/dashboard")
  }, [user, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password, "employer")
      toast.success("Welcome back!")
      router.push("/employer/dashboard")
    } catch {
      toast.error("Invalid credentials or account not yet approved.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-void relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-info/[0.04] absolute right-1/4 top-0 h-[500px] w-[500px] rounded-full blur-[120px]" />
        <div className="bg-accent/[0.03] absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full blur-[80px]" />
        <div className="bg-grid-pattern bg-grid absolute inset-0 opacity-30" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" />
            <span className="text-sm font-bold tracking-widest">VERIDAQ</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="border-surface-border bg-surface-card/80 shadow-elevated rounded-2xl border p-8 backdrop-blur-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="bg-info/10 flex h-10 w-10 items-center justify-center rounded-xl">
              <Briefcase className="text-info h-5 w-5" />
            </div>
            <div>
              <h1 className="text-foreground text-lg font-semibold">Employer Login</h1>
              <p className="text-muted text-xs">Verify academic credentials of candidates</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Email address</label>
              <input
                className="input-elevated"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="hr@company.com"
                autoComplete="email"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="label !mb-0">Password</label>
                <Link
                  href="/password/forgot"
                  className="text-accent text-xs transition-colors hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  className="input-elevated pr-10"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="bg-accent text-void mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="border-void/30 border-t-void h-4 w-4 animate-spin rounded-full border-2" />
                  Signing in…
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="border-surface-border mt-6 border-t pt-5">
            <p className="text-muted text-center text-xs">
              New here?{" "}
              <Link
                href="/employer/register"
                className="text-foreground hover:text-accent font-medium transition-colors"
              >
                Register your organization
              </Link>
            </p>
          </div>
        </div>

        <div className="text-muted/60 mt-6 flex items-center justify-center gap-4 text-[10px]">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>·</span>
          <Link href="/docs" className="hover:text-foreground transition-colors">
            Docs
          </Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
        </div>
      </div>
    </div>
  )
}
