-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CASE_APPROVED', 'CASE_PARTIALLY_APPROVED', 'CASE_DECLINED', 'CASE_CALLBACK', 'CASE_EXPIRED', 'CASE_ASSIGNED', 'CASE_NOTE_ADDED');

-- AlterTable
ALTER TABLE "approval_cases" ADD COLUMN     "assigneeUserId" TEXT;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "approvalCaseId" TEXT,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "approvalCaseId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "case_notes_approvalCaseId_createdAt_idx" ON "case_notes"("approvalCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "approval_cases_tenantId_assigneeUserId_idx" ON "approval_cases"("tenantId", "assigneeUserId");

-- AddForeignKey
ALTER TABLE "approval_cases" ADD CONSTRAINT "approval_cases_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_approvalCaseId_fkey" FOREIGN KEY ("approvalCaseId") REFERENCES "approval_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_approvalCaseId_fkey" FOREIGN KEY ("approvalCaseId") REFERENCES "approval_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

