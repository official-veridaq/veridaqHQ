"use client"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "@/components/ui/app-header"
import { ParallaxBg } from "@/components/parallax/parallax-layer"
import { FloatingShapes } from "@/components/parallax/floating-shapes"

export default function TermsOfServicePage() {
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
          <span className="text-accent uppercase">Terms of Service</span>
        </div>

        <h1 className="mb-6 text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl">
          Terms of Service
        </h1>

        <p className="border-surface-border mb-12 border-b pb-6 font-mono text-sm text-muted-subtle">
          EFFECTIVE_DATE: 2026-03-23 | VERSION_REF: VERIDAQ_TOS_V1.0
        </p>

        <div className="prose prose-invert prose-headings:text-foreground max-w-none space-y-10 text-sm leading-relaxed md:text-base">
          <section>
            <h2 className="mb-4 text-lg font-bold uppercase tracking-widest text-foreground">
              1. Acceptance of Protocol Terms
            </h2>
            <p>
              By accessing the Veridaq platform ("Protocol"), which includes the Institution
              (Registrar) Node, Employer (Verifier) Node, and the underlying Base Sepolia smart
              contracts, you agree to be bound by these Terms of Service. If you do not agree to all
              terms, do not interact with the Protocol's interfaces.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold uppercase tracking-widest text-foreground">
              2. Zero-Knowledge Cryptography Acknowledgment
            </h2>
            <p>
              The Protocol utilizes Groth16 Zero-Knowledge Proofs (ZKPs) and Poseidon hash
              commitments. By establishing credentials or requesting verification, you acknowledge
              that mathematical guarantees verify the truth without relying on human intermediaries.
              Veridaq Foundation provides the cryptographic rails but assumes no liability for the
              input parameters mathematically committed to the chain by Registration nodes.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold uppercase tracking-widest text-foreground">
              3. Data Non-Reversibility
            </h2>
            <p>
              When a Registrar node commits a batch of student records to the Base network, it is
              strictly appending a Poseidon hash. Veridaq Foundation cannot reverse, alter, or
              directly decode these on-chain bytes. Institutions are solely responsible for ensuring
              the accuracy of the credential attributes prior to hashing and signature generation.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold uppercase tracking-widest text-foreground">
              4. Institution & Verifier Obligations
            </h2>
            <p className="mb-2">
              <strong>Institution Nodes:</strong> Must only upload truthful representations of
              academic records mapping to genuine students. Abuse of the Paymaster system will
              result in immediate slashes to your tier privileges.
            </p>
            <p>
              <strong>Verifier Nodes:</strong> By submitting verification claims, you agree to
              secure the matriculation indices entrusted to you by applicants. Do not use automated
              scraping scripts against the verification endpoints.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold uppercase tracking-widest text-foreground">
              5. Disclaimer of Warranties
            </h2>
            <p className="text-xs uppercase leading-loose opacity-70">
              The protocol is provided "as is", without warranty of any kind, express or implied,
              including but not limited to the warranties of merchantability, fitness for a
              particular purpose and noninfringement. In no event shall the authors or copyright
              holders be liable for any claim, damages or other liability, whether in an action of
              contract, tort or otherwise, arising from, out of or in connection with the protocol
              or the use or other dealings in the protocol.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
