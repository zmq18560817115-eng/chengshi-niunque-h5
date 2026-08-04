-- CreateEnum
CREATE TYPE "public"."AssetOpenMode" AS ENUM ('SAME_TAB', 'NEW_TAB');

-- AlterTable
ALTER TABLE "public"."ReportAsset" ADD COLUMN     "openMode" "public"."AssetOpenMode" NOT NULL DEFAULT 'SAME_TAB';

-- CreateTable
CREATE TABLE "public"."AdminSession" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tokenDigest" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminLoginAttempt" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "identifierHash" TEXT NOT NULL,
    "ipHash" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenDigest_key" ON "public"."AdminSession"("tokenDigest");

-- CreateIndex
CREATE INDEX "AdminSession_adminId_revokedAt_expiresAt_idx" ON "public"."AdminSession"("adminId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "AdminLoginAttempt_identifierHash_success_createdAt_idx" ON "public"."AdminLoginAttempt"("identifierHash", "success", "createdAt");

-- CreateIndex
CREATE INDEX "AdminLoginAttempt_ipHash_success_createdAt_idx" ON "public"."AdminLoginAttempt"("ipHash", "success", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."AdminSession" ADD CONSTRAINT "AdminSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminLoginAttempt" ADD CONSTRAINT "AdminLoginAttempt_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
