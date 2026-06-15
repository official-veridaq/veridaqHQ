/*
  Warnings:

  - Added the required column `institutionKeyEncrypted` to the `institutions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institutionKeyIv` to the `institutions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institutionKeyTag` to the `institutions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpires" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "claim_definitions" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "employers" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpires" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "institutions" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivationReason" TEXT,
ADD COLUMN     "institutionKeyEncrypted" TEXT NOT NULL,
ADD COLUMN     "institutionKeyIv" TEXT NOT NULL,
ADD COLUMN     "institutionKeyTag" TEXT NOT NULL,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpires" TIMESTAMP(3);
