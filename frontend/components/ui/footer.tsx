import Link from "next/link"
import { LogoMark } from "@/components/ui/logo"

export function Footer() {
  return (
    <footer className="border-surface-border bg-void relative border-t">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.01] to-transparent" />
      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand */}
          <div className="space-y-4 md:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <LogoMark className="h-6 w-6" />
              <span className="text-sm font-bold uppercase tracking-widest">VERIDAQ</span>
            </Link>
            <p className="max-w-xs text-xs leading-relaxed text-muted">
              Censor-Resistant Academic Truth. ||  
              Zero PII on public ledgers.
            </p>
            
            <div className="flex items-center gap-2">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              <span className="font-mono text-[10px] text-success/80">Mainnet Active</span>
            </div>
          </div>

          {/* Portals */}
          <div className="md:col-span-2">
            <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted opacity-60">
              Portals
            </h4>
            <ul className="space-y-2.5 text-xs">
              {[
                { href: "/institution/login", label: "Institution" },
                { href: "/employer/login", label: "Employer" },
                { href: "/admin/login", label: "Admin" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-muted transition-colors hover:text-inherit"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="md:col-span-3">
            <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted opacity-60">
              Resources
            </h4>
            <ul className="space-y-2.5 text-xs">
              {[
                { href: "/docs", label: "Documentation" },
                { href: "/zkp", label: "ZKP Circuits" },
                { href: "/resources", label: "Technical Resources" },
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/terms", label: "Terms of Service" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-muted transition-colors hover:text-inherit"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Extension */}
          <div className="md:col-span-3">
            <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted opacity-60">
              Extension
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a
                  href="/extension/VERIDAQ-Companion.zip"
                  download
                  className="text-muted transition-colors hover:text-inherit"
                >
                  Download for Chrome
                </a>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-muted transition-colors hover:text-inherit"
                >
                  Extension Guide
                </Link>
              </li>
            </ul>
            <div className="border-surface-border mt-4 rounded-lg border p-3">
              <p className="text-[10px] text-muted">
                Manifest V3 · Chrome 88+ · No external permissions
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-surface-border mt-12 flex flex-col items-start justify-between gap-3 border-t pt-6 sm:flex-row sm:items-center">
          <span className="text-[10px] text-muted/40">
            &copy; {new Date().getFullYear()} Veridaq Foundation. All rights reserved.
          </span>
          <div className="flex items-center gap-3 text-[10px] text-muted/40">
            <span className="font-mono">Base Sepolia</span>
            <span>·</span>
            <span className="font-mono">Protocol v1.0.0</span>
            <span>·</span>
            <span className="font-mono">Mathematical guarantee of privacy</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
