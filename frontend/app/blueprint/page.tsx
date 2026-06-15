"use client"

import { FloatingShapes } from "@/components/parallax/floating-shapes"
import { ParallaxBg } from "@/components/parallax/parallax-layer"
import { AppHeader } from "@/components/ui/app-header"
import { useScrollSpy } from "@/lib/use-scroll-spy"
import { motion } from "framer-motion"
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircuitBoard,
  Coins,
  Cpu,
  Database,
  Eye,
  EyeOff,
  FileCode2,
  Fingerprint,
  Fuel,
  GitBranch,
  Globe,
  Hexagon,
  Key,
  Layers,
  Lock,
  Network,
  Route,
  ScrollText,
  Server,
  Shield,
  ShieldCheck,
  Terminal,
  UserCheck,
  Users,
  Wallet,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

/* ──────────────────────────────────────────────
   Section Divider
   ────────────────────────────────────────────── */
function SectionDivider({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="relative mx-auto mb-16 mt-32 flex max-w-6xl items-center gap-4 px-4 md:px-6">
      <div className="bg-accent/20 text-accent flex h-10 w-10 items-center justify-center rounded-xl">
        {icon}
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{label}</h2>
        <div className="bg-accent/30 mt-1 h-0.5 w-16 rounded-full" />
      </div>
      <div className="bg-surface-border flex-1 border-t" />
    </div>
  )
}

/* ──────────────────────────────────────────────
   Flow Step Card
   ────────────────────────────────────────────── */
/* ──────────────────────────────────────────────
   Contract Card
   ────────────────────────────────────────────── */
