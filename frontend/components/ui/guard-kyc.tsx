"use client"

import { useAuth } from "@/lib/auth"
import { ReactNode } from "react"

export function GuardKyc({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  // Admins bypass KYC
  if (user?.role === "ADMIN") return <>{children}</>

  if (user && user.kycApproved === false) {
    return (
      <div className="animate-fade-in flex min-h-[60vh] items-center justify-center px-4">
        <div className="bg-surface-card border-surface-border w-full max-w-md rounded-xl border p-8 text-center shadow-lg">
          <div className="mb-6 flex justify-center">
            <div className="bg-accent/10 border-accent/20 text-accent flex h-16 w-16 items-center justify-center rounded-full border">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Verification Pending</h2>
          <p className="text-muted mb-6 text-sm">
            Your {user.role.toLowerCase()} account has been registered successfully but is currently
            undergoing KYC review by the platform administrator. You will receive an email once
            approved.
          </p>
          <div className="border-surface-border flex w-full items-center justify-center space-x-2 rounded border bg-surface-card py-3 text-xs opacity-70">
            <span className="relative flex h-2 w-2">
              <span className="bg-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
              <span className="bg-accent relative inline-flex h-2 w-2 rounded-full"></span>
            </span>
            <span>Polling status...</span>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
