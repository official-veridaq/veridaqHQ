-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'INSTITUTION', 'EMPLOYER');

-- CreateEnum
CREATE TYPE "InstitutionTier" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'AWAITING_INSTITUTION', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "VerificationResult" AS ENUM ('VERIFIED', 'CLAIM_NOT_SATISFIED', 'CREDENTIAL_REVOKED', 'RECORD_NOT_FOUND');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "onChainId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "adminWallet" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tier" "InstitutionTier" NOT NULL DEFAULT 'FREE',
    "kycApproved" BOOLEAN NOT NULL DEFAULT false,
    "paymasterBalance" TEXT NOT NULL DEFAULT '0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cacNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "kycApproved" BOOLEAN NOT NULL DEFAULT false,
    "freeVerificationsRemaining" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "txRef" TEXT,
    "studentCount" INTEGER NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "degreeTypeCode" INTEGER NOT NULL DEFAULT 1,
    "errorReport" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "nullifier" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "encryptedIv" TEXT NOT NULL,
    "encryptedTag" TEXT NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_definitions" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "claimCode" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL DEFAULT 0,
    "reviewType" "ReviewType" NOT NULL DEFAULT 'AUTO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claim_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "credentialId" TEXT,
    "matricNumber" TEXT NOT NULL,
    "claimType" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL DEFAULT 0,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "result" "VerificationResult",
    "proofJson" TEXT,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "employerId" TEXT,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_onChainId_key" ON "institutions"("onChainId");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_email_key" ON "institutions"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employers_cacNumber_key" ON "employers"("cacNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employers_email_key" ON "employers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employers_walletAddress_key" ON "employers"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "batches_txRef_key" ON "batches"("txRef");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_commitment_key" ON "credentials"("commitment");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_nullifier_key" ON "credentials"("nullifier");

-- CreateIndex
CREATE UNIQUE INDEX "claim_definitions_institutionId_claimCode_threshold_key" ON "claim_definitions"("institutionId", "claimCode", "threshold");

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_definitions" ADD CONSTRAINT "claim_definitions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "employers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
