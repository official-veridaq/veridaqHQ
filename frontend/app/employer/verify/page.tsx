"use client"
import { EmployerLayout } from "@/components/employer/layout"
import { VerifyButton } from "@/components/employer/verify-button"

export default function VerifyPage() {
  return (
    <EmployerLayout title="Verify a Credential">
      <div className="max-w-lg">
        <p className="text-muted mb-6 text-sm leading-relaxed">
          Enter the institution, the candidate&apos;s matriculation number, and select the academic
          claim you want to verify. The system will generate a Zero-Knowledge Proof and return a
          VERIFIED or CLAIM NOT SATISFIED result.
        </p>
        <div className="card card-3d shimmer-sweep">
          <VerifyButton onComplete={() => {}} />
        </div>
      </div>
    </EmployerLayout>
  )
}
