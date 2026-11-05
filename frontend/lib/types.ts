/**
 * Shared TypeScript types for the VERIDAQ frontend.
 * These match the JSON shapes returned by the backend API and the Prisma schema.
 *
 * IMPORTANT: Keep these in sync with:
 *   - backend/prisma/schema.prisma  (enum values)
 *   - backend/src/routes/*.ts       (response shapes)
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export type Role = "INSTITUTION" | "EMPLOYER" | "ADMIN"

export type AuthUser = {
  id: string
  email: string
  name: string
  role: Role
}

// ─── Institution ─────────────────────────────────────────────────────────────

export type Institution = {
  id: string
  name: string
  email: string
  tier: "FREE" | "PAID"
  kycApproved: boolean
  active: boolean
  onChainId: string | null
  adminWallet: string | null
  createdAt: string
}

// Matches Prisma BatchStatus enum: PENDING | PROCESSING | CONFIRMED | FAILED
export type BatchStatus = "PENDING" | "PROCESSING" | "CONFIRMED" | "FAILED"

export type Batch = {
  id: string
  institutionId: string
  status: BatchStatus
  txHash: string | null
  studentCount: number
  graduationYear: number
  errorReport: unknown | null
  createdAt: string
  confirmedAt: string | null
}

// Matches Prisma ClaimDefinition model field names
export type ClaimDefinition = {
  id: string
  label: string
  description: string | null
  claimCode: number
  threshold: number
  reviewType: "AUTO" | "MANUAL"
  active: boolean
  createdAt: string
}

// ─── Employer ────────────────────────────────────────────────────────────────

export type Employer = {
  id: string
  name: string
  email: string
  cacNumber: string
  walletAddress: string
  kycApproved: boolean
  active: boolean
  freeVerificationsRemaining: number
  createdAt: string
}

// ─── Verification ────────────────────────────────────────────────────────────

// Matches Prisma VerificationStatus enum exactly
export type VerificationStatus =
  | "PENDING"
  | "AWAITING_INSTITUTION"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"

// Matches Prisma VerificationResult enum exactly
export type VerificationResult =
  | "VERIFIED"
  | "CLAIM_NOT_SATISFIED"
  | "CREDENTIAL_REVOKED"
  | "RECORD_NOT_FOUND"

export type VerificationRequest = {
  id: string
  employerId: string
  institutionId: string
  matricNumber: string
  claimType: number
  threshold: number
  status: VerificationStatus
  result: VerificationResult | null
  txHash: string | null
  createdAt: string
  completedAt: string | null
  institution: { name: string; onChainId?: string | null } | null
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export type AdminStats = {
  institutions: number
  employers: number
  confirmedBatches: number
  successfulVerifications: number
  totalCredentials: number
  revokedCredentials: number
  activeInstitutionNames: string[]
  paymasterBalance: string
  adminWalletBalance: string
}

// ─── API response wrappers ───────────────────────────────────────────────────

export type ApiResponse<T> = {
  data: T
  message: string
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  limit: number
}

// ─── Form types ──────────────────────────────────────────────────────────────

export type LoginForm = {
  email: string
  password: string
}

export type VerifyForm = {
  institutionOnChainId: string
  matricNumber: string
  claimType: number
  threshold: number
}
