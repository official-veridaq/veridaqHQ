"use client"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "@/components/ui/app-header"
import { ParallaxBg } from "@/components/parallax/parallax-layer"
import { FloatingShapes } from "@/components/parallax/floating-shapes"

export default function ZKPDefinitionsPage() {
  return (
    <div className="min-h-screen bg-void pb-16 text-muted">
      <AppHeader />
      <ParallaxBg opacity={0.25} />
      <FloatingShapes count={10} />
      <div className="container mx-auto max-w-4xl px-4 md:px-6 pt-24">
        <div className="mb-8 flex items-center gap-2 font-mono text-sm text-muted-subtle">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-accent uppercase">ZKP Circom Definitions</span>
        </div>

        <h1 className="mb-6 text-3xl font-black uppercase tracking-tight text-foreground md:text-5xl">
          ZKP Circom Definitions
        </h1>

        <p className="border-surface-border mb-12 border-b pb-6 font-mono text-sm text-muted-subtle">
          ENGINE_V2: GROTH16 | HASH_ALG: POSEIDON (CIRCOMLIB)
        </p>

        <div className="prose prose-invert prose-headings:text-foreground max-w-none space-y-10 text-sm leading-relaxed md:text-base">
          <section>
            <h2 className="mb-4 text-xl font-bold uppercase tracking-widest text-foreground">
              Architecture of the Veridaq Circuit
            </h2>
            <p>
              Veridaq relies on Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge
              (zk-SNARKs), specifically the <strong>Groth16</strong> proof system. The logic
              establishing truth claims—without revealing underlying data—is written using the{" "}
              <strong>Circom 2.0.8</strong> language.
            </p>
            <p className="mt-4">
              Our <code>credential.circom</code> file receives private inputs describing a student's
              precise credential status and public inputs framing a claim made by an employer. It
              outputs a boolean confirmation confirming if the claim matches the original commitment
              registered on the blockchain.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold uppercase tracking-widest text-foreground">
              The Hash Commitment (Poseidon)
            </h2>
            <p>
              Instead of placing records in cleartext, the institution backend submits a single
              Poseidon hash. It is generated via cryptographic permutations ensuring absolute
              collision resistance.
            </p>
            <pre className="border-surface-border overflow-x-auto rounded-lg border bg-surface-card p-4 font-mono text-xs text-accent">
              {`Commitment = Poseidon(
  nameHash, 
  matricHash, 
  cgpa, 
  classification, 
  courseHash, 
  graduationYear, 
  blindingFactor
);`}
            </pre>
            <p className="mt-4">
              Because <code>blindingFactor</code> is a massive random scalar injected at the point
              of origin, an attacker knowing a student's name and CGPA still cannot brute-force
              string matches against the on-chain registry.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold uppercase tracking-widest text-foreground">
              Private vs Public Signals
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="border-surface-border rounded border bg-surface-card p-6 text-sm">
                <h3 className="mb-2 font-bold uppercase tracking-wide text-foreground">
                  Private Inputs
                </h3>
                <ul className="list-disc space-y-1 pl-4 text-muted">
                  <li>
                    <code>nameHash</code>
                  </li>
                  <li>
                    <code>matricHash</code>
                  </li>
                  <li>
                    <code>cgpa</code> (integer representing CGPA &times; 100)
                  </li>
                  <li>
                    <code>classification</code> (Enum 1-4)
                  </li>
                  <li>
                    <code>courseHash</code>
                  </li>
                  <li>
                    <code>graduationYear</code>
                  </li>
                  <li>
                    <code>blindingFactor</code>
                  </li>
                  <li>
                    <code>institutionKey</code>
                  </li>
                </ul>
              </div>
              <div className="border-surface-border rounded border bg-surface-card p-6 text-sm">
                <h3 className="mb-2 font-bold uppercase tracking-wide text-foreground">Public Inputs</h3>
                <ul className="list-disc space-y-1 pl-4 text-muted">
                  <li>
                    <code>commitment</code> (The on-chain string pointer)
                  </li>
                  <li>
                    <code>nullifier</code> (Poseidon(matricHash, instKey))
                  </li>
                  <li>
                    <code>claimType</code> (The query logic constant 1-6)
                  </li>
                  <li>
                    <code>threshold</code> (E.g., 3.50 minimum CGPA parameter)
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold uppercase tracking-widest text-foreground">
              The Claim Constraint System
            </h2>
            <p>
              When a proof is evaluated on the Employer node via SnarkJS 0.7, the Circom code builds
              polynomials strictly tying the <code>cgpa</code> private input to the{" "}
              <code>threshold</code> public input. If the mathematics verify that{" "}
              <code>cgpa &gt;= threshold</code>, the generated byte stream will pass the{" "}
              <code>verifyProof()</code> method inside the deployed <code>ZKVerifier.sol</code>{" "}
              contract on Base Sepolia.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
