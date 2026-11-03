"use client"
import Link from "next/link"
import React, { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShieldCheck,
  Layers,
  FileCode2,
  Network,
  ArrowLeft,
  Terminal,
  Database,
  Lock,
  X,
  ChevronRight,
  Activity,
  Workflow,
  Code,
} from "lucide-react"
import { AppHeader } from "@/components/ui/app-header"
import { ParallaxBg } from "@/components/parallax/parallax-layer"
import { FloatingShapes } from "@/components/parallax/floating-shapes"

export default function DocumentationPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  const [activeTab, setActiveTab] = useState("overview")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const tabs = [
    {
      id: "overview",
      label: "Executive Overview",
      icon: <ShieldCheck className="h-4 w-4" />,
      desc: "Protocol manifest & cryptographic principles",
    },
    {
      id: "architecture",
      label: "Architecture & Flow",
      icon: <Workflow className="h-4 w-4" />,
      desc: "End-to-end data movement & Event sequences",
    },
    {
      id: "contracts",
      label: "Smart Contracts",
      icon: <FileCode2 className="h-4 w-4" />,
      desc: "Stellar Soroban & Rust smart contracts",
    },
    {
      id: "zkp",
      label: "Zero-Knowledge Circom",
      icon: <Layers className="h-4 w-4" />,
      desc: "Groth16 SnarkJS logic & Polynomial constraints",
    },
    {
      id: "backend",
      label: "Fastify API & DB",
      icon: <Database className="h-4 w-4" />,
      desc: "Redis queues, Prisma schemas & Node clusters",
    },
  ]

  const activeTabIndex = tabs.findIndex((t) => t.id === activeTab)
  const prevTab = activeTabIndex > 0 ? tabs[activeTabIndex - 1] : null
  const nextTab = activeTabIndex < tabs.length - 1 ? tabs[activeTabIndex + 1] : null

  const CodeBlock = ({
    code,
    language = "typescript",
    filename = "",
    noBg = false,
  }: {
    code: string
    language?: string
    filename?: string
    noBg?: boolean
  }) => (
    <div
      className={`border-surface-border relative my-6 w-full max-w-[100vw] overflow-hidden rounded-md border sm:max-w-full ${noBg ? "" : "bg-surface"}`}
    >
      <div className="bg-surface-card border-surface-border flex flex-col justify-between gap-2 border-b px-4 py-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex shrink-0 gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/20" />
            <div className="bg-accent/20 h-2.5 w-2.5 rounded-full" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/20" />
          </div>
          {filename && (
            <span className="text-muted line-clamp-1 break-words font-mono text-xs">
              {filename}
            </span>
          )}
        </div>
        <span className="text-muted-subtle font-mono text-[10px] sm:text-xs">{language}</span>
      </div>
      <div className="hide-scrollbar w-full max-w-full overflow-x-auto">
        <pre className="text-muted inline-block min-w-full p-4 font-mono text-xs leading-relaxed md:text-sm">
          {code}
        </pre>
      </div>
    </div>
  )

  return (
    <div
      ref={containerRef}
      className="bg-void text-foreground selection:bg-accent/20 relative flex w-full flex-1 flex-col font-sans selection:text-inherit"
    >
      <ParallaxBg opacity={0.25} />
      <FloatingShapes count={10} />
      <AppHeader />

      {/* Back link */}
      <div className="container mx-auto px-4 pt-20 md:px-6">
        <div className="flex items-center gap-2 py-3">
          <Link
            href="/"
            className="text-muted hover:text-foreground group flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Home</span>
          </Link>
          <span className="text-muted-subtle text-xs">/</span>
          <span className="text-accent flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <Code className="h-4 w-4" /> Protocol Documentation
          </span>
        </div>
      </div>

      {/* Full Screen Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="bg-void border-surface-border fixed inset-0 z-[100] flex flex-col border-l md:hidden"
          >
            <div className="border-surface-border bg-surface-card flex items-center justify-between border-b p-4">
              <span className="text-accent text-xs font-bold uppercase tracking-widest">
                Documentation Menu
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-muted hover:text-foreground bg-surface rounded-sm p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              <div className="text-muted-subtle mb-4 mt-4 px-2 text-xs font-bold uppercase tracking-widest">
                Core Chapters
              </div>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setMobileMenuOpen(false)
                    window.scrollTo(0, 0)
                  }}
                  className={`flex w-full items-start gap-4 border p-4 text-left transition-all ${
                    activeTab === tab.id
                      ? "bg-accent/10 border-accent text-foreground"
                      : "border-surface-border bg-surface-card text-muted hover:bg-surface"
                  }`}
                >
                  <div
                    className={`mt-0.5 ${activeTab === tab.id ? "text-accent" : "text-muted-subtle"}`}
                  >
                    {tab.icon}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-bold ${activeTab === tab.id ? "text-accent" : "text-foreground"}`}
                    >
                      {tab.label}
                    </div>
                    <div className="text-muted-subtle mt-1 break-words text-xs leading-relaxed">
                      {tab.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto flex w-full max-w-full flex-col gap-8 px-4 pb-24 pt-28 md:flex-row md:px-6 md:pt-32 lg:gap-16">
        {/* Desktop Sidebar */}
        <aside className="relative hidden w-72 shrink-0 md:block">
          <div className="sticky top-32 space-y-1">
            <div className="text-muted-subtle mb-6 px-3 text-[10px] font-bold uppercase tracking-widest">
              Protocol Chapters
            </div>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  window.scrollTo(0, 0)
                }}
                className={`group flex w-full flex-col border-l-2 px-4 py-3 text-left transition-all ${
                  activeTab === tab.id
                    ? "bg-accent/10 border-accent"
                    : "text-muted hover:bg-surface-card border-transparent"
                }`}
              >
                <div className="flex w-full items-center gap-3">
                  <span className={`${activeTab === tab.id ? "text-accent" : "text-muted-subtle"}`}>
                    {tab.icon}
                  </span>
                  <span
                    className={`text-sm font-bold ${activeTab === tab.id ? "text-foreground" : ""}`}
                  >
                    {tab.label}
                  </span>
                </div>
                <span className="text-muted-subtle mt-1.5 pl-7 text-[11px] leading-relaxed">
                  {tab.desc}
                </span>
              </button>
            ))}

            <div className="text-muted-subtle mb-4 mt-12 px-4 text-[10px] font-bold uppercase tracking-widest">
              Network Links
            </div>
            <Link
              href="/blueprint"
              className="text-accent hover:text-foreground flex w-full items-center gap-3 px-4 py-2 text-sm font-medium transition-colors"
            >
              <Layers className="h-4 w-4" /> Protocol Blueprint
            </Link>
            <Link
              href="#"
              className="text-muted hover:text-foreground flex w-full items-center gap-3 px-4 py-2 text-sm font-medium transition-colors"
            >
              <Terminal className="h-4 w-4" /> Open Source Codebase
            </Link>
            <Link
              href="#"
              className="text-muted hover:text-foreground flex w-full items-center gap-3 px-4 py-2 text-sm font-medium transition-colors"
            >
              <Database className="h-4 w-4" /> Stellar Testnet Explorer
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="relative w-full min-w-0 max-w-full flex-1 md:max-w-5xl">
          <AnimatePresence mode="wait">
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full space-y-12"
              >
                <header className="border-surface-border w-full border-b pb-8">
                  <div className="bg-accent/10 text-accent border-accent/20 mb-6 inline-flex items-center gap-2 rounded-sm border px-2 py-1 font-mono text-xs">
                    DOCUMENTATION // SECTION 01
                  </div>
                  <h1 className="text-foreground mb-6 break-words text-4xl font-black tracking-tight md:text-6xl">
                    Executive Overview.
                  </h1>
                  <p className="text-muted text-xl font-light leading-relaxed md:text-2xl">
                    Veridaq completely decentralizes the academic verification layer, allowing
                    employers to verify student claims computationally without requiring
                    institutions to expose private academic databases.
                  </p>
                </header>

                <div className="w-full space-y-6">
                  <h2 className="flex items-center gap-3 text-2xl font-bold">
                    <ShieldCheck className="text-accent shrink-0" /> The Core Problem
                  </h2>
                  <div className="bg-surface-card border-surface-border w-full space-y-4 border p-6 md:p-8">
                    <p className="text-muted break-words leading-relaxed">
                      Traditional academic verification requires universities to expose massive
                      student databases via APIs to third-party employers, or forces students into
                      manual "transcript request" portals which take weeks to fulfill. Once data is
                      handed to an employer, the university permanently loses custody and control of
                      that student's PII (Personally Identifiable Information).
                    </p>
                    <p className="text-muted break-words leading-relaxed">
                      Blockchain solutions attempt to solve this by minting "Soulbound NFTs" or JSON
                      verifiable credentials. However, putting raw student names, grades, and GPAs
                      on a public blockchain is a catastrophic privacy violation. Even encrypting
                      them means trusting the future resilience of the encryption algorithm.
                    </p>
                  </div>
                </div>

                <div className="w-full space-y-6">
                  <h2 className="flex items-center gap-3 text-2xl font-bold">
                    <Layers className="text-accent shrink-0" /> The Veridaq Solution
                  </h2>
                  <div className="grid w-full max-w-full gap-6 md:grid-cols-2">
                    <div className="border-surface-border bg-surface w-full max-w-full overflow-hidden border p-6">
                      <div className="text-accent border-surface-border mb-3 inline-block border-b pb-2 font-mono text-xs">
                        01 // HASH COMMITMENTS
                      </div>
                      <h3 className="text-foreground mb-3 text-xl font-bold">No Public Data</h3>
                      <p className="text-muted break-words text-sm leading-relaxed">
                        Instead of uploading transcripts, universities upload deterministic
                        mathematically irreversible hashes. `Poseidon(Name, GPA, Matric_Number,
                        Blinding_Salt)`. The Stellar ledger only sees a randomized `bytes32` string.
                        No human or AI can ever reverse this string back to a name or GPA.
                      </p>
                    </div>
                    <div className="border-surface-border bg-surface w-full max-w-full overflow-hidden border p-6">
                      <div className="text-accent border-surface-border mb-3 inline-block border-b pb-2 font-mono text-xs">
                        02 // ZK PROOFS
                      </div>
                      <h3 className="text-foreground mb-3 text-xl font-bold">Boolean Truths</h3>
                      <p className="text-muted break-words text-sm leading-relaxed">
                        When an employer asks, "Did John get a 3.5 GPA?", Veridaq computes a Groth16
                        Zero-Knowledge Proof mathematically proving that the underlying data
                        producing the hash satisfies the condition `&gt= 3.5`. The network verifies
                        the math, returning exactly "TRUE" or "FALSE".
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full overflow-hidden border border-red-500/20 bg-red-500/5 p-6 md:p-8">
                  <h3 className="mb-2 text-lg font-bold text-red-400">
                    Absolute Architectural Directives
                  </h3>
                  <ul className="text-muted mt-4 space-y-4 text-sm">
                    <li className="flex items-start gap-4">
                      <span className="text-accent shrink-0 opacity-70">→</span>{" "}
                      <span className="w-full break-words">
                        <strong>Zero PII Exposure:</strong> No student name, grade, or matriculation
                        number ever hits the Stellar network.
                      </span>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="text-accent shrink-0 opacity-70">→</span>{" "}
                      <span className="w-full break-words">
                        <strong>Gasless Web2 UX:</strong> Using Soroban's built-in fee sponsorship,
                        institutions do not manage wallets or XLM. Gas is implicitly funded by the
                        platform admin.
                      </span>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="text-accent shrink-0 opacity-70">→</span>{" "}
                      <span className="w-full break-words">
                        <strong>Asynchronous Computations:</strong> Mass institution uploads are
                        processed via Redis/BullMQ to prevent Fastify event-loop blocking.
                      </span>
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* ARCHITECTURE FLOW TAB */}
            {activeTab === "architecture" && (
              <motion.div
                key="architecture"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full max-w-full space-y-12"
              >
                <header className="border-surface-border w-full border-b pb-8">
                  <div className="bg-accent/10 text-accent border-accent/20 mb-6 inline-flex items-center gap-2 rounded-sm border px-2 py-1 font-mono text-xs">
                    DOCUMENTATION // SECTION 02
                  </div>
                  <h1 className="text-foreground mb-6 break-words text-4xl font-black tracking-tight md:text-6xl">
                    System Architecture.
                  </h1>
                  <p className="text-muted text-lg font-light leading-relaxed">
                    Veridaq operates across three distinct domains: Web2 Next.js Enclaves, Fastify
                    API Gateways routing via Redis Queues, and the Stellar Soroban smart contracts
                    executing verification.
                  </p>
                </header>

                <h2 className="border-surface-border w-full border-b pb-4 text-2xl font-bold">
                  Direct Flow of Events
                </h2>

                {/* Event 1 */}
                <div className="border-surface-border bg-surface-card relative mb-8 w-full max-w-full overflow-hidden border p-6 md:p-8">
                  <div className="text-foreground/5 pointer-events-none absolute right-0 top-0 select-none p-4 text-6xl font-black">
                    1
                  </div>
                  <div className="mb-6 flex items-center gap-4">
                    <div className="border-accent bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded border font-bold">
                      1
                    </div>
                    <h3 className="break-words text-xl font-bold">Institution Registration</h3>
                  </div>
                  <p className="text-muted mb-6 break-words text-sm leading-relaxed">
                    Before any hashing occurs, the platform system administrator securely provisions
                    specific organizational instances, mapping Web2 relational identities directly
                    to Web3 mapping bytes.
                  </p>
                  <div className="bg-surface border-surface-border text-muted w-full max-w-full space-y-4 overflow-hidden border p-4 font-mono text-xs sm:p-5">
                    <div className="flex w-full flex-col gap-4 md:flex-row">
                      <div className="border-surface-border w-full flex-1 overflow-hidden border p-3">
                        <div className="text-accent mb-2">1. Web2 Onboarding</div>
                        Admin approves Registrar in{" "}
                        <span className="text-foreground break-words">Admin Portal</span>.{" "}
                        <br className="hidden md:block" />
                        Backend generates{" "}
                        <span className="text-foreground break-words">`institutionKey`</span>.
                      </div>
                      <div className="text-surface-border hidden items-center justify-center md:flex">
                        {"=====>"}
                      </div>
                      <div className="border-surface-border w-full flex-1 overflow-hidden border p-3">
                        <div className="text-accent mb-2">2. Fastify Ethers</div>
                        Backend calls{" "}
                        <span className="text-foreground break-words">
                          `registerInstitution()`
                        </span>{" "}
                        with mapped bytes.
                      </div>
                      <div className="text-surface-border hidden items-center justify-center md:flex">
                        {"=====>"}
                      </div>
                      <div className="border-surface-border w-full flex-1 overflow-hidden border border-blue-500/30 bg-blue-900/10 p-3">
                        <div className="text-accent mb-2">3. On-Chain Anchor</div>
                        Lands on Stellar via{" "}
                        <span className="text-foreground break-words">
                          InstitutionRegistry
                        </span>{" "}
                        smart contract.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="border-surface-border bg-surface-card relative mb-8 w-full max-w-full overflow-hidden border p-6 md:p-8">
                  <div className="text-foreground/5 pointer-events-none absolute right-0 top-0 select-none p-4 text-6xl font-black">
                    2
                  </div>
                  <div className="mb-6 flex items-center gap-4">
                    <div className="border-accent bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded border font-bold">
                      2
                    </div>
                    <h3 className="break-words text-xl font-bold">
                      Mass Credential Anchoring (Queue)
                    </h3>
                  </div>
                  <p className="text-muted mb-6 break-words text-sm leading-relaxed">
                    Registrars upload massive Excel lists arrays. Standard event loops fail here,
                    thus the payload bypasses the main Fastify loop into a Redis BullMQ thread.
                  </p>

                  <CodeBlock
                    filename="batch.processor.ts (Worker Thread)"
                    code={`export default async function processBatchJob(job: Job) {
  const { institutionId, records } = job.data;
  const commitments = [];
  const nullifiers = [];

  for (const record of records) {
    // 1. Generate randomized 32-byte collision salt locally
    const blindingFactor = generateSecureRandom();

    // 2. Hash explicit inputs into unreadable Circom format
    const commitment = await poseidon.hash([
      hashString(record.name),
      hashString(record.matricNumber),
      Math.floor(record.cgpa * 100),
      record.classification,
      blindingFactor
    ]);

    // 3. Nullifier strictly ties matric to institution
    const nullifier = await poseidon.hash([
      hashString(record.matricNumber), 
      instKey
    ]);

    commitments.push(commitment);
    nullifiers.push(nullifier);
  }

  // 4. Send bulk arrays off-chain via BigInt arrays
  await blockchainService.registerBatch(institutionId, commitments, nullifiers);
}`}
                  />

                  <div className="mt-4 flex w-full flex-col items-start gap-4 border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-200 sm:flex-row sm:items-center">
                    <Activity className="h-5 w-5 shrink-0" />
                    <span className="w-full break-words">
                      The transaction is signed using the{" "}
                      <strong>platform admin's Stellar keypair</strong>. Fastify calls the Soroban
                      contract directly, with gas implicitly funded by the admin account.
                    </span>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="border-surface-border bg-surface-card relative w-full max-w-full overflow-hidden border p-6 md:p-8">
                  <div className="text-foreground/5 pointer-events-none absolute right-0 top-0 select-none p-4 text-6xl font-black">
                    3
                  </div>
                  <div className="mb-6 flex items-center gap-4">
                    <div className="border-accent bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded border font-bold">
                      3
                    </div>
                    <h3 className="break-words text-xl font-bold">
                      SnarkJS Verification & Circuit Prove
                    </h3>
                  </div>
                  <p className="text-muted mb-6 break-words text-sm leading-relaxed">
                    Employers request constraints logically. The engine fetches the encrypted local
                    row, decrypts the `cgpa`, and spins up SnarkJS memory.
                  </p>

                  <div className="border-surface-border bg-surface mb-6 w-full overflow-hidden border p-4 md:p-6">
                    <div className="flex flex-col gap-3">
                      <div className="border-surface-border/50 flex flex-col justify-between gap-2 border-b p-2 font-mono text-[11px] sm:text-xs md:flex-row md:items-center">
                        <span className="text-accent shrink-0">A. Employer</span>
                        <span className="text-muted break-all md:break-normal">
                          POST /verify {`{ matric: "123", type: "CGPA", thresh: 3.0 }`}
                        </span>
                      </div>
                      <div className="border-surface-border/50 flex flex-col justify-between gap-2 border-b p-2 font-mono text-[11px] sm:text-xs md:flex-row md:items-center">
                        <span className="shrink-0 text-amber-500">B. Backend</span>
                        <span className="text-muted break-words">
                          Decrypts AES-256 DB row into RAM.
                        </span>
                      </div>
                      <div className="border-surface-border/50 flex flex-col justify-between gap-2 border-b p-2 font-mono text-[11px] sm:text-xs md:flex-row md:items-center">
                        <span className="shrink-0 text-purple-500">C. Prover (SnarkJS)</span>
                        <span className="text-muted break-words">
                          `fullProve(inputs)` generates proof `[a,b,c]`.
                        </span>
                      </div>
                      <div className="border-surface-border/50 flex flex-col justify-between gap-2 border-b p-2 font-mono text-[11px] sm:text-xs md:flex-row md:items-center">
                        <span className="shrink-0 text-red-500">D. Memory Wipe</span>
                        <span className="text-muted break-words">
                          `delete inputs;` (Clears Private RAM).
                        </span>
                      </div>
                      <div className="flex flex-col justify-between gap-2 p-2 font-mono text-[11px] sm:text-xs md:flex-row md:items-center">
                        <span className="text-accent shrink-0">E. Stellar Soroban</span>
                        <span className="text-muted break-all md:break-normal">
                          contract.verify_raw(publicSignals, proof)
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-muted break-words text-sm">
                    If the smart contract returns <strong className="text-green-400">TRUE</strong>,
                    the Employer UI flashes verified. At no point did the Employer API ever receive
                    the actual GPA or Name.
                  </p>
                </div>
              </motion.div>
            )}

            {/* CONTRACTS TAB */}
            {activeTab === "contracts" && (
              <motion.div
                key="contracts"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full max-w-full space-y-12"
              >
                <header className="border-surface-border border-b pb-8">
                  <div className="bg-accent/10 text-accent border-accent/20 mb-6 inline-flex items-center gap-2 rounded-sm border px-2 py-1 font-mono text-xs">
                    DOCUMENTATION // SECTION 03
                  </div>
                  <h1 className="text-foreground mb-6 break-words text-4xl font-black tracking-tight md:text-6xl">
                    Smart Contracts Ledger.
                  </h1>
                  <p className="text-muted text-lg font-light leading-relaxed">
                    Eight Soroban smart contracts written in Rust, compiled with the Stellar SDK and
                    deployed on Stellar testnet. Each contract handles a specific domain:
                    institution registry, credential management, revocation, and verification.
                  </p>
                </header>

                <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-12">
                  <div className="col-span-1 space-y-4 lg:col-span-5">
                    <div className="w-full">
                      <h3 className="bg-surface-card border-surface-border text-accent break-words border p-4 text-xl font-bold">
                        1. InstitutionRegistry
                      </h3>
                      <p className="text-muted border-surface-border bg-surface break-words border p-4 text-sm leading-relaxed">
                        Maps institution bytes32 IDs to names and admin wallet addresses. Emits
                        `InstitutionRegistered` events. Only the platform admin can register new
                        institutions on-chain.
                      </p>
                    </div>

                    <div className="mt-8 w-full">
                      <h3 className="bg-surface-card border-surface-border text-accent break-words border p-4 text-xl font-bold">
                        2. CredentialRegistry
                      </h3>
                      <p className="text-muted border-surface-border bg-surface break-words border p-4 text-sm leading-relaxed">
                        Stores (commitment, nullifier) pairs for each batch. Exposes functions for
                        batch registration, existence checks, and credential record retrieval. The
                        core data store of the system.
                      </p>
                    </div>

                    <div className="mt-8 w-full">
                      <h3 className="bg-surface-card border-surface-border text-accent break-words border p-4 text-xl font-bold">
                        3. ZKVerifier
                      </h3>
                      <p className="text-muted border-surface-border bg-surface break-words border p-4 text-sm leading-relaxed">
                        The auto-generated Groth16 verifier contract. Generated by SnarkJS during
                        the trusted setup ceremony. Accepts proof points and public signals, returns
                        a boolean verification result.
                      </p>
                    </div>
                  </div>

                  <div className="col-span-1 lg:col-span-7">
                    <div className="border-surface-border bg-surface-card h-full w-full max-w-full overflow-hidden border p-6 md:p-8">
                      <div className="border-surface-border mb-6 flex items-center gap-3 border-b pb-4">
                        <Lock className="text-accent h-6 w-6 shrink-0" />
                        <h3 className="break-words text-xl font-bold sm:text-2xl">
                          The Verifier Artifact
                        </h3>
                      </div>

                      <p className="text-muted mb-4 w-full break-words text-sm leading-relaxed md:text-base">
                        Where is the `verifyProof` smart contract code? Unlike traditional logic
                        contracts written by engineers, the verification logic mathematically
                        mapping polynomial arrays is auto-generated natively by SnarkJS directly
                        from the compiled Circuit configurations.
                      </p>

                      <div className="bg-void border-accent/20 hide-scrollbar mb-6 w-full overflow-x-auto rounded border p-4 font-mono text-xs leading-relaxed md:p-5 md:text-sm">
                        <span className="text-muted-subtle">{"// When executing:"}</span>
                        <br />
                        <span className="text-foreground whitespace-nowrap font-bold">
                          $ pnpm circuit:setup
                        </span>
                        <br />
                        <br />
                        <span className="text-muted-subtle">{"// The engine generates:"}</span>
                        <br />
                        <span className="text-accent whitespace-nowrap">
                          target/veridaq_credential_verifier.wasm
                        </span>
                      </div>

                      <p className="text-muted mb-6 w-full break-words text-sm leading-relaxed">
                        The generated verifier performs BN254 pairing checks to validate Groth16
                        proofs. It is deployed as a Soroban contract on Stellar testnet and called
                        during each verification request.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ZKP TAB */}
            {activeTab === "zkp" && (
              <motion.div
                key="zkp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full max-w-full space-y-12"
              >
                <header className="border-surface-border border-b pb-8">
                  <div className="bg-accent/10 text-accent border-accent/20 mb-6 inline-flex items-center gap-2 rounded-sm border px-2 py-1 font-mono text-xs">
                    DOCUMENTATION // SECTION 04
                  </div>
                  <h1 className="text-foreground mb-6 break-words text-4xl font-black tracking-tight md:text-6xl">
                    Zero Knowledge Circuit.
                  </h1>
                  <p className="text-muted text-lg font-light leading-relaxed">
                    Written purely in Circom `v2.0.8`. The protocol mathematically tests isolated
                    boundaries of datasets against physical chain mappings masking exact identities
                    fully.
                  </p>
                </header>

                <div className="mb-8 grid w-full max-w-full gap-8 md:grid-cols-2">
                  <div className="bg-surface-card border-surface-border w-full max-w-full overflow-hidden border">
                    <div className="border-surface-border bg-surface border-b p-4">
                      <h3 className="text-accent break-words font-bold">Secret Memory Inputs</h3>
                      <p className="text-muted-subtle mt-1 break-words text-xs">
                        Variables provided entirely by local backend memory states. Destroyed
                        instantly.
                      </p>
                    </div>
                    <ul className="text-muted w-full max-w-full space-y-4 overflow-hidden p-6 font-mono text-[11px] sm:text-sm">
                      <li className="border-surface-border/50 grid grid-cols-2 gap-2 break-words border-b pb-2">
                        <span className="break-all">nameHash</span>{" "}
                        <span className="text-muted-subtle">Identifier</span>
                      </li>
                      <li className="border-surface-border/50 grid grid-cols-2 gap-2 break-words border-b pb-2">
                        <span className="break-all">matricHash</span>{" "}
                        <span className="text-muted-subtle">Collision Matrix</span>
                      </li>
                      <li className="border-surface-border/50 grid grid-cols-2 gap-2 break-words border-b pb-2">
                        <span className="break-all">cgpa</span>{" "}
                        <span className="text-muted-subtle">(*100 integer)</span>
                      </li>
                      <li className="border-surface-border/50 grid grid-cols-2 gap-2 break-words border-b pb-2">
                        <span className="break-all">classification</span>{" "}
                        <span className="text-muted-subtle">(Int 1-4)</span>
                      </li>
                      <li className="grid grid-cols-2 gap-2 break-words">
                        <span className="break-all">blindingFactor</span>{" "}
                        <span className="text-accent">Entropy!</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-surface-card border-surface-border w-full max-w-full overflow-hidden border">
                    <div className="border-surface-border bg-surface border-b p-4">
                      <h3 className="text-foreground break-words font-bold">
                        Public Chain Parameters
                      </h3>
                      <p className="text-muted-subtle mt-1 break-words text-xs">
                        Variables inherently visible inside public `UserOperations` directly.
                      </p>
                    </div>
                    <ul className="text-foreground w-full space-y-4 overflow-hidden p-6 font-mono text-[11px] sm:text-sm">
                      <li className="border-surface-border/50 grid grid-cols-2 gap-2 break-words border-b pb-2">
                        <span className="text-accent break-all">commitment</span>{" "}
                        <span className="text-muted-subtle">Matched state.</span>
                      </li>
                      <li className="border-surface-border/50 grid grid-cols-2 gap-2 break-words border-b pb-2">
                        <span className="text-accent break-all">nullifier</span>{" "}
                        <span className="text-muted-subtle">Identity block.</span>
                      </li>
                      <li className="border-surface-border/50 grid grid-cols-2 gap-2 break-words border-b pb-2">
                        <span className="break-all">claimType</span>{" "}
                        <span className="text-muted-subtle">Logic rule.</span>
                      </li>
                      <li className="grid grid-cols-2 gap-2 break-words">
                        <span className="break-all">threshold</span>{" "}
                        <span className="text-muted-subtle">Numeric bound.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-void border-surface-border w-full overflow-hidden border p-6 md:p-8">
                  <h3 className="mb-6 flex items-center gap-3 break-words text-xl font-bold sm:text-2xl">
                    <Network className="text-accent shrink-0" /> Circuit Assertion Models
                  </h3>

                  <div className="w-full overflow-hidden">
                    <CodeBlock
                      filename="credential.circom"
                      code={`// Security Check 1: Generating local hash tree to prove custody
component poseidonCommitment = Poseidon(5);
poseidonCommitment.inputs[0] <== nameHash;
poseidonCommitment.inputs[1] <== matricHash;
poseidonCommitment.inputs[2] <== cgpa;
poseidonCommitment.inputs[3] <== classification;
poseidonCommitment.inputs[4] <== blindingFactor;

// If variables don't strictly mirror the public commitment, it explodes.
poseidonCommitment.out === commitment;

// Verification Logic Path 5: CGPA threshold gating
component cgpaCheck = GreaterEqThan(16); 
cgpaCheck.in[0] <== cgpa;
cgpaCheck.in[1] <== threshold;

// If Claim Type equals 5, force truth state
(claimType - 5) * (1 - cgpaCheck.out) === 0;`}
                      language="circom"
                      noBg
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* BACKEND TAB */}
            {activeTab === "backend" && (
              <motion.div
                key="backend"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full max-w-full space-y-12"
              >
                <header className="border-surface-border border-b pb-8">
                  <div className="bg-accent/10 text-accent border-accent/20 mb-6 inline-flex items-center gap-2 rounded-sm border px-2 py-1 font-mono text-xs">
                    DOCUMENTATION // SECTION 05
                  </div>
                  <h1 className="text-foreground mb-6 break-words text-4xl font-black tracking-tight md:text-6xl">
                    API Backend Subnets.
                  </h1>
                  <p className="text-muted text-lg font-light leading-relaxed">
                    Veridaq backend logic is orchestrated via native Fastify 5 instances routing
                    strictly typed definitions checking parameters completely via Zod before
                    yielding processing commands.
                  </p>
                </header>

                <div className="grid w-full max-w-full gap-6 overflow-hidden md:grid-cols-3">
                  <div className="w-full space-y-6 md:col-span-1">
                    <div className="border-surface-border bg-surface-card border-l-accent w-full break-words border border-l-4 p-6">
                      <h3 className="mb-2 font-bold">Fastify Routes</h3>
                      <p className="text-muted text-sm">
                        Endpoints evaluate native JWT tokens via strictly executed mapping inside
                        HTTPOnly cookies, inherently blocking physical XSS payloads.
                      </p>
                    </div>
                    <div className="border-surface-border bg-surface-card w-full break-words border border-l-4 border-l-blue-500 p-6">
                      <h3 className="mb-2 font-bold">Prisma 6 Config</h3>
                      <p className="text-muted text-sm">
                        Physical operations utilizing Prisma `$transaction[]` matrices lock partial
                        failures from creating globally orphan database dumps.
                      </p>
                    </div>
                    <div className="border-surface-border bg-surface-card w-full break-words border border-l-4 border-l-green-500 p-6">
                      <h3 className="mb-2 font-bold">AES-256 Paths</h3>
                      <p className="text-muted text-sm">
                        Rows are encrypted inside DB using `AES-256-GCM` mapped exclusively via the
                        `.env`. Compromising the database yields dead blocks natively.
                      </p>
                    </div>
                  </div>

                  <div className="w-full max-w-full space-y-6 overflow-hidden md:col-span-2">
                    <h3 className="flex items-center gap-3 break-words text-2xl font-bold">
                      <Terminal className="text-accent shrink-0" /> Server Pipeline
                    </h3>
                    <CodeBlock
                      filename="app.ts (Simplified Flow)"
                      code={`import fastify from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

const app = fastify().withTypeProvider<ZodTypeProvider>();

// Guardian Middlewares locally stopping unauthorized traffic
app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
});

// Massive BullMQ Redis processing worker hooks
app.register(batchQueuePlugin, { prefix: '/queue' });
app.register(verificationRoutes, { prefix: '/v1/verify' });

await prisma.$connect();
await app.listen({ port: 4000 });`}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Pagination Component - Renders directly inside main but outside the AnimatePresence tabs so it stays visible */}
            <div
              className="border-surface-border mt-16 flex w-full flex-col items-center justify-between gap-4 border-t pb-12 pt-8 sm:flex-row"
              key="pagination-controls"
            >
              {prevTab ? (
                <button
                  onClick={() => {
                    setActiveTab(prevTab?.id ?? "")
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }}
                  className="border-surface-border bg-surface-card hover:border-accent hover:bg-accent/5 group flex w-full min-w-0 flex-col border p-6 text-left transition-all sm:w-1/2"
                >
                  <span className="text-muted-subtle mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                    <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />{" "}
                    Previous Chapter
                  </span>
                  <span className="text-foreground w-full truncate text-lg font-bold">
                    {prevTab?.label}
                  </span>
                  <span className="text-muted mt-1 w-full truncate text-sm">{prevTab?.desc}</span>
                </button>
              ) : (
                <div className="hidden sm:block sm:w-1/2" />
              )}

              {nextTab ? (
                <button
                  onClick={() => {
                    setActiveTab(nextTab?.id ?? "")
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }}
                  className="border-surface-border bg-surface-card hover:border-accent hover:bg-accent/5 group flex w-full min-w-0 flex-col items-end border p-6 text-right transition-all sm:w-1/2"
                >
                  <span className="text-muted-subtle mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                    Next Chapter{" "}
                    <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="text-foreground w-full truncate text-lg font-bold">
                    {nextTab?.label}
                  </span>
                  <span className="text-muted mt-1 w-full truncate text-sm">{nextTab?.desc}</span>
                </button>
              ) : (
                <div className="hidden sm:block sm:w-1/2" />
              )}
            </div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
