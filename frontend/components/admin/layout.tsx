"use client"
import { OrbitalLoader } from "@/components/ui/orbital-loader"
import { useAuth } from "@/lib/auth"
import { LogOut, Menu, X, ChevronRight, Shield } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LogoMark } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { PortalBg } from "@/components/parallax/floating-shapes"
import { ScrollReveal } from "@/components/parallax/scroll-reveal"

const nav = [
  { href: "/admin/dashboard", label: "Overview" },
  { href: "/admin/institutions", label: "Institutions" },
  { href: "/admin/employers", label: "Employers" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/audit", label: "Audit Log" },
]

export function AdminLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { logout, user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/admin/login")
    }
  }, [loading, user, router])

  async function handleLogout() {
    await logout()
    router.push("/admin/login")
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-void text-sm tracking-widest text-muted">
        <OrbitalLoader label="VERIFYING" />
        <span className="animate-pulse">Verifying session...</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-void">
      <PortalBg />
      <header className="border-surface-border bg-void/80 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              className="text-muted hover:text-foreground lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <LogoMark className="h-5 w-5" />
              <span className="text-xs font-bold tracking-widest text-accent">
                VERIDAQ <span className="text-muted">admin</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 lg:flex">
              {nav.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    pathname === href
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
                <Shield className="h-3.5 w-3.5 text-warning" />
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-foreground">{user.name}</div>
                <div className="text-[10px] text-muted">{user.role}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted hover:text-error flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-error/5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="bg-surface-card border-surface-border animate-slide-down absolute left-0 right-0 top-14 z-30 border-b shadow-elevated lg:hidden">
            <div className="flex flex-col gap-1 p-3">
              {nav.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === href
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              ))}
              <div className="border-surface-border my-1 border-t" />
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  handleLogout()
                }}
                className="text-muted hover:text-error flex items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-error/5"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="border-surface-border border-b bg-surface/30">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 text-xs text-muted md:px-6">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Admin</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{title}</span>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">
        <ScrollReveal direction="up" delay={0} once={true} amount={0.05}>
          <h1 className="mb-6 font-display text-xl font-semibold tracking-wide text-foreground">{title}</h1>
          {children}
        </ScrollReveal>
      </main>
    </div>
  )
}
