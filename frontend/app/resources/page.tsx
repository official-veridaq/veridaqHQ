"use client"
import { BookOpen, ChevronRight, CodeSquare, Database, Github, Layers } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "@/components/ui/app-header"
import { ParallaxBg } from "@/components/parallax/parallax-layer"
import { FloatingShapes } from "@/components/parallax/floating-shapes"

export default function TechnicalResourcesPage() {
  const stacks = [
    {
      category: "Blockchain Layer",
      tech: "Stellar Soroban",
      desc: "An EVM-equivalent Layer-2 network by Coinbase prioritizing extreme scale, low latency, and deterministic cryptography execution overhead.",
    },
    {
      category: "Smart Contracts",
      tech: "Rust & Soroban SDK",
      desc: "Type-safe Soroban smart contracts with comprehensive unit testing and audit-ready architecture.",
    },
    {
      category: "ZKP Compilation",
      tech: "Circom 2.0.8 & SnarkJS",
      desc: "Robust domain-specific circuits synthesizing student data metrics into untraceable zk-SNARK Groth16 mathematical footprints.",
    },
    {
      category: "Backend Engine",
      tech: "Fastify 5 & Node.js 22",
      desc: "High-throughput TypeScript API relay processing BullMQ queue tasks against a centralized PostgreSQL 16 state.",
    },
  ]

  return (
    <div className="bg-void text-muted min-h-screen pb-16">
      <AppHeader />
      <ParallaxBg opacity={0.25} />
      <FloatingShapes count={10} />
      <div className="container mx-auto max-w-5xl px-4 pt-24 md:px-6">
        <div className="text-muted-subtle mb-8 flex items-center gap-2 font-mono text-sm">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-accent uppercase">Technical Resources</span>
        </div>

        <h1 className="text-foreground mb-6 text-3xl font-black uppercase tracking-tight md:text-5xl">
          Technical Resources
        </h1>

        <p className="border-surface-border text-muted-subtle mb-12 max-w-2xl border-b pb-6 font-mono text-sm">
          Veridaq is built completely open-core on bleeding-edge modern web protocols. Access
          architecture whitepapers, circuit repositories, and external scanners below.
        </p>

        {/* Links Grid */}
        <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link
            href="/blueprint"
            className="border-surface-border bg-surface-card hover:border-accent/50 group flex items-start gap-4 rounded-lg border p-6 transition-colors"
          >
            <div className="bg-void border-surface-border group-hover:bg-accent/10 rounded border p-3 transition-colors">
              <Layers className="group-hover:text-accent text-foreground h-6 w-6" />
            </div>
            <div>
              <h3 className="group-hover:text-accent text-foreground mb-1 font-bold transition-colors">
                Protocol Blueprint
              </h3>
              <p className="text-sm">
                Comprehensive architectural reference — smart contracts, circuits, API topology,
                proof lifecycle, and security model.
              </p>
            </div>
          </Link>

          <Link
            href="/docs"
            className="border-surface-border bg-surface-card hover:border-accent/50 group flex items-start gap-4 rounded-lg border p-6 transition-colors"
          >
            <div className="bg-void border-surface-border group-hover:bg-accent/10 rounded border p-3 transition-colors">
              <BookOpen className="group-hover:text-accent text-foreground h-6 w-6" />
            </div>
            <div>
              <h3 className="group-hover:text-accent text-foreground mb-1 font-bold transition-colors">
                Official Documentation
              </h3>
              <p className="text-sm">
                Read the step-by-step setup guides, protocol outlines, API routes, and deployment
                instructions.
              </p>
            </div>
          </Link>

          <Link
            href="/zkp"
            className="border-surface-border bg-surface-card hover:border-accent/50 group flex items-start gap-4 rounded-lg border p-6 transition-colors"
          >
            <div className="bg-void border-surface-border group-hover:bg-accent/10 rounded border p-3 transition-colors">
              <Layers className="group-hover:text-accent text-foreground h-6 w-6" />
            </div>
            <div>
              <h3 className="group-hover:text-accent text-foreground mb-1 font-bold transition-colors">
                ZKP Circom Definitions
              </h3>
              <p className="text-sm">
                Deep-dive into the cryptographic commitments, Groth16 SnarkJS logic, private vs
                public signals, and nullifiers.
              </p>
            </div>
          </Link>

          <a
            href="#"
            className="border-surface-border bg-surface-card hover:border-accent/50 group flex cursor-not-allowed items-start gap-4 rounded-lg border p-6 opacity-70 transition-colors"
          >
            <div className="bg-void border-surface-border rounded border p-3">
              <Github className="text-foreground h-6 w-6" />
            </div>
            <div>
              <h3 className="text-foreground mb-1 flex items-center gap-2 font-bold">
                GitHub Contracts Repo{" "}
                <span className="bg-surface-border text-foreground rounded px-2 py-0.5 font-mono text-[10px]">
                  COMING SOON
                </span>
              </h3>
              <p className="text-sm">
                The Soroban-based smart contract repository covering Credential Registries, and
                Paymaster Vaults.
              </p>
            </div>
          </a>

          <a
            href="https://stellar.expert/explorer/testnet"
            target="_blank"
            rel="noreferrer"
            className="border-surface-border bg-surface-card hover:border-accent/50 group flex items-start gap-4 rounded-lg border p-6 transition-colors"
          >
            <div className="bg-void border-surface-border group-hover:bg-accent/10 rounded border p-3 transition-colors">
              <Database className="group-hover:text-accent text-foreground h-6 w-6" />
            </div>
            <div>
              <h3 className="group-hover:text-accent text-foreground mb-1 flex items-center gap-2 font-bold transition-colors">
                Stellar Expert Explorer{" "}
                <span className="bg-surface-border text-foreground rounded px-2 py-0.5 font-mono text-[10px]">
                  EXTERNAL
                </span>
              </h3>
              <p className="text-sm">
                Explore live verifiable zero-knowledge executions and payload histories processed
                onto our testnet nodes.
              </p>
            </div>
          </a>
        </div>

        {/* Stack Overview */}
        <h2 className="border-surface-border text-foreground mb-6 border-t pt-12 text-2xl font-bold uppercase tracking-widest">
          Protocol Stack Architecture
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {stacks.map((stack, i) => (
            <div key={i} className="border-surface-border bg-surface-card rounded border p-5">
              <div className="mb-2 flex items-center gap-2">
                <CodeSquare className="text-accent h-4 w-4" />
                <span className="text-muted-subtle font-mono text-xs">{stack.category}</span>
              </div>
              <h3 className="text-foreground mb-2 text-lg font-bold">{stack.tech}</h3>
              <p className="text-muted text-sm leading-relaxed">{stack.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
