-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CRYPTO', 'FIAT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('INSTITUTION_UPGRADE', 'INSTITUTION_FUNDING', 'EMPLOYER_TOPUP');

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "method" "PaymentMethod",
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountWei" TEXT NOT NULL DEFAULT '0',
    "amountFiat" TEXT,
    "fiatCurrency" TEXT,
    "fiatProvider" TEXT,
    "fiatSessionId" TEXT,
    "txHash" TEXT,
    "payerId" TEXT NOT NULL,
    "payerRole" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_referenceId_key" ON "payments"("referenceId");
