"use client"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "@/components/ui/app-header"
import { ParallaxBg } from "@/components/parallax/parallax-layer"
import { FloatingShapes } from "@/components/parallax/floating-shapes"

export default function PrivacyPolicyPage() {
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
          <span className="text-accent uppercase">Privacy Policy</span>
        </div>

        <h1 className="mb-6 text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
          Privacy Policy
        </h1>

        <p className="border-surface-border mb-12 border-b pb-6 font-mono text-sm text-muted-subtle">
          EFFECTIVE_DATE: 2026-03-23 | VERSION_REF: VERIDAQ_PRIV_V1.0
        </p>

        <div className="prose prose-invert prose-headings:text-foreground max-w-none space-y-10 text-sm leading-relaxed md:text-base">
          <section>
            <h2 className="mb-4 text-lg font-bold uppercase tracking-widest text-foreground">
              Core Promise: Absolute Zero-Knowledge
            </h2>
            <p>
              Veridaq is built on an architectural guarantee of privacy.{" "}
              <strong>
                We do not, and inherently cannot, leak student personally identifiable information
                (PII) on the public blockchain.
              </strong>{" "}
              All records are synthesized into non-reversible, cryptographic Poseidon hashes prior
              to execution on Base Sepolia.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold uppercase tracking-widest text-foreground">
              What We Collect
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Institution Data:</strong> Organizational name,
                administrator email, hashed operational passwords, and your public ETH wallet
                address.
              </li>
              <li>
                <strong className="text-foreground">Employer Data:</strong> Organization name,
                verification history bounds (hash assertions matching query counts).
              </li>
              <li>
                <strong className="text-foreground">Student Data (Never On-Chain):</strong> The backend
                relays temporary payload matrices (CGPA, Course, Matrix No.) in strictly isolated
                memory for mere milliseconds to compute Groth16 SnarkJS FullProve buffers. We
                systematically drop and erase these inputs from application state immediately after
                the proof stream returns.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold uppercase tracking-widest text-foreground">
              How Data is Commited to Chain
            </h2>
            <p>
              Instead of saving strings like "John Doe, Grade: A", the Registrar Node invokes a hash
              circuit, taking variables with random blinding factors. A resulting fixed string
              (e.g., <code>0x4f8c9b...</code>) is recorded in our `CredentialRegistry.sol`. Because
              it implies a one-way permutation, reverse engineering the matrix payload back into
              "John Doe" is computationally impossible without the private blinding factor
              constraints.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold uppercase tracking-widest text-foreground">
              Cookies & Analytics
            </h2>
            <p>
              Veridaq utilizes heavily restricted, HTTP-only secure cookies solely for JWT-based
              session persistence. We deploy zero cross-site trackers. We do not pipe analytics
              metrics to any 3rd party advertising exchanges.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold uppercase tracking-widest text-foreground">
              Retention & Deletion
            </h2>
            <p>
              Registered entities can issue a tear-down request across the support endpoint.
              However, cryptographic hashes submitted via the Paymaster Vault onto the immutable L2
              ledger are permanent, even though they represent unintelligible mathematical dust to
              observers.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