function ContractCard({
  name,
  purpose,
  abi,
  address,
  icon,
  highlights,
}: {
  name: string
  purpose: string
  abi: string
  address?: string
  icon: React.ReactNode
  highlights: string[]
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="border-surface-border bg-surface-card hover:border-accent/30 group overflow-hidden rounded-xl border transition-all duration-300"
    >
      <div className="border-surface-border flex items-center gap-3 border-b p-4">
        <div className="text-accent">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{name}</h3>
            <span className="bg-accent/10 text-accent rounded px-1.5 py-0.5 font-mono text-[10px]">
              {abi}
            </span>
          </div>
          <p className="text-muted text-xs">{purpose}</p>
        </div>
        {address && (
          <span className="text-muted-subtle font-mono text-[9px]">{address.slice(0, 10)}...</span>
        )}
      </div>
      <div className="space-y-1 p-4">
        {highlights.map((h) => (
          <div key={h} className="text-muted flex items-start gap-2 text-xs">
            <div className="bg-accent/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
            <span>{h}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ──────────────────────────────────────────────
   Animated Flow Simulation
   ────────────────────────────────────────────── */
function AnimatedProofFlow() {
  const [step, setStep] = useState(0)
  const steps = [
    { label: "Institution uploads XLSX", icon: "Upload", color: "bg-accent" },
    { label: "BullMQ processes batch", icon: "Cpu", color: "bg-info" },
    { label: "Poseidon commitments computed", icon: "Fingerprint", color: "bg-accent" },
    { label: "AES 256 GCM encrypts plaintext", icon: "Lock", color: "bg-info" },
    { label: "AA UserOp sent to Base Sepolia", icon: "Globe", color: "bg-accent" },
    { label: "CredentialRegistry stores commitment", icon: "Database", color: "bg-success" },
    { label: "Employer submits verification request", icon: "UserCheck", color: "bg-warning" },
    { label: "SnarkJS fullProve generates proof", icon: "CircuitBoard", color: "bg-accent" },
    { label: "ZKVerifier.sol verifies on chain", icon: "ShieldCheck", color: "bg-success" },
    { label: "Result returned to employer", icon: "CheckCircle2", color: "bg-accent" },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [steps.length])

  return (
    <div className="border-surface-border bg-surface-card rounded-xl border p-6 md:p-8">
      <h3 className="mb-6 text-lg font-bold">Credential Lifecycle Simulation</h3>
      <div className="relative">
        <div className="bg-surface border-surface-border absolute left-4 top-0 h-full w-0.5 md:left-6" />
        <div className="space-y-4">
          {steps.map((s, i) => {
            const isActive = i === step
            const isDone = i < step
            return (
              <motion.div
                key={i}
                className={`relative flex items-center gap-4 rounded-lg p-3 transition-all duration-500 md:gap-6 ${
                  isActive
                    ? "bg-accent/5 border-accent/20 border"
                    : isDone
                      ? "opacity-60"
                      : "opacity-30"
                }`}
                animate={isActive ? { scale: [1, 1.02, 1] } : {}}
                transition={{ repeat: isActive ? Infinity : 0, duration: 2.2 }}
              >
                <div
                  className={`text-void relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold md:h-10 md:w-10 ${
                    isActive
                      ? s.color
                      : isDone
                        ? "bg-surface-border text-muted"
                        : "bg-surface text-muted-subtle"
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm font-medium transition-colors ${
                      isActive ? "text-foreground" : "text-muted"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-accent/20 text-accent mr-2 flex h-6 w-6 items-center justify-center rounded-full"
                  >
                    <Zap className="h-3 w-3" />
                  </motion.div>
                )}
                {isDone && <CheckCircle2 className="text-success mr-2 h-4 w-4" />}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   AA Flow Diagram
   ────────────────────────────────────────────── */
function AaFlowDiagram() {
  const nodes = [
    {
      id: 1,
      label: "Institution Backend",
      x: 10,
      y: 10,
      icon: <Server className="h-4 w-4" />,
      color: "accent",
    },
    {
      id: 2,
      label: "SimpleAccount Factory",
      x: 40,
      y: 5,
      icon: <GitBranch className="h-4 w-4" />,
      color: "info",
    },
    {
      id: 3,
      label: "UserOperation Build",
      x: 25,
      y: 30,
      icon: <FileCode2 className="h-4 w-4" />,
      color: "accent",
    },
    {
      id: 4,
      label: "PaymasterVault",
      x: 10,
      y: 55,
      icon: <Wallet className="h-4 w-4" />,
      color: "warning",
    },
    {
      id: 5,
      label: "EntryPoint",
      x: 40,
      y: 55,
      icon: <Route className="h-4 w-4" />,
      color: "info",
    },
    {
      id: 6,
      label: "Bundler Relay",
      x: 55,
      y: 40,
      icon: <Globe className="h-4 w-4" />,
      color: "accent",
    },
    {
      id: 7,
      label: "Base Sepolia",
      x: 70,
      y: 25,
      icon: <Database className="h-4 w-4" />,
      color: "success",
    },
    {
      id: 8,
      label: "CredentialRegistry",
      x: 55,
      y: 10,
      icon: <Layers className="h-4 w-4" />,
      color: "accent",
    },
  ]

  const edges = [
    [1, 2],
    [2, 3],
    [3, 4],
    [3, 5],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
  ]

  return (
    <div className="border-surface-border bg-surface-card rounded-xl border p-4 md:p-6">
      <h3 className="mb-6 text-lg font-bold">ERC 4337 Account Abstraction Flow</h3>
      <div className="relative mx-auto h-[340px] w-full max-w-[600px]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 80">
          {edges.map(([from, to], i) => {
            const f = nodes.find((n) => n.id === from)!
            const t = nodes.find((n) => n.id === to)!
            return (
              <motion.line
                key={i}
                x1={f.x}
                y1={f.y}
                x2={t.x}
                y2={t.y}
                stroke="rgb(var(--color-accent) / 0.25)"
                strokeWidth="0.4"
                strokeDasharray="2 1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: i * 0.15, repeat: Infinity, repeatDelay: 5 }}
              />
            )
          })}
        </svg>
        <div className="relative grid h-full grid-cols-4 grid-rows-3 gap-2">
          {nodes.map((n) => {
            const col = n.x <= 30 ? 0 : n.x <= 50 ? 1 : n.x <= 65 ? 2 : 3
            const row = n.y <= 25 ? 0 : n.y <= 45 ? 1 : 2
            return (
              <motion.div
                key={n.id}
                className={`relative flex flex-col items-center justify-center rounded-lg border p-2 text-center text-[9px] font-medium transition-all duration-300 hover:scale-105 md:text-[10px]`}
                style={{
                  gridColumn: col + 1,
                  gridRow: row + 1,
                  borderColor: `rgb(var(--color-${n.color}) / 0.3)`,
                  backgroundColor: `rgb(var(--color-${n.color}) / 0.06)`,
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                whileHover={{ backgroundColor: `rgb(var(--color-${n.color}) / 0.12)` }}
              >
                <div className="mb-1" style={{ color: `rgb(var(--color-${n.color}))` }}>
                  {n.icon}
                </div>
                <span style={{ color: `rgb(var(--color-${n.color}))` }}>{n.label}</span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Topology Diagram
   ────────────────────────────────────────────── */
function TopologyDiagram() {
  const layers = [
    {
      name: "Presentation Layer",
      color: "accent",
      items: [
        { icon: <Globe className="h-4 w-4" />, label: "Landing Page" },
        { icon: <Shield className="h-4 w-4" />, label: "Institution Portal" },
        { icon: <UserCheck className="h-4 w-4" />, label: "Employer Portal" },
        { icon: <Users className="h-4 w-4" />, label: "Admin Portal" },
        { icon: <Puzzle className="h-4 w-4" />, label: "Chrome Extension" },
      ],
    },
    {
      name: "API Gateway",
      color: "info",
      items: [
        { icon: <Route className="h-4 w-4" />, label: "Fastify 5 Server" },
        { icon: <Lock className="h-4 w-4" />, label: "JWT Auth Guard" },
        { icon: <Fuel className="h-4 w-4" />, label: "Rate Limiter" },
      ],
    },
    {
      name: "Service Layer",
      color: "warning",
      items: [
        { icon: <Server className="h-4 w-4" />, label: "Auth Service" },
        { icon: <Database className="h-4 w-4" />, label: "Institution Service" },
        { icon: <CircuitBoard className="h-4 w-4" />, label: "Proof Service" },
        { icon: <Globe className="h-4 w-4" />, label: "Blockchain Service" },
        { icon: <Cpu className="h-4 w-4" />, label: "BullMQ Workers" },
        { icon: <ScrollText className="h-4 w-4" />, label: "Email Service" },
      ],
    },
    {
      name: "Data Layer",
      color: "accent",
      items: [
        { icon: <Database className="h-4 w-4" />, label: "PostgreSQL 16" },
        { icon: <Database className="h-4 w-4" />, label: "Redis 7 Cache" },
        { icon: <Key className="h-4 w-4" />, label: "AES 256 GCM Keys" },
      ],
    },
    {
      name: "Blockchain Layer",
      color: "success",
      items: [
        { icon: <Hexagon className="h-4 w-4" />, label: "Base Sepolia L2" },
        { icon: <Wallet className="h-4 w-4" />, label: "8 Smart Contracts" },
        { icon: <ShieldCheck className="h-4 w-4" />, label: "ZKVerifier" },
        { icon: <Coins className="h-4 w-4" />, label: "PaymasterVault" },
      ],
    },
    {
      name: "Cryptographic Core",
      color: "info",
      items: [
        { icon: <Fingerprint className="h-4 w-4" />, label: "Circom 2.0 Circuit" },
        { icon: <Layers className="h-4 w-4" />, label: "Poseidon Hash" },
        { icon: <CircuitBoard className="h-4 w-4" />, label: "Groth16 SnarkJS" },
        { icon: <Key className="h-4 w-4" />, label: "BN254 Pairing" },
      ],
    },
  ]

  return (
    <div className="border-surface-border bg-surface-card rounded-xl border p-4 md:p-6">
      <h3 className="mb-6 text-lg font-bold">System Topology</h3>
      <div className="relative space-y-6">
        {layers.map((layer, i) => (
          <motion.div
            key={layer.name}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group relative"
          >
            <div
              className="absolute -left-1 top-0 h-full w-0.5 rounded-full opacity-30 transition-opacity group-hover:opacity-60"
              style={{ backgroundColor: `rgb(var(--color-${layer.color}))` }}
            />
            <div className="pl-5">
              <span
                className="mb-3 inline-block text-[10px] font-bold uppercase tracking-widest"
                style={{ color: `rgb(var(--color-${layer.color}))` }}
              >
                {layer.name}
              </span>
              <div className="flex flex-wrap gap-2">
                {layer.items.map((item) => (
                  <div
                    key={item.label}
                    className="border-surface-border bg-surface text-muted hover:border-accent/30 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all hover:scale-105"
                  >
                    <span style={{ color: `rgb(var(--color-${layer.color}) / 0.7)` }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Security Pillar
   ────────────────────────────────────────────── */
function SecurityPillar({ title, items }: { title: string; items: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="border-surface-border bg-surface-card rounded-xl border p-6"
    >
      <div className="bg-error/10 text-error mb-4 inline-flex rounded-lg p-2.5">
        <Shield className="h-5 w-5" />
      </div>
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-muted flex items-start gap-2 text-sm">
            <div className="bg-error/20 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

/* ──────────────────────────────────────────────
   Claim Type Table
   ────────────────────────────────────────────── */
function ClaimTypeTable() {
  const claims = [
    {
      code: 1,
      label: "Graduation Year Verification",
      constraint: "graduationYear >= 1960 AND graduationYear <= 2030",
    },
    { code: 2, label: "Second Class Lower or Above", constraint: "classification >= 2" },
    { code: 3, label: "Second Class Upper or Above", constraint: "classification >= 3" },
    { code: 4, label: "First Class Honours", constraint: "classification == 4" },
    { code: 5, label: "CGPA Threshold", constraint: "cgpa >= threshold (public input)" },
    { code: 6, label: "Valid Course (Non Zero Hash)", constraint: "courseHash != 0 AND yearValid" },
  ]

  return (
    <div className="border-surface-border bg-surface-card overflow-hidden rounded-xl border">
      <div className="border-surface-border text-muted grid grid-cols-3 gap-4 border-b p-4 text-[10px] font-bold uppercase tracking-widest">
        <span>Code</span>
        <span>Claim Label</span>
        <span className="hidden md:block">Constraint</span>
      </div>
      <div className="divide-surface-border divide-y">
        {claims.map((c) => (
          <div key={c.code} className="grid grid-cols-3 gap-4 p-4 text-sm">
            <span className="bg-accent/10 text-accent inline-flex h-6 w-8 items-center justify-center rounded font-mono text-xs">
              {c.code}
            </span>
            <span className="font-medium">{c.label}</span>
            <span className="text-muted hidden font-mono text-[10px] md:block">{c.constraint}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Main Page
   ────────────────────────────────────────────── */
export default function BlueprintPage() {
  const activeSection = useScrollSpy(
    [
      "vision",
      "topology",
      "contracts",
      "cryptography",
      "lifecycle",
      "accountabstraction",
      "backend",
      "frontend",
      "extension",
      "deployment",
      "security",
      "directives",
    ],
    {
      initialSection: "vision",
    }
  )

  const navSections = [
    { id: "vision", label: "Vision", icon: <Eye className="h-3 w-3" /> },
    { id: "topology", label: "Topology", icon: <Network className="h-3 w-3" /> },
    { id: "contracts", label: "Contracts", icon: <FileCode2 className="h-3 w-3" /> },
    { id: "cryptography", label: "Cryptography", icon: <Fingerprint className="h-3 w-3" /> },
    { id: "lifecycle", label: "Lifecycle", icon: <Route className="h-3 w-3" /> },
    { id: "accountabstraction", label: "AA Flow", icon: <Wallet className="h-3 w-3" /> },
    { id: "backend", label: "Backend", icon: <Server className="h-3 w-3" /> },
    { id: "frontend", label: "Frontend", icon: <Globe className="h-3 w-3" /> },
    { id: "extension", label: "Extension", icon: <Puzzle className="h-3 w-3" /> },
    { id: "deployment", label: "Deployment", icon: <Terminal className="h-3 w-3" /> },
    { id: "security", label: "Security", icon: <Shield className="h-3 w-3" /> },
    { id: "directives", label: "Directives", icon: <ScrollText className="h-3 w-3" /> },
  ]

  return (
    <div className="bg-void text-foreground relative min-h-screen">
      <AppHeader />
      <ParallaxBg opacity={0.25} />
      <FloatingShapes count={10} />

      {/* Side nav */}
      <nav className="border-surface-border bg-void/90 fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-lg md:bottom-auto md:left-auto md:right-4 md:top-24 md:border-0 md:bg-transparent md:backdrop-blur-none">
        <div className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-col md:gap-0.5 md:p-0">
          {navSections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium transition-all duration-200 md:px-3 md:py-1.5 ${
                activeSection === s.id
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              {s.icon}
              <span className="hidden md:inline">{s.label}</span>
            </a>
          ))}
        </div>
      </nav>

      <main className="pb-32 pt-20">
        {/* ─── Hero ─── */}
        <section className="container relative mx-auto px-4 pt-12 md:px-6 md:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-4xl text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-accent/5 border-accent/10 text-accent mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="bg-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                <span className="bg-accent relative inline-flex h-1.5 w-1.5 rounded-full" />
              </span>
              Protocol Blueprint v1.0.0
            </motion.div>

            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
              The Veridaq <span className="text-gradient">Protocol Blueprint</span>
            </h1>

            <p className="text-muted mx-auto mb-10 max-w-2xl text-base leading-relaxed md:text-lg">
              Every contract, every circuit, every queue, every route, every rule.
              <br />
              This document defines the complete architecture of privacy preserving academic
              credential verification on Base L2.
            </p>

            <div className="text-muted flex flex-wrap items-center justify-center gap-3 text-xs">
              <span className="border-surface-border bg-surface-card rounded-lg border px-3 py-1.5 font-mono">
                8 Contracts
              </span>
              <span className="border-surface-border bg-surface-card rounded-lg border px-3 py-1.5 font-mono">
                1 Circuit
              </span>
              <span className="border-surface-border bg-surface-card rounded-lg border px-3 py-1.5 font-mono">
                58 API Routes
              </span>
              <span className="border-surface-border bg-surface-card rounded-lg border px-3 py-1.5 font-mono">
                9 Prisma Models
              </span>
              <span className="border-surface-border bg-surface-card rounded-lg border px-3 py-1.5 font-mono">
                3 Portals
              </span>
              <span className="border-surface-border bg-surface-card rounded-lg border px-3 py-1.5 font-mono">
                1 Extension
              </span>
            </div>
          </motion.div>
        </section>

        {/* ─── 1. The Vision ─── */}
        <SectionDivider label="The Vision" icon={<Eye className="h-5 w-5" />} />
        <section id="vision" className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="mb-6 text-2xl font-bold md:text-3xl">
                Academic Credential Verification Without Trust
              </h2>
              <div className="text-muted space-y-4 text-sm leading-relaxed">
                <p>
                  Veridaq solves a fundamental problem: how can an employer verify a job candidate
                  academic claims without forcing universities to expose their entire student
                  database and without putting private student data on a public blockchain?
                </p>
                <p>
                  The answer is a cryptographic sandwich. On one side, universities commit Poseidon
                  hashes of student credentials to Base L2. On the other side, employers generate
                  Groth16 Zero Knowledge Proofs that verify specific claims against those
                  commitments. The student data never appears in plaintext on any public medium.
                </p>
                <p>
                  Three distinct portals serve three distinct roles. The Institution Portal for
                  universities to upload and manage credential batches. The Employer Portal for
                  organizations to submit verification requests. The Admin Portal for platform
                  governance, KYC approval, and tier management.
                </p>
                <p>
                  A Chrome Extension companion allows employers to submit verification requests
                  directly from any webpage without opening the full portal. All cryptographic
                  operations happen server side. The extension never sees raw student data.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  Core Principles
                </h3>
                <ul className="text-muted space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="bg-success/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>No PII ever written to the public ledger</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-success/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>
                      Zero Knowledge Proofs ensure mathematical verification without data exposure
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-success/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>ERC 4337 Paymaster sponsors gas for FREE tier institutions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-success/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>Employers get 3 free verifications before requiring subscription</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-success/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>Revocation is append only and permanently recorded on chain</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-success/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>All mutable operations protected by role based access control</span>
                  </li>
                </ul>
              </div>

              <div className="border-error/20 bg-error/[0.03] rounded-xl border p-5">
                <h3 className="text-error mb-3 flex items-center gap-2 text-sm font-bold">
                  <Shield className="h-4 w-4" />
                  What Veridaq Is Not
                </h3>
                <ul className="text-muted space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="bg-error/20 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>
                      Not a diploma issuance platform. Institutions remain the sole source of truth
                      for academic records.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-error/20 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>
                      Not a replacement for university transcripts. It is a mathematical
                      verification layer.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-error/20 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>
                      Not a decentralized identity system. Institutions are trusted nodes.
                    </span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── 2. System Topology ─── */}
        <SectionDivider label="System Topology" icon={<Network className="h-5 w-5" />} />
        <section id="topology" className="container mx-auto max-w-6xl px-4 md:px-6">
          <TopologyDiagram />
        </section>

        {/* ─── 3. Smart Contract Layer ─── */}
        <SectionDivider label="Smart Contract Layer" icon={<FileCode2 className="h-5 w-5" />} />
        <section id="contracts" className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-8 space-y-4">
            <p className="text-muted text-sm leading-relaxed">
              Eight Solidity contracts deployed on Base Sepolia, compiled with Foundry 0.8.28 and
              tested with forge. The contracts implement a layered architecture with clear
              dependency boundaries. Every public function is protected by OpenZeppelin
              AccessControl or custom modifiers that validate caller identity against
              InstitutionRegistry.
            </p>
          </div>

          <div className="mb-12 grid gap-4 md:grid-cols-2">
            <ContractCard
              name="InstitutionRegistry"
              purpose="On chain identity for universities"
              abi="Ownable"
              icon={<Building2 className="h-4 w-4" />}
              highlights={[
                "Maps bytes32 institution IDs to name, adminWallet, publicKey, active status",
                "PLATFORM_ADMIN_ROLE can register, deactivate, reactivate, transfer admin wallets",
                "Institution admin can rotate off chain signing key",
                "Referenced by CredentialRegistry, RevocationRegistry, PaymasterVault",
              ]}
            />
            <ContractCard
              name="CredentialRegistry"
              purpose="Credential commitment storage"
              abi="ReentrancyGuard"
              icon={<Database className="h-4 w-4" />}
              highlights={[
                "Stores nullifier to CredentialRecord mapping with commitment, institutionId, graduationYear",
                "Inverse mapping from commitment back to nullifier",
                "Per institution nullifier list for enumeration",
                "registerBatch requires BUNDLER_ROLE or institution admin",
                "CEI pattern with ReentrancyGuard and Pausable",
              ]}
            />
            <ContractCard
              name="RevocationRegistry"
              purpose="Append only revocation list"
              abi="Ownable"
              icon={<EyeOff className="h-4 w-4" />}
              highlights={[
                "Stores nullifier to RevocationRecord with institutionId, reasonCode, revokedAt",
                "Only the institution admin that registered the nullifier can revoke",
                "Reason codes: Data Entry Error, Re enrolled, Fraud, Institutional Error, Other",
                "Queried by backend before generating ZK proofs",
              ]}
            />
            <ContractCard
              name="SubscriptionManager"
              purpose="Tier and free verification tracking"
              abi="AccessControl"
              icon={<Coins className="h-4 w-4" />}
              highlights={[
                "InstitutionTier enum: FREE (platform sponsors gas) or PAID (institution funds own gas)",
                "shouldSponsor function used by PaymasterVault to decide gas sponsorship",
                "Tracks employer free verifications: 3 per new employer",
                "BUNDLER_ROLE decrements free verification counter",
              ]}
            />
            <ContractCard
              name="PaymasterVault"
              purpose="ERC 4337 v0.6 Paymaster"
              abi="IPaymaster"
              icon={<Wallet className="h-4 w-4" />}
              highlights={[
                "Two ETH pools: sponsoredPool (platform funded) and per institution institutionBalances",
                "validatePaymasterUserOp decodes paymasterAndData to extract institutionId and batchSize",
                "postOp reconciles actual gas cost, refunds unused reserve",
                "Institution admin or platform admin can withdraw institution balances",
                "emergencyWithdrawSponsoredPool for decommissioning",
              ]}
            />
            <ContractCard
              name="ZKVerifier"
              purpose="Groth16 verification"
              abi="Assembly"
              icon={<ShieldCheck className="h-4 w-4" />}
              highlights={[
                "Pure assembly implementation auto generated by SnarkJS",
                "4 public signals: commitment, nullifier, claimType, threshold",
                "Verification key embedded at deploy time",
                "Real Groth16 pairing check on BN254 curve",
              ]}
            />
            <ContractCard
              name="VeridaqSimpleAccount"
              purpose="ERC 4337 SimpleAccount"
              abi="UUPS"
              icon={<UserCheck className="h-4 w-4" />}
              highlights={[
                "Minimal account with UUPS upgradeability and Initializable proxy pattern",
                "execute and executeBatch restricted to EntryPoint or owner",
                "ECDSA signature validation via EIP 191 signed hash",
                "Supports addDeposit and withdrawDepositTo for EntryPoint gas management",
              ]}
            />
            <ContractCard
              name="SimpleAccountFactory"
              purpose="Deterministic account deployment"
              abi="Create2"
              icon={<GitBranch className="h-4 w-4" />}
              highlights={[
                "Creates VeridaqSimpleAccount via ERC1967Proxy with Create2",
                "createAccount returns existing or deploys new",
                "getAddress computes counterfactual address off chain",
              ]}
            />
          </div>

          <div className="border-surface-border bg-surface-card rounded-xl border p-6">
            <h3 className="mb-4 text-base font-bold">Deployment Order</h3>
            <div className="flex flex-col gap-3 text-sm">
              {[
                { step: 1, name: "InstitutionRegistry", desc: "Foundation for identity mapping" },
                { step: 2, name: "CredentialRegistry", desc: "Depends on InstitutionRegistry" },
                { step: 3, name: "RevocationRegistry", desc: "Depends on both registries" },
                {
                  step: 4,
                  name: "SubscriptionManager",
                  desc: "Independent, receives BUNDLER_ROLE grant",
                },
                {
                  step: 5,
                  name: "PaymasterVault",
                  desc: "Depends on EntryPoint and SubscriptionManager",
                },
                { step: 6, name: "ZKVerifier", desc: "Standalone, embeds verification key" },
                { step: 7, name: "SimpleAccountFactory", desc: "Standalone, creates AA wallets" },
              ].map((d) => (
                <div key={d.step} className="flex items-center gap-4">
                  <span className="bg-accent/10 text-accent flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold">
                    {d.step}
                  </span>
                  <span className="w-48 font-semibold">{d.name}</span>
                  <span className="text-muted hidden md:block">{d.desc}</span>
                  <div className="bg-surface-border flex-1 border-t border-dashed" />
                  <span className="text-muted-subtle text-[10px]">
                    {d.step < 7 ? "depends on previous" : "standalone"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 4. Cryptographic Core ─── */}
        <SectionDivider label="Cryptographic Core" icon={<Fingerprint className="h-5 w-5" />} />
        <section id="cryptography" className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold md:text-3xl">Circom 2.0 Circuit Architecture</h2>
              <p className="text-muted text-sm leading-relaxed">
                The heart of Veridaq cryptographic guarantees is a single Circom 2.0.8 circuit
                called CredentialVerifier. It accepts 8 private inputs from the institution and 4
                public inputs visible to everyone. The circuit produces exactly one boolean output:
                true if and only if the private inputs correspond to the on chain commitment AND the
                selected claim predicate is satisfied.
              </p>

              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
                  <Key className="text-accent h-4 w-4" />
                  Private Inputs (8)
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    "nameHash",
                    "matricHash",
                    "cgpa",
                    "classification",
                    "courseHash",
                    "graduationYear",
                    "blindingFactor",
                    "institutionKey",
                  ].map((input) => (
                    <div
                      key={input}
                      className="bg-surface border-surface-border text-muted rounded-md border px-3 py-2 font-mono"
                    >
                      {input}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
                  <Globe className="text-warning h-4 w-4" />
                  Public Inputs (4)
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    "commitment (on chain pointer)",
                    "nullifier (revocation handle)",
                    "claimType (1 6 selector)",
                    "threshold (comparison value)",
                  ].map((input) => (
                    <div
                      key={input}
                      className="bg-surface border-surface-border text-muted rounded-md border px-3 py-2 font-mono"
                    >
                      {input}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="border-surface-border bg-surface-card overflow-hidden rounded-xl border">
                <div className="border-surface-border text-muted flex items-center gap-2 border-b px-4 py-2.5 text-xs">
                  <div className="flex gap-1.5">
                    <div className="bg-error/60 h-2 w-2 rounded-full" />
                    <div className="bg-warning/60 h-2 w-2 rounded-full" />
                    <div className="bg-success/60 h-2 w-2 rounded-full" />
                  </div>
                  <span className="ml-2">credential.circom Constraint Flow</span>
                </div>
                <div className="text-muted p-4 font-mono text-[10px] leading-relaxed md:text-xs">
                  <div className="space-y-3">
                    <div>
                      <span className="text-accent">// Constraint 1: Commitment Consistency</span>
                      <br />
                      <span className="text-accent">Poseidon</span>(nameHash, matricHash, cgpa,
                      classification, courseHash, graduationYear, blindingFactor)
                      <br />
                      <span className="text-foreground">commitment</span>{" "}
                      <span className="text-error">===</span>{" "}
                      <span className="text-foreground">commitHasher.out</span>
                    </div>
                    <div>
                      <span className="text-accent">// Constraint 2: Nullifier Consistency</span>
                      <br />
                      <span className="text-accent">Poseidon</span>(matricHash, institutionKey)
                      <br />
                      <span className="text-foreground">nullifier</span>{" "}
                      <span className="text-error">===</span>{" "}
                      <span className="text-foreground">nullHasher.out</span>
                    </div>
                    <div>
                      <span className="text-accent">// Constraint 3: Claim Predicate</span>
                      <br />
                      claimType <span className="text-error">===</span> 1 : yearValid
                      <br />
                      claimType <span className="text-error">===</span> 2 : classification &gt;= 2
                      <br />
                      claimType <span className="text-error">===</span> 3 : classification &gt;= 3
                      <br />
                      claimType <span className="text-error">===</span> 4 : classification{" "}
                      <span className="text-error">===</span> 4
                      <br />
                      claimType <span className="text-error">===</span> 5 : cgpa &gt;= threshold
                      <br />
                      claimType <span className="text-error">===</span> 6 : courseHash{" "}
                      <span className="text-error">!=</span> 0 AND yearValid
                      <br />
                      <span className="text-foreground">claimResult</span>{" "}
                      <span className="text-error">===</span> 1
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 text-sm font-bold">Poseidon Hash Function</h3>
                <p className="text-muted mb-4 text-sm leading-relaxed">
                  Veridaq uses Poseidon instead of SHA256 or Keccak256 because Poseidon is
                  specifically designed for Zero Knowledge applications. It requires far fewer
                  constraints in Circom circuits resulting in faster proof generation and smaller
                  proof sizes.
                </p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-surface border-surface-border rounded-lg border p-3">
                    <span className="text-accent block font-semibold">BN254 Field Modulus</span>
                    <span className="text-muted break-all font-mono text-[9px]">
                      21888242871839275222246405745257275088548364400416034343698204186575808495617
                    </span>
                  </div>
                  <div className="bg-surface border-surface-border rounded-lg border p-3">
                    <span className="text-accent block font-semibold">Proof Size</span>
                    <span className="text-lg font-bold">~240 bytes</span>
                    <span className="text-muted block">per Groth16 proof</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="mt-8">
            <ClaimTypeTable />
          </div>
        </section>

        {/* ─── 5. Proof Lifecycle ─── */}
        <SectionDivider label="Proof Lifecycle" icon={<Route className="h-5 w-5" />} />
        <section id="lifecycle" className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <p className="text-muted text-sm leading-relaxed">
                The complete lifecycle of a credential from issuance to verification spans 10
                distinct phases across three systems. Each phase is independently auditable and
                cryptographically bound to the previous one.
              </p>
              <div className="space-y-3">
                {[
                  {
                    phase: "Issuance",
                    items: [
                      "Institution uploads XLSX with student records",
                      "BullMQ worker validates each row against Zod schema",
                      "Poseidon commitment computed for each student",
                      "AES 256 GCM encrypts plaintext attributes",
                      "AA UserOp submitted to CredentialRegistry via Bundler",
                    ],
                  },
                  {
                    phase: "Storage",
                    items: [
                      "CredentialRegistry stores commitment nullifier pair on chain",
                      "Backend stores encrypted plaintext in PostgreSQL",
                      "Commitment is the only data visible on the public ledger",
                      "Nullifier enables future revocation without revealing identity",
                    ],
                  },
                  {
                    phase: "Verification",
                    items: [
                      "Employer submits institution, matric number, claim type, threshold",
                      "Backend decrypts stored credential and looks up matric hash",
                      "SnarkJS fullProve generates Groth16 proof in ~0.7 seconds",
                      "ZKVerifier.sol verifies proof on chain via BN254 pairing",
                      "Result stored in VerificationRequest and returned to employer",
                    ],
                  },
                  {
                    phase: "Revocation",
                    items: [
                      "Institution admin initiates revocation with reason code",
                      "BlockchainService calls RevocationRegistry.revokeCredential",
                      "Nullifier marked as revoked on chain permanently",
                      "Backend updates credential status to REVOKED",
                      "Future verification requests return CREDENTIAL_REVOKED",
                    ],
                  },
                ].map((p) => (
                  <div
                    key={p.phase}
                    className="border-surface-border bg-surface-card rounded-xl border p-4"
                  >
                    <h3 className="text-accent mb-3 text-sm font-bold">{p.phase}</h3>
                    <ul className="space-y-1.5">
                      {p.items.map((item, i) => (
                        <li key={i} className="text-muted flex items-start gap-2 text-xs">
                          <div className="bg-accent/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <AnimatedProofFlow />
            </div>
          </div>
        </section>

        {/* ─── 6. Account Abstraction ─── */}
        <SectionDivider label="Account Abstraction" icon={<Wallet className="h-5 w-5" />} />
        <section id="accountabstraction" className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold md:text-3xl">ERC 4337 Paymaster Flow</h2>
              <p className="text-muted text-sm leading-relaxed">
                Veridaq uses ERC 4337 Account Abstraction to separate gas payment from transaction
                authorship. This allows the platform to sponsor transaction fees for FREE tier
                institutions and enables institutions to pay for their own batches from a dedicated
                on chain balance.
              </p>
              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 text-sm font-bold">UserOperation Construction</h3>
                <ol className="text-muted space-y-3 text-sm">
                  {[
                    "Compute sender address via SimpleAccountFactory.getAddress",
                    "Encode registerBatch calldata wrapped in SimpleAccount.execute()",
                    "Build UserOp with sender, nonce, initCode, callData, callGasLimit, verificationGasLimit, preVerificationGas, maxFeePerGas, maxPriorityFeePerGas",
                    "Encode paymasterAndData with institutionId and batchSize for PaymasterVault",
                    "Estimate gas via bundler RPC method eth_estimateUserOperationGas",
                    "Check funds: FREE tier uses sponsored pool, PAID tier uses institution balance",
                    "Sign userOp hash with the AA owner private key",
                    "Submit via eth_sendUserOperation and poll for UserOperationEvent receipt",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="bg-accent/10 text-accent mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px]">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="space-y-6">
              <AaFlowDiagram />
              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 text-sm font-bold">Gas Sponsorship Decision Flow</h3>
                <div className="text-muted space-y-3 text-xs">
                  <div className="bg-surface border-surface-border rounded-lg border p-3">
                    <span className="text-accent block font-semibold">FREE Tier</span>
                    <span className="mt-1 block">
                      Platform sponsored pool covers gas for up to 999 students per batch.
                      SubscriptionManager.shouldSponsor returns true. PaymasterVault deducts from
                      sponsoredPool after postOp reconciliation.
                    </span>
                  </div>
                  <div className="bg-surface border-surface-border rounded-lg border p-3">
                    <span className="text-accent block font-semibold">PAID Tier</span>
                    <span className="mt-1 block">
                      Institution pays from its own on chain balance. PaymasterVault deducts from
                      institutionBalances mapping. Institution admin can deposit ETH via
                      fundInstitution and withdraw anytime.
                    </span>
                  </div>
                  <div className="bg-error/5 border-error/20 rounded-lg border p-3">
                    <span className="text-error block font-semibold">Insufficient Funds</span>
                    <span className="mt-1 block">
                      If neither pool has sufficient balance, the batch is marked FAILED with
                      detailed error metadata showing funding shortfall.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 7. Backend Architecture ─── */}
        <SectionDivider label="Backend Architecture" icon={<Server className="h-5 w-5" />} />
        <section id="backend" className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <p className="text-muted text-sm leading-relaxed">
                The backend is a Fastify 5 TypeScript server with 38 source files organized across 6
                directories. It runs on Node.js 22 and connects to PostgreSQL 16 via Prisma ORM and
                Redis 7 via ioredis.
              </p>
              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 text-sm font-bold">Plugin Architecture</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { name: "@fastify/helmet", desc: "CSP headers in production" },
                    {
                      name: "@fastify/cors",
                      desc: "Restricted to FRONTEND_URL and EXTENSION_ORIGINS",
                    },
                    { name: "@fastify/cookie", desc: "httpOnly JWT refresh tokens" },
                    { name: "@fastify/rate-limit", desc: "300 req/min global, Redis backed" },
                    { name: "@fastify/multipart", desc: "10 MB Excel upload limit" },
                    { name: "@fastify/swagger", desc: "Auto generated OpenAPI docs at /docs" },
                    { name: "prismaPlugin", desc: "PrismaClient singleton with request lifecycle" },
                    { name: "redisPlugin", desc: "ioredis connection for BullMQ and caching" },
                    { name: "authPlugin", desc: "JWT verification + role based preHandler hooks" },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center justify-between gap-4">
                      <span className="font-mono text-xs">{p.name}</span>
                      <span className="text-muted text-xs">{p.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 text-sm font-bold">BullMQ Batch Processing Pipeline</h3>
                <ol className="text-muted space-y-2 text-xs">
                  {[
                    "Upload endpoint enqueues job to batch processing queue",
                    "Worker picks up job with concurrency limit of 2",
                    "Reads Excel via ExcelJS row by row",
                    "Validates each row against Zod schema",
                    "Parses classification from text labels (first class -> 4, 2.1 -> 3, etc.)",
                    "Computes Poseidon commitment and nullifier via circomlibjs",
                    "Encrypts plaintext attributes with AES 256 GCM",
                    "Writes Batch and Credential records in a Prisma transaction",
                    "Submits AA UserOp to on chain registration",
                    "Updates Batch status to CONFIRMED or FAILED with error metadata",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="bg-accent/10 text-accent mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded font-mono text-[8px]">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 text-sm font-bold">API Surface (58 Routes)</h3>
                <div className="space-y-3 text-xs">
                  {[
                    {
                      prefix: "Auth /api/auth",
                      count: "9 routes",
                      desc: "login, register, refresh, logout, password reset, extension token",
                    },
                    {
                      prefix: "Institution /api/institution",
                      count: "16 routes",
                      desc: "batch CRUD, claims, revoke, billing, dashboard, profile, AA predeploy",
                    },
                    {
                      prefix: "Employer /api/employer",
                      count: "2 routes",
                      desc: "get profile, update profile",
                    },
                    {
                      prefix: "Admin /api/admin",
                      count: "14 routes",
                      desc: "KYC approval, tier management, funding, deactivation, stats",
                    },
                    {
                      prefix: "Verification /api/verify",
                      count: "5 routes",
                      desc: "request, poll, history, PDF report, active institutions",
                    },
                    {
                      prefix: "Stats /api/stats",
                      count: "2 routes",
                      desc: "platform snapshot, SSE streaming every 10s",
                    },
                    { prefix: "Health", count: "1 route", desc: "plain health check" },
                  ].map((g) => (
                    <div
                      key={g.prefix}
                      className="border-surface-border bg-surface rounded-lg border p-3"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-foreground font-semibold">{g.prefix}</span>
                        <span className="text-accent font-mono text-[10px]">{g.count}</span>
                      </div>
                      <span className="text-muted">{g.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 text-sm font-bold">Prisma Schema 9 Models</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    "Admin",
                    "Institution",
                    "Employer",
                    "Batch",
                    "Credential",
                    "ClaimDefinition",
                    "VerificationRequest",
                    "AuditLog",
                  ].map((m) => (
                    <div
                      key={m}
                      className="bg-surface border-surface-border text-muted rounded border px-3 py-2 font-mono"
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 text-sm font-bold">Email Service 8 Templates</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    "credentialIssued",
                    "verificationResult",
                    "kycApproval",
                    "kycRejection",
                    "passwordReset",
                    "newAdminRegistrationAlert",
                    "institutionDeactivationAlert",
                    "employerDeactivationAlert",
                  ].map((t) => (
                    <div
                      key={t}
                      className="bg-surface border-surface-border text-muted rounded border px-3 py-2 font-mono"
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 8. Frontend Portals ─── */}
        <SectionDivider label="Frontend Portals" icon={<Globe className="h-5 w-5" />} />
        <section id="frontend" className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {[
              {
                role: "Institution Portal",
                icon: <Building2 className="h-5 w-5" />,
                color: "accent",
                routes: [
                  "Dashboard with credential and verification stats",
                  "Batch upload, validation, and on chain submission",
                  "Claim definition management with 6 claim types",
                  "Verification request review and approval workflow",
                  "Billing with paymaster balance sync",
                ],
              },
              {
                role: "Employer Portal",
                icon: <Briefcase className="h-5 w-5" />,
                color: "info",
                routes: [
                  "Dashboard with verification request history",
                  "Credential verification with institution, matric, claim type",
                  "Real time polling for proof generation results",
                  "Verification history with paginated search",
                  "PDF report generation for audit trails",
                ],
              },
              {
                role: "Admin Portal",
                icon: <Shield className="h-5 w-5" />,
                color: "error",
                routes: [
                  "Institution KYC approval and tier management",
                  "Employer KYC approval and onboarding",
                  "Paymaster funding and balance management",
                  "Platform statistics with real time SSE streaming",
                  "Institution and employer deactivation",
                ],
              },
            ].map((portal) => (
              <motion.div
                key={portal.role}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border-surface-border bg-surface-card hover:border-accent/30 group rounded-xl border p-6 transition-all"
              >
                <div
                  className="mb-4 inline-flex rounded-lg p-3"
                  style={{
                    backgroundColor: `rgb(var(--color-${portal.color}) / 0.1)`,
                    color: `rgb(var(--color-${portal.color}))`,
                  }}
                >
                  {portal.icon}
                </div>
                <h3 className="mb-4 text-lg font-bold">{portal.role}</h3>
                <ul className="space-y-2">
                  {portal.routes.map((r) => (
                    <li key={r} className="text-muted flex items-start gap-2 text-xs">
                      <ChevronRight
                        className="mt-0.5 h-3 w-3 shrink-0"
                        style={{ color: `rgb(var(--color-${portal.color}))` }}
                      />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <div className="border-surface-border mt-8 rounded-xl border p-6">
            <h3 className="mb-4 text-sm font-bold">Shared UI Architecture</h3>
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div className="bg-surface border-surface-border rounded-lg border p-4">
                <h4 className="text-accent mb-2 text-xs font-bold uppercase tracking-widest">
                  State Management
                </h4>
                <p className="text-muted text-xs">
                  TanStack Query for server state with 30 second stale time. Auth context provides
                  login, logout, and user object globally. Zustand store for toast notifications.
                  Access token in memory only, refresh token in httpOnly cookie.
                </p>
              </div>
              <div className="bg-surface border-surface-border rounded-lg border p-4">
                <h4 className="text-accent mb-2 text-xs font-bold uppercase tracking-widest">
                  API Client
                </h4>
                <p className="text-muted text-xs">
                  Axios instance with base URL from NEXT_PUBLIC_BACKEND_URL. Request interceptor
                  attaches Bearer token. Response interceptor handles 401 with automatic token
                  refresh via refresh cookie. Retry queuing prevents race conditions during
                  concurrent refreshes.
                </p>
              </div>
              <div className="bg-surface border-surface-border rounded-lg border p-4">
                <h4 className="text-accent mb-2 text-xs font-bold uppercase tracking-widest">
                  Design System
                </h4>
                <p className="text-muted text-xs">
                  Tailwind CSS with CSS custom properties for dark light theming. CSS variables
                  stored as RGB triplets for opacity modifier support. Space Grotesk font for
                  headings, IBM Plex Mono for code. Purple accent with red error and fuchsia info
                  palette.
                </p>
              </div>
              <div className="bg-surface border-surface-border rounded-lg border p-4">
                <h4 className="text-accent mb-2 text-xs font-bold uppercase tracking-widest">
                  Auth Guards
                </h4>
                <p className="text-muted text-xs">
                  Each portal layout component checks authentication on mount. Orbital loading
                  animation while verifying session. Unauthenticated users redirected to login. Role
                  based access enforced at both frontend layout and backend route levels.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 9. Browser Extension ─── */}
        <SectionDivider label="Browser Extension" icon={<Puzzle className="h-5 w-5" />} />
        <section id="extension" className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <p className="text-muted text-sm leading-relaxed">
                A Manifest V3 Chrome extension that enables employers to submit verification
                requests without opening the full web portal. The extension shares the web app
                session via httpOnly cookies and a short lived extension token endpoint.
              </p>
              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 text-sm font-bold">Extension Components</h3>
                <div className="space-y-3 text-sm">
                  {[
                    {
                      name: "Popup",
                      desc: "Quick verify form with institution ID, matric number, and claim selector. Shows recent verification results.",
                    },
                    {
                      name: "Panel",
                      desc: "Side panel with full verification history, batch upload shortcuts, and session status.",
                    },
                    {
                      name: "Content Script",
                      desc: "Injects a context menu for right clicking matric numbers on any webpage.",
                    },
                    {
                      name: "Service Worker",
                      desc: "Background worker that handles token exchange and session persistence.",
                    },
                  ].map((c) => (
                    <div
                      key={c.name}
                      className="border-surface-border bg-surface rounded-lg border p-3"
                    >
                      <span className="text-accent mb-1 block text-xs font-bold">{c.name}</span>
                      <span className="text-muted text-xs">{c.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 text-sm font-bold">Security Model</h3>
                <ul className="text-muted space-y-3 text-xs">
                  <li className="flex items-start gap-2">
                    <div className="bg-success/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>
                      Extension never sees raw student data. All cryptographic operations happen
                      server side.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-success/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>
                      Session shared via httpOnly cookies. Extension uses a 5 minute token obtained
                      from the web app.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-success/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>
                      No external permissions required beyond host access to the Veridaq backend.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-success/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>Manifest V3 with strict CSP and no eval or remote code execution.</span>
                  </li>
                </ul>
              </div>
              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 text-sm font-bold">Extension Flow</h3>
                <ol className="text-muted space-y-2 text-xs">
                  {[
                    "User logs into the Veridaq web app",
                    "Extension obtains short lived token via POST /api/auth/extension/token",
                    "User navigates to any webpage and opens the extension popup",
                    "Extension sends verification request to backend API with the access token",
                    "Backend processes the request and returns the result",
                    "Extension displays the verification result in the popup",
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="bg-accent/10 text-accent mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded font-mono text-[8px]">
                        {i + 1}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 10. Deployment ─── */}
        <SectionDivider label="Deployment Topology" icon={<Terminal className="h-5 w-5" />} />
        <section id="deployment" className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold md:text-3xl">Infrastructure Architecture</h2>
              <p className="text-muted text-sm leading-relaxed">
                Veridaq runs on Docker Compose for local development with PostgreSQL 16 and Redis 7
                as backing services. The backend and frontend run outside Docker on the host
                machine. Base Sepolia serves as the L2 settlement layer.
              </p>
              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 text-sm font-bold">Local Development Stack</h3>
                <div className="space-y-3 text-xs">
                  {[
                    {
                      service: "PostgreSQL 16",
                      port: "5432",
                      purpose: "Primary database for all Prisma models",
                    },
                    {
                      service: "Redis 7",
                      port: "6379",
                      purpose: "BullMQ queue backend and rate limiting",
                    },
                    {
                      service: "Backend",
                      port: "4000",
                      purpose: "Fastify 5 API server with Swagger at /docs",
                    },
                    {
                      service: "Frontend",
                      port: "3000",
                      purpose: "Next.js 15 App Router with Tailwind CSS",
                    },
                    {
                      service: "Base Sepolia",
                      port: "RPC",
                      purpose: "L2 EVM with 8 deployed contracts",
                    },
                  ].map((s) => (
                    <div
                      key={s.service}
                      className="border-surface-border bg-surface flex items-center gap-4 rounded-lg border p-3"
                    >
                      <span className="text-foreground w-32 font-semibold">{s.service}</span>
                      <span className="text-accent w-16 font-mono">{s.port}</span>
                      <span className="text-muted flex-1">{s.purpose}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="border-surface-border bg-surface-card rounded-xl border p-5">
                <h3 className="mb-4 text-sm font-bold">Production Deployment Checklist</h3>
                <ul className="text-muted space-y-2 text-xs">
                  <li className="flex items-start gap-2">
                    <div className="bg-accent/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>.env file with 58 Zod validated environment variables</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-accent/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>Prisma migrate to create database schema</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-accent/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>
                      Seed script to create admin, demo institution, demo employer, and 6 claim
                      definitions
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-accent/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>Contracts deployed via forge script with --broadcast --verify</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-accent/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>Circuit compiled and trusted setup run with Hermez Powers of Tau</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-accent/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>BUNDLER_ROLE granted to platform admin on SubscriptionManager</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-accent/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>Contract addresses copied to .env for backend blockchain service</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-accent/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>Circuit zkey and wasm paths configured for proof service</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-accent/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>Alchemy RPC URL configured for Base Sepolia access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-accent/20 mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>SMTP credentials configured for email notifications</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 11. Security Model ─── */}
        <SectionDivider label="Security Model" icon={<Shield className="h-5 w-5" />} />
        <section id="security" className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-8 space-y-4">
            <p className="text-muted text-sm leading-relaxed">
              Veridaq security operates at three layers: cryptographic guarantees at the circuit
              level, smart contract access controls at the protocol level, and application security
              at the API level. Each layer enforces independent constraints that an attacker must
              bypass sequentially.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <SecurityPillar
              title="Cryptographic Guarantees"
              items={[
                "Poseidon hash is one way. On chain commitments reveal zero information about the underlying plaintext.",
                "Groth16 proofs are sound. A false claim cannot produce a valid proof.",
                "Blinding factor is 128 bits of randomness injected per credential. Brute force is computationally infeasible.",
                "BN254 elliptic curve pairing check ensures proof integrity on chain.",
                "AES 256 GCM encryption protects plaintext at rest in the backend database.",
              ]}
            />
            <SecurityPillar
              title="Smart Contract Security"
              items={[
                "OpenZeppelin AccessControl for role based function gating.",
                "ReentrancyGuard on all state mutating functions in CredentialRegistry.",
                "Pausable for emergency stop capability.",
                "CEI pattern Checks Effects Interactions strictly followed.",
                "InstitutionRegistry validates caller identity before any registry operation.",
                "PaymasterVault uses staticcall for balance reads to prevent reentrancy.",
              ]}
            />
            <SecurityPillar
              title="Application Security"
              items={[
                "All API request bodies validated with Zod schema before database access.",
                "bcryptjs with cost factor 12 for all password hashing.",
                "JWTs stored exclusively in httpOnly cookies. Never in localStorage.",
                "Refresh token rotation with 7 day expiry and SHA 256 server side hash.",
                "Rate limiting on auth endpoints: 5 attempts per 15 minutes per IP.",
                "No eval, no Function(), no dynamic require anywhere in the codebase.",
                "CORS restricted to known frontend and extension origins.",
                "Helmet CSP headers enabled in production.",
              ]}
            />
          </div>
        </section>

        {/* ─── 12. Protocol Directives ─── */}
        <SectionDivider label="Protocol Directives" icon={<ScrollText className="h-5 w-5" />} />
        <section id="directives" className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="border-error/20 bg-error/[0.02] rounded-xl border p-6 md:p-8">
            <h2 className="text-error mb-6 flex items-center gap-3 text-xl font-bold">
              <Shield className="h-6 w-6" />
              Absolute Architectural Directives
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  rule: "No PII on the public ledger",
                  detail:
                    "No student name, matric number, CGPA, course, or any personally identifiable information may ever appear in a transaction calldata or event log on Base Sepolia. Only Poseidon commitments and nullifiers are recorded on chain.",
                },
                {
                  rule: "Proofs are boolean only",
                  detail:
                    "ZKVerifier.sol returns exactly true or false. No intermediate data, no plaintext, no metadata about the student is returned to the caller. The employer learns only whether the claim is satisfied.",
                },
                {
                  rule: "Revocation is permanent and auditable",
                  detail:
                    "Once a nullifier is revoked on RevocationRegistry, it cannot be unrevoked. The revocation record includes a reason code and timestamp, creating a permanent audit trail.",
                },
                {
                  rule: "Access control at every layer",
                  detail:
                    "Every API route, every smart contract function, every frontend route enforces role based access. INSTITUTION, EMPLOYER, and ADMIN roles are strictly separated and enforced independently at each layer.",
                },
                {
                  rule: "Gas sponsorship is deterministic",
                  detail:
                    "The PaymasterVault sponsorship decision is based purely on the institution tier and batch size. No human intervention, no discretionary approval. FREE tier batches under 1000 students are always sponsored.",
                },
                {
                  rule: "Plaintext is ephemeral",
                  detail:
                    "Student plaintext attributes exist in application memory only during proof generation. After SnarkJS fullProve completes, the plaintext buffer is cleared. The only persistent storage of plaintext is AES 256 GCM ciphertext in the database.",
                },
                {
                  rule: "Institutions are the sole source of truth",
                  detail:
                    "Veridaq does not issue credentials. Institutions upload commitments of their own records. Veridaq provides the cryptographic verification layer. If an institution registers a false commitment, that is an institutional issue, not a protocol issue.",
                },
                {
                  rule: "Verification is permissionless",
                  detail:
                    "Any employer with a valid account and available verification credits can verify any credential from any institution. No bilateral agreement, no API key exchange, no manual approval is required for individual verifications.",
                },
              ].map((d) => (
                <div
                  key={d.rule}
                  className="border-surface-border bg-surface-card rounded-xl border p-5"
                >
                  <h3 className="mb-2 flex items-start gap-2 text-sm font-bold">
                    <div className="bg-error/20 mt-0.5 h-2 w-2 shrink-0 rounded-full" />
                    {d.rule}
                  </h3>
                  <p className="text-muted text-xs leading-relaxed">{d.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Footer CTA ─── */}
        <div className="container mx-auto mt-32 px-4 text-center md:px-6">
          <div className="border-surface-border bg-surface-card mx-auto max-w-2xl rounded-xl border p-8">
            <h2 className="mb-4 text-2xl font-bold">Explore the Protocol</h2>
            <p className="text-muted mb-6 text-sm">
              Dive deeper into the contracts, circuit, and API documentation.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/docs" className="btn-primary text-sm">
                <BookOpen className="h-4 w-4" />
                Full Documentation
              </Link>
              <Link href="/zkp" className="btn-secondary text-sm">
                <Fingerprint className="h-4 w-4" />
                ZKP Circuit Detail
              </Link>
              <Link href="/resources" className="btn-secondary text-sm">
                <Terminal className="h-4 w-4" />
                Technical Resources
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ── Inline icon components for missing imports ── */
function Building2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  )
}

function Briefcase(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function Puzzle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.611a2.404 2.404 0 0 1-1.704.706 2.404 2.404 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.404 2.404 0 0 1 1.998 12c0-.617.236-1.233.706-1.704L4.315 8.69a.979.979 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.611-1.611a2.404 2.404 0 0 1 1.704-.706c.617 0 1.233.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.969a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.968 1.02Z" />
    </svg>
  )
}
