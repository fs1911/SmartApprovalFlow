-- AlterEnum
ALTER TYPE "ApprovalCaseStatus" ADD VALUE 'PARTIALLY_APPROVED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'CASE_PARTIALLY_APPROVED';
ALTER TYPE "AuditEventType" ADD VALUE 'CASE_ITEM_DECIDED';
ALTER TYPE "AuditEventType" ADD VALUE 'CASE_ATTACHMENT_ADDED';

-- AlterTable
ALTER TABLE "approval_decisions" ADD COLUMN     "approvalItemId" TEXT;

-- AlterTable
ALTER TABLE "approval_items" ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decision" "CustomerDecision";

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "uploadedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "approval_decisions_approvalItemId_idx" ON "approval_decisions"("approvalItemId");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storageKey_key" ON "attachments"("storageKey");

-- AddForeignKey
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_approvalItemId_fkey" FOREIGN KEY ("approvalItemId") REFERENCES "approval_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

