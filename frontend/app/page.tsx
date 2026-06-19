"use client"

import { FloatingShapes } from "@/components/parallax/floating-shapes"
import { ParallaxBg } from "@/components/parallax/parallax-layer"
import { ScrollReveal } from "@/components/parallax/scroll-reveal"
import { SwapCard } from "@/components/parallax/swap-card"
import { ThemeToggle } from "@/components/theme-toggle"
import { LogoMark } from "@/components/ui/logo"
import { useAuth } from "@/lib/auth"
import { useScrollSpy } from "@/lib/use-scroll-spy"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Database,
  Download,
  Eye,
  EyeOff,
  FileJson,
  Fingerprint,
  Globe,
  Hexagon,
  Key,
  Layers,
  Lock,
  Menu,
  Network,
  Puzzle,
  Shield,
  ShieldCheck,
  Terminal,
  Workflow,
  X,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

function scrollToId(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
  e.preventDefault()
  const el = document.getElementById(id)
  if (el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top: y, behavior: "smooth" })
  }
}

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#cryptography", label: "Cryptography" },
  { href: "#protocol", label: "Protocol" },
  { href: "#extension", label: "Extension" },
  { href: "#compliance", label: "Compliance" },
]

function NavLink({ href, title, active }: { href: string; title: string; active: boolean }) {
  return (
    <a
      href={href}
      onClick={(e) => scrollToId(e, href.replace("#", ""))}
      className={`relative py-2 text-sm font-medium transition-colors duration-200 ${
        active ? "text-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      {title}
      {active && (
        <motion.span
          layoutId="nav-indicator"
          className="bg-accent absolute bottom-0 left-0 h-px w-full"
          transition={{ type: "spring", stiffness: 350, damping: 35 }}
        />
      )}
    </a>
  )
}

export default function LandingPage() {
  const { user } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  void mousePos
  const heroRef = useRef<HTMLDivElement>(null)
  const activeSection = useScrollSpy(
    ["hero", "features", "cryptography", "protocol", "extension", "compliance"],
    {
      initialSection: "hero",
    }
  )

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      })
    }
    window.addEventListener("mousemove", handleMouse, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouse)
  }, [])

  return (
    <div className="selection:bg-accent/20 relative min-h-screen overflow-x-hidden font-sans selection:text-inherit">
      <ParallaxBg />
      <FloatingShapes count={20} />

      {/* ─── Navbar ─── */}
      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-void/80 border-surface-border border-b backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        <div className="container pointer-events-auto mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8 rounded-lg" />
            <span className="font-display text-sm font-bold tracking-widest">VERIDAQ</span>
          </Link>
          <div className="hidden items-center gap-6 lg:flex">
            {navLinks.map(({ href, label }) => (
              <NavLink
                key={href}
                href={href}
                title={label}
                active={activeSection === href.replace("#", "")}
              />
            ))}
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggle />
            {user ? (
              <Link href={`/${user.role.toLowerCase()}/dashboard`} className="btn-primary text-xs">
                Dashboard <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <>
                <Link
                  href="/institution/login"
                  className="text-muted hover:text-foreground text-sm font-medium transition-colors"
                >
                  Institution
                </Link>
                <Link
                  href="/employer/login"
                  className="text-muted hover:text-foreground text-sm font-medium transition-colors"
                >
                  Employer
                </Link>
              </>
            )}
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 lg:hidden">
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-void/95 border-surface-border overflow-hidden border-b backdrop-blur-xl lg:hidden"
            >
              <div className="container mx-auto flex flex-col gap-1 p-4">
                {navLinks.map(({ href, label }) => (
                  <a
                    key={href}
                    onClick={(e) => {
                      scrollToId(e, href.replace("#", ""))
                      setIsMenuOpen(false)
                    }}
                    href={href}
                    className="text-muted hover:bg-surface rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:text-inherit"
                  >
                    {label}
                  </a>
                ))}
                <div className="border-surface-border my-2 border-t" />
                {user ? (
                  <Link
                    href={`/${user.role.toLowerCase()}/dashboard`}
                    className="btn-primary justify-center text-sm"
                  >
                    Go to Dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link href="/employer/login" className="btn-primary justify-center text-sm">
                      Verify Credentials
                    </Link>
                    <Link
                      href="/institution/login"
                      className="btn-secondary justify-center text-sm"
                    >
                      Institution Portal
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="space-y-32 pb-20 pt-24 md:space-y-48 md:pb-32">
        {/* ════════════════════════ HERO ════════════════════════ */}
        <section
          ref={heroRef}
          id="hero"
          className="container relative mx-auto px-4 pt-8 md:px-6 md:pt-16"
        >
          <div className="mx-auto max-w-5xl text-center">
            <ScrollReveal direction="scale" delay={0}>
              <div className="bg-accent/5 border-accent/10 text-accent mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="bg-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                  <span className="bg-accent relative inline-flex h-1.5 w-1.5 rounded-full" />
                </span>
                Live on Stellar Testnet
              </div>
            </ScrollReveal>

            <ScrollReveal direction="zoom-in" delay={0.15}>
              <h1 className="font-display mb-6 text-5xl font-bold leading-[1.08] tracking-tight md:mb-8 md:text-7xl lg:text-8xl">
                <span className="text-foreground">Censor-Resistant</span>
                <br />
                <span className="text-gradient">Academic Truth.</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.35}>
              <p className="text-muted mx-auto mb-10 max-w-2xl text-lg leading-relaxed md:mb-12 md:text-xl">
                Issue and cryptographically verify academic qualifications without exposing student
                identity. Powered by Zero-Knowledge Proofs on the Stellar network.
              </p>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.5}>
              <div className="relative z-20 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="#extension" className="btn-primary text-sm">
                  <Download className="h-4 w-4" /> Get Extension
                </Link>
                <Link href="/docs" className="btn-secondary text-sm">
                  <Terminal className="h-4 w-4" /> Documentation
                </Link>
                <Link href="/blueprint" className="btn-ghost text-sm">
                  <Hexagon className="h-4 w-4" /> Blueprint
                </Link>
              </div>
            </ScrollReveal>

            {/* Stats Row */}
            <ScrollReveal direction="up" delay={0.6}>
              <div className="border-surface-border relative mt-16 grid grid-cols-2 gap-4 border-t pt-8 md:mt-24 md:grid-cols-4 md:gap-8">
                {[
                  { value: "0.7s", label: "Proof Generation" },
                  { value: "~0.001 XLM", label: "Per Verification" },
                  { value: "100%", label: "On-Chain Verified" },
                  { value: "0", label: "PII Exposed" },
                ].map(({ value, label }) => (
                  <div key={label} className="flex flex-col items-center">
                    <span className="font-display text-foreground mb-1 text-2xl font-bold md:text-3xl">
                      {value}
                    </span>
                    <span className="text-muted text-[10px] font-semibold uppercase tracking-wider md:text-xs">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ════════════════════════ FEATURES (Bento Grid) ════════════════════════ */}
        <section id="features" className="container relative mx-auto px-4 md:px-6">
          <ScrollReveal direction="up" delay={0}>
            <div className="mb-10 text-center md:mb-16">
              <span className="text-accent font-display mb-2 block text-xs font-semibold uppercase tracking-[0.2em]">
                Core Capabilities
              </span>
              <h2 className="font-display mb-4 text-3xl font-bold md:text-5xl">
                <Layers className="text-accent mr-3 inline h-8 w-8 md:h-10 md:w-10" />
                Platform Architecture
              </h2>
              <p className="text-muted mx-auto max-w-2xl text-base md:text-lg">
                Cryptographic primitives isolated by design. Data off-chain, mathematically verified
                on-chain.
              </p>
            </div>
          </ScrollReveal>

          {/* Bento Grid */}
          <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
            <ScrollReveal direction="scale" delay={0}>
              <div className="border-surface-border from-surface-card to-void hover:border-accent/30 hover:shadow-glow-sm group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 transition-all duration-500 [perspective:500px] hover:[transform:rotateX(1deg)] md:col-span-2">
                <div className="bg-accent/5 group-hopver:bg-accent/10 pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150" />
                <div className="relative z-10">
                  <div className="bg-accent/10 text-accent mb-4 inline-flex rounded-xl p-3">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <h3 className="font-display mb-2 text-xl font-semibold">Institution Intake</h3>
                  <p className="text-muted max-w-md text-sm leading-relaxed">
                    Academic records normalized into standardized datasets, secured within off-chain
                    trusted enclaves with AES-256-GCM encryption. Batch upload via XLSX with
                    Poseidon commitment hashing.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="scale" delay={0.1}>
              <div className="border-surface-border from-surface-card to-void hover:border-accent/30 hover:shadow-glow-sm group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 transition-all duration-500 [perspective:500px] hover:[transform:rotateX(1deg)]">
                <div className="bg-accent/5 pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="bg-accent/10 text-accent mb-4 inline-flex rounded-xl p-3">
                    <Cpu className="h-6 w-6" />
                  </div>
                  <h3 className="font-display mb-2 text-xl font-semibold">State Processing</h3>
                  <p className="text-muted text-sm leading-relaxed">
                    Local instances convert arbitrary text vectors to 256-bit numeric fields
                    compatible with zero-knowledge arithmetic boundaries.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="scale" delay={0.15}>
              <div className="border-surface-border from-surface-card to-void hover:border-accent/30 hover:shadow-glow-sm group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 transition-all duration-500 [perspective:500px] hover:[transform:rotateX(1deg)]">
                <div className="bg-accent/5 pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="bg-accent/10 text-accent mb-4 inline-flex rounded-xl p-3">
                    <Network className="h-6 w-6" />
                  </div>
                  <h3 className="font-display mb-2 text-xl font-semibold">ZK Commitment</h3>
                  <p className="text-muted text-sm leading-relaxed">
                    Circom-powered Groth16 circuit constructs Poseidon hashes of metadata inputs.
                    Committed on-chain via Soroban smart contracts.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="scale" delay={0.2}>
              <div className="border-surface-border from-surface-card to-void hover:border-accent/30 hover:shadow-glow-sm group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 transition-all duration-500 [perspective:500px] hover:[transform:rotateX(1deg)] md:col-span-2">
                <div className="bg-accent/5 pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="bg-accent/10 text-accent mb-4 inline-flex rounded-xl p-3">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="font-display mb-2 text-xl font-semibold">
                    Immutable Verification
                  </h3>
                  <p className="text-muted max-w-md text-sm leading-relaxed">
                    Employers request proof executions, receiving strictly boolean
                    assertions without exposing any raw student data. Powered by Groth16
                    zero-knowledge proofs on Stellar.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ════════════════════════ CRYPTOGRAPHY ════════════════════════ */}
        <section id="cryptography" className="container relative mx-auto px-4 md:px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <ScrollReveal direction="left" delay={0}>
              <span className="text-accent font-display mb-2 block text-xs font-semibold uppercase tracking-[0.2em]">
                Zero-Knowledge
              </span>
              <h2 className="font-display mb-6 text-3xl font-bold md:text-4xl">
                Cryptographic Circuits
              </h2>
              <p className="text-muted mb-4 text-base md:text-lg">
                Our core constraint system is built in Circom 2. It accepts private inputs mapping
                to student identity elements and deterministically verifies claims without revealing
                any underlying data.
              </p>
              <p className="text-muted mb-8 text-base md:text-lg">
                The output is an irreducible Poseidon-hashed construct that ensures exactly 100%
                compliance verification while maintaining 0% knowledge of the actual individual.
              </p>

              <div className="space-y-5">
                {[
                  {
                    icon: <Zap className="h-4 w-4" />,
                    title: "Secure Trusted Setup",
                    desc: "Phase 2 ceremony powered by Hermez deterministic entropy. Poison-resistant parameters.",
                  },
                  {
                    icon: <Globe className="h-4 w-4" />,
                    title: "Soroban Smart Contracts",
                    desc: "Deployed on Stellar testnet leveraging Soroban for gas-efficient proof verification and batch credential registration.",
                  },
                  {
                    icon: <Key className="h-4 w-4" />,
                    title: "Poseidon Hashing",
                    desc: "ZKP-friendly hash function with optimal algebraic properties for constraint-efficient circuits.",
                  },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="group flex items-start gap-4">
                    <div className="bg-accent/10 text-accent group-hover:bg-accent/20 mt-0.5 rounded-md p-1.5 transition-all duration-300 group-hover:scale-110">
                      {icon}
                    </div>
                    <div>
                      <h4 className="text-foreground font-semibold">{title}</h4>
                      <p className="text-muted text-sm">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={0.1}>
              <div className="border-surface-border bg-surface shadow-elevated hover:shadow-glow-sm group relative w-full overflow-x-auto border p-4 font-mono text-sm transition-shadow duration-300 md:p-6">
                <div className="border-surface-border mb-4 flex min-w-max items-center gap-2 border-b pb-4 md:mb-6">
                  <div className="bg-error/60 h-2.5 w-2.5 rounded-full" />
                  <div className="bg-warning/60 h-2.5 w-2.5 rounded-full" />
                  <div className="bg-success/60 h-2.5 w-2.5 rounded-full" />
                  <span className="text-muted ml-3 text-xs">
                    circuits/credential.circom
                  </span>
                </div>
                <pre className="text-muted min-w-max text-xs leading-relaxed sm:text-sm">
                  {`pragma circom 2.0.0;
include "poseidon.circom";

template CredentialVerifier() {
    signal input nameHash;
    signal input matricHash;
    signal input cgpa;
    signal input classification;
    signal input courseHash;
    signal input graduationYear;
    signal input blindingFactor;
    signal input institutionKey;

    signal input commitment;
    signal input nullifier;
    signal input claimType;
    signal input threshold;

    component commitmentHasher = Poseidon(7);
    commitmentHasher.inputs[0] <== nameHash;
    commitmentHasher.inputs[1] <== matricHash;
    commitmentHasher.inputs[2] <== cgpa;
    commitmentHasher.inputs[3] <== classification;
    commitmentHasher.inputs[4] <== courseHash;
    commitmentHasher.inputs[5] <== graduationYear;
    commitmentHasher.inputs[6] <== blindingFactor;
    commitment === commitmentHasher.out;

    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== matricHash;
    nullifierHasher.inputs[1] <== institutionKey;
    nullifier === nullifierHasher.out;

    component claim = ClaimDecoder(claimType);
    claim.cgpa <== cgpa;
    claim.classification <== classification;
    claim.courseHash <== courseHash;
    claim.graduationYear <== graduationYear;
    claim.threshold <== threshold;
    claim.out === 1;
}`}
                </pre>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ════════════════════════ PROTOCOL ════════════════════════ */}
        <section id="protocol" className="container relative mx-auto px-4 md:px-6">
          <ScrollReveal direction="up" delay={0}>
            <div className="mb-10 text-center md:mb-16">
              <span className="text-accent font-display mb-2 block text-xs font-semibold uppercase tracking-[0.2em]">
                How It Works
              </span>
              <h2 className="font-display mb-4 text-3xl font-bold md:text-5xl">
                <Workflow className="text-accent mr-3 inline h-8 w-8 md:h-10 md:w-10" />
                Protocol Operations
              </h2>
              <p className="text-muted mx-auto max-w-2xl text-base md:text-lg">
                End-to-end operational flow from API ingest to on-chain finality.
              </p>
            </div>
          </ScrollReveal>

          <div className="relative">
            {/* Timeline line */}
            <div className="from-accent/30 via-accent/10 absolute left-8 top-0 hidden h-full w-px bg-gradient-to-b to-transparent md:block" />

            {[
              {
                step: "01",
                icon: <FileJson className="h-5 w-5" />,
                title: "Hash Injection",
                desc: "Academic records stripped of PII, transformed into Poseidon commitment hashes via SNARK-compatible field elements.",
              },
              {
                step: "02",
                icon: <Database className="h-5 w-5" />,
                title: "On-Chain Commitment",
                desc: "Commitment bundles transmitted to Stellar Soroban smart contracts for permanent, tamper-proof storage.",
              },
              {
                step: "03",
                icon: <Cpu className="h-5 w-5" />,
                title: "ZK Proof Generation",
                desc: "Employer submits verification criteria. Groth16 proof generated locally in ~0.7s via compiled WASM circuit.",
              },
              {
                step: "04",
                icon: <Shield className="h-5 w-5" />,
                title: "Immutable Verification",
                desc: "Non-reversible boolean executed on-chain via Soroban. Result permanently stored and auditable.",
              },
            ].map(({ step, icon, title, desc }, i) => (
              <ScrollReveal key={step} direction="up" delay={i * 0.1}>
                <div className="group relative mb-8 pl-0 md:pl-16">
                  <div className="bg-surface-card border-accent/20 group-hover:border-accent group-hover:shadow-glow-sm absolute left-0 top-0 hidden h-10 w-10 items-center justify-center rounded-full border transition-all duration-500 md:flex">
                    <span className="text-accent font-display text-xs font-bold">{step}</span>
                  </div>
                  <div className="card-interactive group relative overflow-hidden transition-all duration-500 [perspective:400px] hover:[transform:rotateX(1deg)]">
                    <div className="text-foreground/[0.03] absolute right-4 top-4 select-none text-[80px] font-black leading-none md:text-[100px]">
                      {step}
                    </div>
                    <div className="relative z-10 flex items-start gap-4">
                      <div className="bg-accent/10 text-accent group-hover:bg-accent/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 md:hidden">
                        {icon}
                      </div>
                      <div>
                        <h3 className="font-display mb-2 flex items-center gap-3 text-xl font-semibold md:text-2xl">
                          <span className="bg-accent/20 text-accent hidden h-8 w-8 items-center justify-center rounded-lg text-xs font-bold md:flex">
                            {step}
                          </span>
                          {title}
                        </h3>
                        <p className="text-muted text-sm leading-relaxed md:pr-12">{desc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-8 grid gap-6 md:mt-12 lg:grid-cols-2">
            <ScrollReveal direction="left" delay={0}>
              <div className="card-elevated hover:shadow-glow-md group relative overflow-hidden transition-all duration-500">
                <div className="bg-accent/5 pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <h3 className="font-display mb-4 text-xl font-bold md:text-2xl">
                    Cryptographic Finality
                  </h3>
                  <p className="text-muted mb-6 text-sm leading-relaxed md:text-base">
                    The smart contract's verification logic guarantees zero tolerance for
                    mathematical forgery. Every proof is verified deterministically on Stellar
                    Soroban, producing publicly auditable verification results while preserving
                    absolute credential anonymity.
                  </p>
                  <ul className="text-muted space-y-3 text-sm">
                    {[
                      "Deterministic execution on Stellar Soroban",
                      "Non-interactive succinct zero-knowledge proofs",
                      "Complete data anonymity via Poseidon hashing",
                      "Gas sponsorship for institutions via Soroban",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <div className="bg-accent/10 text-accent rounded p-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={0.1}>
              <div className="border-surface-border bg-surface hover:shadow-glow-sm group relative w-full overflow-x-auto border p-4 font-mono text-sm transition-shadow duration-300 md:p-6">
                <div className="border-surface-border text-muted mb-4 flex min-w-max justify-between border-b pb-3 text-xs">
                  <span className="flex items-center gap-2">
                    <Lock className="h-3 w-3" /> Soroban // ZKVerifier
                  </span>
                  <span className="text-accent">~500k Gas</span>
                </div>
                <pre className="text-muted min-w-max overflow-visible text-xs leading-relaxed sm:text-sm">
                  {`fn verify_raw(
  env: Env,
  nullifier: BytesN<32>,
  proof_a: Bytes,
  proof_b: Bytes,
  proof_c: Bytes,
  public_inputs: Vec<BytesN<32>>,
) -> bool {
  let verified = verify_groth16(
    &env, proof_a, proof_b, proof_c, public_inputs
  );
  if !verified {
    panic_with_error!(&env, Error::InvalidProof);
  }
  env.events().publish(
    ("verified", nullifier), ()
  );
  true
}`}
                </pre>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ════════════════════════ EXTENSION ════════════════════════ */}
        <section id="extension" className="container relative mx-auto px-4 md:px-6">
          <ScrollReveal direction="up" delay={0}>
            <div className="mb-10 text-center md:mb-16">
              <span className="text-accent font-display mb-2 block text-xs font-semibold uppercase tracking-[0.2em]">
                Browser Tooling
              </span>
              <h2 className="font-display mb-4 text-3xl font-bold md:text-5xl">
                <Puzzle className="text-accent mr-3 inline h-8 w-8 md:h-10 md:w-10" />
                Chrome Extension
              </h2>
              <p className="text-muted mx-auto max-w-2xl text-base md:text-lg">
                Quick credential verification and batch uploads without leaving your workflow.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <ScrollReveal direction="left" delay={0}>
              <div className="space-y-6">
                {[
                  {
                    icon: <Eye className="h-5 w-5" />,
                    title: "Quick Verify",
                    desc: "Submit verification requests directly from any webpage. Input institution ID, matric number, and claim type.",
                  },
                  {
                    icon: <Download className="h-5 w-5" />,
                    title: "Batch Upload",
                    desc: "Upload student credential batches (.xlsx) directly from the extension panel without opening the full portal.",
                  },
                  {
                    icon: <Shield className="h-5 w-5" />,
                    title: "Session Sync",
                    desc: "Seamlessly shares your web app session via httpOnly cookies. One login, everywhere.",
                  },
                  {
                    icon: <EyeOff className="h-5 w-5" />,
                    title: "Zero Data Exposure",
                    desc: "All cryptographic operations happen server-side. The extension never sees raw student data.",
                  },
                ].map(({ icon, title, desc }, i) => (
                  <ScrollReveal key={title} direction="left" delay={i * 0.05}>
                    <div className="group flex items-start gap-4">
                      <div className="bg-accent/10 text-accent group-hover:bg-accent/20 mt-0.5 rounded-lg p-2.5 transition-all duration-300 group-hover:scale-110">
                        {icon}
                      </div>
                      <div>
                        <h3 className="text-foreground mb-1 font-semibold">{title}</h3>
                        <p className="text-muted text-sm">{desc}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
                <div className="pt-4">
                  <a
                    href="/extension/VERIDAQ-Companion.zip"
                    download
                    className="btn-primary text-sm"
                  >
                    <Download className="h-4 w-4" /> Download Extension (Chrome){" "}
                    <ChevronRight className="h-3 w-3" />
                  </a>
                  <p className="text-muted mt-3 text-xs">
                    Manifest V3 &middot; Chrome 88+ &middot; No external permissions required
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={0.1}>
              <SwapCard />
            </ScrollReveal>
          </div>
        </section>

        {/* ════════════════════════ COMPLIANCE ════════════════════════ */}
        <section
          id="compliance"
          className="border-surface-border bg-surface/30 relative border-t px-4 py-24 text-center md:py-32"
        >
          <div className="via-accent/[0.02] parallax-bg absolute inset-0 bg-gradient-to-b from-transparent to-transparent" />
          <div className="container relative z-10 mx-auto max-w-5xl">
            <ScrollReveal direction="up" delay={0}>
              <div className="bg-accent/10 border-accent/20 hover:shadow-glow-sm mb-8 inline-flex h-16 w-16 rotate-12 items-center justify-center rounded-2xl border transition-all duration-500 hover:rotate-0 hover:scale-110">
                <Lock className="text-accent h-8 w-8" />
              </div>
              <h2 className="font-display mb-8 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                Compliance by Mathematics.
              </h2>
              <p className="text-muted mx-auto mb-12 hidden max-w-3xl text-lg leading-relaxed md:mb-16 md:block">
                If personally identifiable information does not mathematically exist on the ledger,
                it cannot be leaked, requested, or subpoenaed. GDPR and CCPA regulations are met
                intrinsically via absolute data deprivation.
              </p>
              <p className="text-muted mb-10 text-base leading-relaxed md:hidden">
                By absolutely depriving the public ledger of personally identifiable inputs, you are
                natively guarded against data breaches.
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                {[
                  { title: "GDPR", desc: "No PII processed" },
                  { title: "SOC 2", desc: "Hardened perimeter" },
                  { title: "ISO 27001", desc: "Security first" },
                  { title: "FERPA", desc: "Student privacy" },
                ].map(({ title, desc }, i) => (
                  <ScrollReveal key={title} direction="zoom-in" delay={i * 0.08}>
                    <div className="card-interactive group flex flex-col items-center gap-3 py-6 md:py-8">
                      <Fingerprint className="text-accent/60 group-hover:text-accent h-6 w-6 transition-all duration-300 group-hover:scale-110 md:h-8 md:w-8" />
                      <div className="flex flex-col gap-1 text-center">
                        <span className="text-sm font-bold tracking-wide md:text-base">
                          {title}
                        </span>
                        <span className="text-muted text-[10px] md:text-xs">{desc}</span>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
    </div>
  )
}
