"use client"
import Link from "next/link"
import React, { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, Layers, FileCode2, Network, ArrowLeft, Terminal, Database, Lock, X, ChevronRight, Activity, Workflow, Code } from "lucide-react"
import { AppHeader } from "@/components/ui/app-header"
import { ParallaxBg } from "@/components/parallax/parallax-layer"
import { FloatingShapes } from "@/components/parallax/floating-shapes"

export default function DocumentationPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [activeTab, setActiveTab] = useState("overview")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const tabs = [
    { id: "overview", label: "Executive Overview", icon: <ShieldCheck className="w-4 h-4" />, desc: "Protocol manifest & cryptographic principles" },
    { id: "architecture", label: "Architecture & Flow", icon: <Workflow className="w-4 h-4" />, desc: "End-to-end data movement & Event sequences" },
    { id: "contracts", label: "Smart Contracts", icon: <FileCode2 className="w-4 h-4" />, desc: "L2 Ledger, Account Abstraction & Solidity" },
    { id: "zkp", label: "Zero-Knowledge Circom", icon: <Layers className="w-4 h-4" />, desc: "Groth16 SnarkJS logic & Polynomial constraints" },
    { id: "backend", label: "Fastify API & DB", icon: <Database className="w-4 h-4" />, desc: "Redis queues, Prisma schemas & Node clusters" }
  ]

  const activeTabIndex = tabs.findIndex((t) => t.id === activeTab)
  const prevTab = activeTabIndex > 0 ? tabs[activeTabIndex - 1] : null
  const nextTab = activeTabIndex < tabs.length - 1 ? tabs[activeTabIndex + 1] : null

  const CodeBlock = ({ code, language = "typescript", filename = "", noBg = false }: { code: string; language?: string; filename?: string; noBg?: boolean }) => (
    <div className={`relative w-full max-w-[100vw] sm:max-w-full overflow-hidden rounded-md my-6 border border-surface-border ${noBg ? "" : "bg-surface"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-surface-card border-b border-surface-border gap-2">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-accent/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
          </div>
          {filename && <span className="text-xs font-mono text-muted break-words line-clamp-1">{filename}</span>}
        </div>
        <span className="text-[10px] sm:text-xs font-mono text-muted-subtle">{language}</span>
      </div>
      <div className="overflow-x-auto max-w-full hide-scrollbar w-full">
        <pre className="p-4 inline-block min-w-full text-xs md:text-sm font-mono text-muted leading-relaxed">
          {code}
        </pre>
      </div>
    </div>
  )

  return (
    <div ref={containerRef} className="flex-1 w-full bg-void text-foreground flex flex-col font-sans selection:bg-accent/20 selection:text-inherit relative">

      <ParallaxBg opacity={0.25} />
      <FloatingShapes count={10} />
      <AppHeader />

      {/* Back link */}
      <div className="container mx-auto px-4 md:px-6 pt-20">
        <div className="flex items-center gap-2 py-3">
          <Link href="/" className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group text-sm font-medium">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
          <span className="text-muted-subtle text-xs">/</span>
          <span className="text-accent text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Code className="w-4 h-4" /> Protocol Documentation
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
            className="fixed inset-0 z-[100] bg-void border-l border-surface-border flex flex-col md:hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-surface-border bg-surface-card">
              <span className="font-bold tracking-widest text-xs text-accent uppercase">Documentation Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-muted hover:text-foreground bg-surface rounded-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-xs font-bold text-muted-subtle uppercase tracking-widest mb-4 px-2 mt-4">Core Chapters</div>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); window.scrollTo(0, 0) } }
                  className={`w-full flex items-start gap-4 p-4 border transition-all text-left ${activeTab === tab.id
                      ? "bg-accent/10 border-accent text-foreground"
                      : "border-surface-border bg-surface-card text-muted hover:bg-surface"}`}
                >
                  <div className={`mt-0.5 ${activeTab === tab.id ? "text-accent" : "text-muted-subtle"}`}>{tab.icon}</div>
                  <div className="min-w-0">
                    <div className={`font-bold text-sm ${activeTab === tab.id ? "text-accent" : "text-foreground"}`}>{tab.label}</div>
                    <div className="text-xs text-muted-subtle mt-1 break-words leading-relaxed">{tab.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container w-full max-w-full mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-24 flex flex-col md:flex-row gap-8 lg:gap-16">

        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-72 shrink-0 relative">
          <div className="sticky top-32 space-y-1">
            <div className="text-[10px] font-bold text-muted-subtle uppercase tracking-widest mb-6 px-3">Protocol Chapters</div>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); window.scrollTo(0, 0) } }
                className={`w-full flex flex-col px-4 py-3 border-l-2 transition-all text-left group ${activeTab === tab.id
                    ? "bg-accent/10 border-accent"
                    : "border-transparent text-muted hover:bg-surface-card"}`}
              >
                <div className="flex items-center gap-3 w-full">
                  <span className={`${activeTab === tab.id ? "text-accent" : "text-muted-subtle"}`}>{tab.icon}</span>
                  <span className={`font-bold text-sm ${activeTab === tab.id ? "text-foreground" : ""}`}>{tab.label}</span>
                </div>
                <span className="text-[11px] text-muted-subtle mt-1.5 pl-7 leading-relaxed">{tab.desc}</span>
              </button>
            ))}

            <div className="mt-12 mb-4 px-4 text-[10px] font-bold text-muted-subtle uppercase tracking-widest">Network Links</div>
            <Link href="/blueprint" className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-accent hover:text-foreground transition-colors">
              <Layers className="w-4 h-4" /> Protocol Blueprint
            </Link>
            <Link href="#" className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
              <Terminal className="w-4 h-4" /> Open Source Codebase
            </Link>
            <Link href="#" className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
              <Database className="w-4 h-4" /> Base Subnet Explorer
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-full md:max-w-5xl relative min-w-0">
          <AnimatePresence mode="wait">

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-12 w-full">
              <header className="border-b border-surface-border pb-8 w-full">
                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-sm bg-accent/10 text-accent text-xs font-mono mb-6 border border-accent/20">DOCUMENTATION // SECTION 01</div>
                <h1 className="text-4xl md:text-6xl font-black mb-6 text-foreground tracking-tight break-words">Executive Overview.</h1>
                <p className="text-xl md:text-2xl text-muted font-light leading-relaxed">
                  Veridaq completely decentralizes the academic verification layer, allowing employers to verify student claims computationally without requiring institutions to expose private academic databases.
                </p>
              </header>

              <div className="space-y-6 w-full">
                <h2 className="text-2xl font-bold flex items-center gap-3"><ShieldCheck className="text-accent shrink-0" /> The Core Problem</h2>
                <div className="bg-surface-card border border-surface-border p-6 md:p-8 space-y-4 w-full">
                  <p className="text-muted leading-relaxed break-words">
                    Traditional academic verification requires universities to expose massive student databases via APIs to third-party employers, or forces students into manual "transcript request" portals which take weeks to fulfill. Once data is handed to an employer, the university permanently loses custody and control of that student's PII (Personally Identifiable Information).
                  </p>
                  <p className="text-muted leading-relaxed break-words">
                    Blockchain solutions attempt to solve this by minting "Soulbound NFTs" or JSON verifiable credentials. However, putting raw student names, grades, and GPAs on a public blockchain is a catastrophic privacy violation. Even encrypting them means trusting the future resilience of the encryption algorithm.
                  </p>
                </div>
              </div>

              <div className="space-y-6 w-full">
                <h2 className="text-2xl font-bold flex items-center gap-3"><Layers className="text-accent shrink-0" /> The Veridaq Solution</h2>
                <div className="grid md:grid-cols-2 gap-6 w-full max-w-full">
                  <div className="p-6 border border-surface-border bg-surface w-full max-w-full overflow-hidden">
                    <div className="text-accent font-mono text-xs mb-3 border-b border-surface-border pb-2 inline-block">01 // HASH COMMITMENTS</div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">No Public Data</h3>
                    <p className="text-muted text-sm leading-relaxed break-words">
                      Instead of uploading transcripts, universities upload deterministic mathematically irreversible hashes. `Poseidon(Name, GPA, Matric_Number, Blinding_Salt)`. The L2 Ledger only sees a randomized `bytes32` string. No human or AI can ever reverse this string back to a name or GPA.
                    </p>
                  </div>
                  <div className="p-6 border border-surface-border bg-surface w-full max-w-full overflow-hidden">
                    <div className="text-accent font-mono text-xs mb-3 border-b border-surface-border pb-2 inline-block">02 // ZK PROOFS</div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">Boolean Truths</h3>
                    <p className="text-muted text-sm leading-relaxed break-words">
                      When an employer asks, "Did John get a 3.5 GPA?", Veridaq computes a Groth16 Zero-Knowledge Proof mathematically proving that the underlying data producing the hash satisfies the condition `&gt= 3.5`. The network verifies the math, returning exactly "TRUE" or "FALSE".
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-red-500/20 bg-red-500/5 p-6 md:p-8 w-full overflow-hidden">
                <h3 className="text-lg font-bold text-red-400 mb-2">Absolute Architectural Directives</h3>
                <ul className="space-y-4 mt-4 text-sm text-muted">
                  <li className="flex gap-4 items-start"><span className="text-accent shrink-0 opacity-70">→</span> <span className="break-words w-full"><strong>Zero PII Exposure:</strong> No student name, grade, or matriculation number ever hits the Base public mempool.</span></li>
                  <li className="flex gap-4 items-start"><span className="text-accent shrink-0 opacity-70">→</span> <span className="break-words w-full"><strong>Gasless Web2 UX:</strong> Using Account Abstraction (ERC-4337), institutions do not manage wallets or ETH. Gas is implicitly funded by the PaymasterVault.</span></li>
                  <li className="flex gap-4 items-start"><span className="text-accent shrink-0 opacity-70">→</span> <span className="break-words w-full"><strong>Asynchronous Computations:</strong> Mass institution uploads are processed via Redis/BullMQ to prevent Fastify event-loop blocking.</span></li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* ARCHITECTURE FLOW TAB */}
          {activeTab === "architecture" && (
            <motion.div key="architecture" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-12 w-full max-w-full">
              <header className="border-b border-surface-border pb-8 w-full">
                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-sm bg-accent/10 text-accent text-xs font-mono mb-6 border border-accent/20">DOCUMENTATION // SECTION 02</div>
                <h1 className="text-4xl md:text-6xl font-black mb-6 text-foreground tracking-tight break-words">System Architecture.</h1>
                <p className="text-lg text-muted font-light leading-relaxed">
                  Veridaq operates across three distinct domains: Web2 Next.js Enclaves, Fastify API Gateways routing via Redis Queues, and the Base Layer-2 EVM Contracts executing verification.
                </p>
              </header>

              <h2 className="text-2xl font-bold border-b border-surface-border pb-4 w-full">Direct Flow of Events</h2>

              {/* Event 1 */}
              <div className="relative border border-surface-border bg-surface-card p-6 md:p-8 mb-8 overflow-hidden w-full max-w-full">
                <div className="absolute top-0 right-0 p-4 font-black text-6xl text-foreground/5 pointer-events-none select-none">1</div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded border border-accent bg-accent/10 flex items-center justify-center text-accent font-bold shrink-0">1</div>
                  <h3 className="text-xl font-bold break-words">Institution Registration</h3>
                </div>
                <p className="text-sm text-muted leading-relaxed mb-6 break-words">
                  Before any hashing occurs, the platform system administrator securely provisions specific organizational instances, mapping Web2 relational identities directly to Web3 mapping bytes.
                </p>
                <div className="bg-surface p-4 sm:p-5 border border-surface-border font-mono text-xs text-muted w-full max-w-full overflow-hidden space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 w-full">
                    <div className="flex-1 w-full border border-surface-border p-3 overflow-hidden">
                      <div className="text-accent mb-2">1. Web2 Onboarding</div>
                      Admin approves Registrar in <span className="text-foreground break-words">Admin Portal</span>. <br className="hidden md:block" />Backend generates <span className="text-foreground break-words">`institutionKey`</span>.
                    </div>
                    <div className="hidden md:flex items-center justify-center text-surface-border">{"=====>"}</div>
                    <div className="flex-1 w-full border border-surface-border p-3 overflow-hidden">
                      <div className="text-accent mb-2">2. Fastify Ethers</div>
                      Backend calls <span className="text-foreground break-words">`registerInstitution()`</span> with mapped bytes.
                    </div>
                    <div className="hidden md:flex items-center justify-center text-surface-border">{"=====>"}</div>
                    <div className="flex-1 w-full border border-surface-border bg-blue-900/10 border-blue-500/30 p-3 overflow-hidden">
                      <div className="text-accent mb-2">3. L2 On-Chain Anchor</div>
                      Lands on Base via <span className="text-foreground break-words">InstitutionRegistry.sol</span> logic.
                    </div>
                  </div>
                </div>
              </div>

              {/* Event 2 */}
              <div className="relative border border-surface-border bg-surface-card p-6 md:p-8 mb-8 overflow-hidden w-full max-w-full">
                <div className="absolute top-0 right-0 p-4 font-black text-6xl text-foreground/5 pointer-events-none select-none">2</div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded border border-accent bg-accent/10 flex items-center justify-center text-accent font-bold shrink-0">2</div>
                  <h3 className="text-xl font-bold break-words">Mass Credential Anchoring (Queue)</h3>
                </div>
                <p className="text-sm text-muted leading-relaxed mb-6 break-words">
                  Registrars upload massive Excel lists arrays. Standard event loops fail here, thus the payload bypasses the main Fastify loop into a Redis BullMQ thread.
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
}`} />

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-sm mt-4 w-full">
                  <Activity className="w-5 h-5 shrink-0" />
                  <span className="break-words w-full">Wrapped via <strong>ERC-4337 Account Abstraction</strong>. Fastify calls `PaymasterVault.sol` which implicitly provides ETH for gas padding, returning a successful `UserOperation`.</span>
                </div>
              </div>

              {/* Event 3 */}
              <div className="relative border border-surface-border bg-surface-card p-6 md:p-8 overflow-hidden w-full max-w-full">
                <div className="absolute top-0 right-0 p-4 font-black text-6xl text-foreground/5 pointer-events-none select-none">3</div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded border border-accent bg-accent/10 flex items-center justify-center text-accent font-bold shrink-0">3</div>
                  <h3 className="text-xl font-bold break-words">SnarkJS Verification & Circuit Prove</h3>
                </div>
                <p className="text-sm text-muted leading-relaxed mb-6 break-words">
                  Employers request constraints logically. The engine fetches the encrypted local row, decrypts the `cgpa`, and spins up SnarkJS memory.
                </p>

                <div className="border border-surface-border bg-surface p-4 md:p-6 mb-6 w-full overflow-hidden">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between text-[11px] sm:text-xs font-mono p-2 border-b border-surface-border/50 gap-2">
                      <span className="text-accent shrink-0">A. Employer</span>
                      <span className="text-muted break-all md:break-normal">POST /verify {`{ matric: "123", type: "CGPA", thresh: 3.0 }`}</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between text-[11px] sm:text-xs font-mono p-2 border-b border-surface-border/50 gap-2">
                      <span className="text-amber-500 shrink-0">B. Backend</span>
                      <span className="text-muted break-words">Decrypts AES-256 DB row into RAM.</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between text-[11px] sm:text-xs font-mono p-2 border-b border-surface-border/50 gap-2">
                      <span className="text-purple-500 shrink-0">C. Prover (SnarkJS)</span>
                      <span className="text-muted break-words">`fullProve(inputs)` generates proof `[a,b,c]`.</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between text-[11px] sm:text-xs font-mono p-2 border-b border-surface-border/50 gap-2">
                      <span className="text-red-500 shrink-0">D. Memory Wipe</span>
                      <span className="text-muted break-words">`delete inputs;` (Clears Private RAM).</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between text-[11px] sm:text-xs font-mono p-2 gap-2">
                      <span className="text-accent shrink-0">E. Base L2 EVM</span>
                      <span className="text-muted break-all md:break-normal">getContract("ZKVerifier").verifyProof(a,b,c)</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted break-words">
                  If the smart contract returns <strong className="text-green-400">TRUE</strong>, the Employer UI flashes verified. At no point did the Employer API ever receive the actual GPA or Name.
                </p>
              </div>
            </motion.div>
          )}

          {/* CONTRACTS TAB */}
          {activeTab === "contracts" && (
            <motion.div key="contracts" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-12 w-full max-w-full">
              <header className="border-b border-surface-border pb-8">
                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-sm bg-accent/10 text-accent text-xs font-mono mb-6 border border-accent/20">DOCUMENTATION // SECTION 03</div>
                <h1 className="text-4xl md:text-6xl font-black mb-6 text-foreground tracking-tight break-words">Smart Contracts Ledger.</h1>
                <p className="text-lg text-muted font-light leading-relaxed">
                  Five active Solidity state contracts natively compiled using Foundry (`pragma solidity 0.8.28`). Highly optimized. Reverts implemented strictly as Custom Errors.
                </p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">

                <div className="col-span-1 lg:col-span-5 space-y-4">
                  <div className="w-full">
                    <h3 className="text-xl font-bold bg-surface-card p-4 border border-surface-border text-accent break-words">1. PaymasterVault.sol</h3>
                    <p className="text-sm text-muted leading-relaxed p-4 border border-surface-border bg-surface break-words">
                      Veridaq inherently utilizes ERC-4337 (Account Abstraction) for gas operations. When an institution requests a credential batch anchor, `PaymasterVault` intercepts the execution parameters via `validatePaymasterUserOp()`.
                    </p>
                  </div>

                  <div className="w-full mt-8">
                    <h3 className="text-xl font-bold bg-surface-card p-4 border border-surface-border text-accent break-words">2. CredentialRegistry.sol</h3>
                    <p className="text-sm text-muted leading-relaxed p-4 border border-surface-border bg-surface break-words">
                      The physical database equivalent on the EVM. It receives mass inputs mapping parallel arrays of `commitments[]` and `nullifiers[]`. Exposes native view function `isCommitmentValid(uint256)`.
                    </p>
                  </div>

                  <div className="w-full mt-8">
                    <h3 className="text-xl font-bold bg-surface-card p-4 border border-surface-border text-accent break-words">3. InstitutionRegistry.sol</h3>
                    <p className="text-sm text-muted leading-relaxed p-4 border border-surface-border bg-surface break-words">
                      The identity authority. Maps physical `bytes32` identifier constants to deployed external wallets via mappings ensuring rogue addresses cannot arbitrarily register payloads.
                    </p>
                  </div>
                </div>

                <div className="col-span-1 lg:col-span-7">
                  <div className="p-6 md:p-8 border border-surface-border bg-surface-card h-full w-full max-w-full overflow-hidden">
                    <div className="flex items-center gap-3 mb-6 border-b border-surface-border pb-4">
                      <Lock className="w-6 h-6 text-accent shrink-0" />
                      <h3 className="text-xl sm:text-2xl font-bold break-words">The Verifier Artifact</h3>
                    </div>

                    <p className="mb-4 text-muted leading-relaxed text-sm md:text-base break-words w-full">
                      Where is the `verifyProof` smart contract code? Unlike traditional logic contracts written by engineers, the verification logic mathematically mapping polynomial arrays is auto-generated natively by SnarkJS directly from the compiled Circuit configurations.
                    </p>

                    <div className="bg-void border border-accent/20 p-4 md:p-5 rounded font-mono text-xs md:text-sm leading-relaxed mb-6 w-full overflow-x-auto hide-scrollbar">
                      <span className="text-muted-subtle">{"// When executing:"}</span><br />
                      <span className="text-foreground font-bold whitespace-nowrap">$ pnpm circuit:setup</span><br /><br />
                      <span className="text-muted-subtle">{"// The engine generates:"}</span><br />
                      <span className="text-accent whitespace-nowrap">target/veridaq_credential_verifier.wasm</span>
                    </div>

                    <p className="text-sm text-muted leading-relaxed mb-6 break-words w-full">
                      This specific contract inherently houses highly optimized elliptic curve pair matching mappings logic targeting EVM mathematically precompiled opcodes `<span className="text-foreground font-mono break-words">0x06, 0x07, 0x08</span>`.
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* ZKP TAB */}
          {activeTab === "zkp" && (
            <motion.div key="zkp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-12 w-full max-w-full">
              <header className="border-b border-surface-border pb-8">
                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-sm bg-accent/10 text-accent text-xs font-mono mb-6 border border-accent/20">DOCUMENTATION // SECTION 04</div>
                <h1 className="text-4xl md:text-6xl font-black mb-6 text-foreground tracking-tight break-words">Zero Knowledge Circuit.</h1>
                <p className="text-lg text-muted font-light leading-relaxed">
                  Written purely in Circom `v2.0.8`. The protocol mathematically tests isolated boundaries of datasets against physical chain mappings masking exact identities fully.
                </p>
              </header>

              <div className="grid md:grid-cols-2 gap-8 mb-8 w-full max-w-full">
                <div className="bg-surface-card border border-surface-border overflow-hidden w-full max-w-full">
                  <div className="p-4 border-b border-surface-border bg-surface">
                    <h3 className="font-bold text-accent break-words">Secret Memory Inputs</h3>
                    <p className="text-xs text-muted-subtle mt-1 break-words">Variables provided entirely by local backend memory states. Destroyed instantly.</p>
                  </div>
                  <ul className="p-6 space-y-4 text-[11px] sm:text-sm font-mono text-muted w-full max-w-full overflow-hidden">
                    <li className="grid grid-cols-2 border-b border-surface-border/50 pb-2 break-words gap-2"><span className="break-all">nameHash</span> <span className="text-muted-subtle">Identifier</span></li>
                    <li className="grid grid-cols-2 border-b border-surface-border/50 pb-2 break-words gap-2"><span className="break-all">matricHash</span> <span className="text-muted-subtle">Collision Matrix</span></li>
                    <li className="grid grid-cols-2 border-b border-surface-border/50 pb-2 break-words gap-2"><span className="break-all">cgpa</span> <span className="text-muted-subtle">(*100 integer)</span></li>
                    <li className="grid grid-cols-2 border-b border-surface-border/50 pb-2 break-words gap-2"><span className="break-all">classification</span> <span className="text-muted-subtle">(Int 1-4)</span></li>
                    <li className="grid grid-cols-2 break-words gap-2"><span className="break-all">blindingFactor</span> <span className="text-accent">Entropy!</span></li>
                  </ul>
                </div>

                <div className="bg-surface-card border border-surface-border overflow-hidden w-full max-w-full">
                  <div className="p-4 border-b border-surface-border bg-surface">
                    <h3 className="font-bold text-foreground break-words">Public Chain Parameters</h3>
                    <p className="text-xs text-muted-subtle mt-1 break-words">Variables inherently visible inside public `UserOperations` directly.</p>
                  </div>
                  <ul className="p-6 space-y-4 text-[11px] sm:text-sm font-mono text-foreground w-full overflow-hidden">
                    <li className="grid grid-cols-2 border-b border-surface-border/50 pb-2 break-words gap-2"><span className="text-accent break-all">commitment</span> <span className="text-muted-subtle">Matched state.</span></li>
                    <li className="grid grid-cols-2 border-b border-surface-border/50 pb-2 break-words gap-2"><span className="text-accent break-all">nullifier</span> <span className="text-muted-subtle">Identity block.</span></li>
                    <li className="grid grid-cols-2 border-b border-surface-border/50 pb-2 break-words gap-2"><span className="break-all">claimType</span> <span className="text-muted-subtle">Logic rule.</span></li>
                    <li className="grid grid-cols-2 break-words gap-2"><span className="break-all">threshold</span> <span className="text-muted-subtle">Numeric bound.</span></li>
                  </ul>
                </div>
              </div>

              <div className="bg-void border border-surface-border p-6 md:p-8 w-full overflow-hidden">
                <h3 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3 break-words">
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
                    noBg />
                </div>
              </div>
            </motion.div>
          )}

          {/* BACKEND TAB */}
          {activeTab === "backend" && (
            <motion.div key="backend" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-12 w-full max-w-full">
              <header className="border-b border-surface-border pb-8">
                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-sm bg-accent/10 text-accent text-xs font-mono mb-6 border border-accent/20">DOCUMENTATION // SECTION 05</div>
                <h1 className="text-4xl md:text-6xl font-black mb-6 text-foreground tracking-tight break-words">API Backend Subnets.</h1>
                <p className="text-lg text-muted font-light leading-relaxed">
                  Veridaq backend logic is orchestrated via native Fastify 5 instances routing strictly typed definitions checking parameters completely via Zod before yielding processing commands.
                </p>
              </header>

              <div className="grid md:grid-cols-3 gap-6 w-full max-w-full overflow-hidden">
                <div className="md:col-span-1 space-y-6 w-full">
                  <div className="border border-surface-border bg-surface-card p-6 border-l-4 border-l-accent w-full break-words">
                    <h3 className="font-bold mb-2">Fastify Routes</h3>
                    <p className="text-muted text-sm">Endpoints evaluate native JWT tokens via strictly executed mapping inside HTTPOnly cookies, inherently blocking physical XSS payloads.</p>
                  </div>
                  <div className="border border-surface-border bg-surface-card p-6 border-l-4 border-l-blue-500 w-full break-words">
                    <h3 className="font-bold mb-2">Prisma 6 Config</h3>
                    <p className="text-muted text-sm">Physical operations utilizing Prisma `$transaction[]` matrices lock partial failures from creating globally orphan database dumps.</p>
                  </div>
                  <div className="border border-surface-border bg-surface-card p-6 border-l-4 border-l-green-500 w-full break-words">
                    <h3 className="font-bold mb-2">AES-256 Paths</h3>
                    <p className="text-muted text-sm">Rows are encrypted inside DB using `AES-256-GCM` mapped exclusively via the `.env`. Compromising the database yields dead blocks natively.</p>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-6 w-full max-w-full overflow-hidden">
                  <h3 className="text-2xl font-bold flex items-center gap-3 break-words"><Terminal className="text-accent shrink-0" /> Server Pipeline</h3>
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
await app.listen({ port: 4000 });`} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Pagination Component - Renders directly inside main but outside the AnimatePresence tabs so it stays visible */}
          <div className="mt-16 pt-8 pb-12 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4 w-full" key="pagination-controls">
            {prevTab ? (
              <button
                onClick={() => { setActiveTab(prevTab?.id ?? ""); window.scrollTo({ top: 0, behavior: 'smooth' }) } }
                className="w-full sm:w-1/2 p-6 border border-surface-border bg-surface-card hover:border-accent hover:bg-accent/5 transition-all text-left flex flex-col group min-w-0"
              >
                <span className="text-[10px] text-muted-subtle mb-2 uppercase tracking-widest flex items-center gap-2 font-bold"><ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Previous Chapter</span>
                <span className="font-bold text-foreground text-lg truncate w-full">{prevTab?.label}</span>
                <span className="text-muted text-sm mt-1 truncate w-full">{prevTab?.desc}</span>
              </button>
            ) : <div className="hidden sm:block sm:w-1/2" />}

            {nextTab ? (
              <button
                onClick={() => { setActiveTab(nextTab?.id ?? ""); window.scrollTo({ top: 0, behavior: 'smooth' }) } }
                className="w-full sm:w-1/2 p-6 border border-surface-border bg-surface-card hover:border-accent hover:bg-accent/5 transition-all text-right flex flex-col items-end group min-w-0"
              >
                <span className="text-[10px] text-muted-subtle mb-2 uppercase tracking-widest flex items-center gap-2 font-bold">Next Chapter <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></span>
                <span className="font-bold text-foreground text-lg truncate w-full">{nextTab?.label}</span>
                <span className="text-muted text-sm mt-1 truncate w-full">{nextTab?.desc}</span>
              </button>
            ) : <div className="hidden sm:block sm:w-1/2" />}
          </div>

        </AnimatePresence>
      </main>
    </div>
 </div>
 ) 
}
